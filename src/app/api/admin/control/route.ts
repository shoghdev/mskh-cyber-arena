import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scores, stages, submissions, tasks, tournaments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  getActiveTournament,
  getTaskBundle,
  getTournamentState,
  logAction,
  publishTaskScores,
  unpublishTaskScores,
  updateState,
} from "@/lib/state";

const VALID_SCREENS = new Set([
  "lobby",
  "task_intro",
  "task_live",
  "time_up",
  "submissions_closed",
  "judging",
  "leaderboard",
  "break",
  "winners",
]);

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const actor = session.user.name;

  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    switch (action) {
      case "set_tournament_status": {
        const status = String(body.status);
        if (!["draft", "ready", "live", "paused", "finished"].includes(status)) {
          return NextResponse.json({ error: "Անվավեր կարգավիճակ" }, { status: 400 });
        }
        const tournament = await getActiveTournament();
        if (!tournament) return NextResponse.json({ error: "Մրցույթ չկա" }, { status: 404 });
        await db.update(tournaments).set({ status }).where(eq(tournaments.id, tournament.id));
        await logAction(actor, "tournament_status", `Կարգավիճակը՝ ${status}`);
        return NextResponse.json({ ok: true });
      }

      case "set_tournament_info": {
        const tournament = await getActiveTournament();
        if (!tournament) return NextResponse.json({ error: "Մրցույթ չկա" }, { status: 404 });
        await db
          .update(tournaments)
          .set({
            name: String(body.name ?? tournament.name).slice(0, 200),
            description: String(body.description ?? tournament.description).slice(0, 2000),
            date: String(body.date ?? tournament.date).slice(0, 40),
          })
          .where(eq(tournaments.id, tournament.id));
        await logAction(actor, "tournament_info", "Թարմացվեց մրցույթի տեղեկատվությունը");
        return NextResponse.json({ ok: true });
      }

      case "set_scoring_method": {
        const method = body.method === "average" ? "average" : "average";
        const tournament = await getActiveTournament();
        if (tournament) {
          await db.update(tournaments).set({ scoringMethod: method }).where(eq(tournaments.id, tournament.id));
        }
        await logAction(actor, "scoring_method", method);
        return NextResponse.json({ ok: true });
      }

      case "set_screen": {
        const mode = String(body.mode);
        if (!VALID_SCREENS.has(mode)) {
          return NextResponse.json({ error: "Անվավեր էկրան" }, { status: 400 });
        }
        await updateState({ screenMode: mode });
        await logAction(actor, "screen", `Էկրան՝ ${mode}`);
        return NextResponse.json({ ok: true });
      }

      case "activate_task": {
        const taskId = Number(body.taskId);
        const bundle = await getTaskBundle(taskId);
        if (!bundle) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });
        await updateState({
          activeTaskId: bundle.task.id,
          activeStageId: bundle.task.stageId,
          screenMode: "task_intro",
          timerState: "idle",
          timerDurationSec: bundle.task.durationSec,
          timerRemainingMs: bundle.task.durationSec * 1000,
          timerEndsAt: null,
          submissionsOpen: false,
        });
        await db.update(tasks).set({ status: "ready" }).where(eq(tasks.id, taskId));
        await logAction(actor, "activate_task", `«${bundle.task.title}»`);
        return NextResponse.json({ ok: true });
      }

      case "start_timer": {
        const state = await getTournamentState();
        if (!state.activeTaskId) {
          return NextResponse.json({ error: "Նախ ընտրեք առաջադրանքը" }, { status: 400 });
        }
        const remaining = state.timerRemainingMs > 0 ? state.timerRemainingMs : state.timerDurationSec * 1000;
        await updateState({
          timerState: "running",
          timerEndsAt: new Date(Date.now() + remaining),
          timerRemainingMs: remaining,
          submissionsOpen: true,
          screenMode: "task_live",
        });
        await db.update(tasks).set({ status: "active" }).where(eq(tasks.id, state.activeTaskId));
        if (state.activeStageId) {
          await db.update(stages).set({ status: "active" }).where(eq(stages.id, state.activeStageId));
        }
        const tournament = await getActiveTournament();
        if (tournament && tournament.status !== "finished") {
          await db.update(tournaments).set({ status: "live" }).where(eq(tournaments.id, tournament.id));
        }
        await logAction(actor, "timer_start", `${Math.round(remaining / 1000)} վայրկյան`);
        return NextResponse.json({ ok: true });
      }

      case "pause_timer": {
        const state = await getTournamentState();
        if (state.timerState !== "running" || !state.timerEndsAt) {
          return NextResponse.json({ error: "Ժամաչափը չի աշխատում" }, { status: 400 });
        }
        const remaining = Math.max(0, state.timerEndsAt.getTime() - Date.now());
        await updateState({ timerState: "paused", timerRemainingMs: remaining, timerEndsAt: null });
        await logAction(actor, "timer_pause", `Մնաց ${Math.round(remaining / 1000)} վ`);
        return NextResponse.json({ ok: true });
      }

      case "resume_timer": {
        const state = await getTournamentState();
        if (state.timerState !== "paused") {
          return NextResponse.json({ error: "Ժամաչափը դադարեցված չէ" }, { status: 400 });
        }
        await updateState({
          timerState: "running",
          timerEndsAt: new Date(Date.now() + state.timerRemainingMs),
        });
        await logAction(actor, "timer_resume");
        return NextResponse.json({ ok: true });
      }

      case "add_time": {
        const seconds = Math.max(-600, Math.min(3600, Number(body.seconds) || 0));
        if (!seconds) return NextResponse.json({ error: "Անվավեր արժեք" }, { status: 400 });
        const state = await getTournamentState();
        if (state.timerState === "running" && state.timerEndsAt) {
          await updateState({
            timerEndsAt: new Date(state.timerEndsAt.getTime() + seconds * 1000),
            timerDurationSec: state.timerDurationSec + seconds,
          });
        } else {
          await updateState({
            timerRemainingMs: Math.max(0, state.timerRemainingMs + seconds * 1000),
            timerDurationSec: state.timerDurationSec + seconds,
          });
        }
        await logAction(actor, "timer_add", `${seconds > 0 ? "+" : ""}${seconds} վ`);
        return NextResponse.json({ ok: true });
      }

      case "reset_timer": {
        const state = await getTournamentState();
        await updateState({
          timerState: "idle",
          timerRemainingMs: state.timerDurationSec * 1000,
          timerEndsAt: null,
        });
        await logAction(actor, "timer_reset");
        return NextResponse.json({ ok: true });
      }

      case "end_task": {
        await updateState({
          timerState: "finished",
          timerRemainingMs: 0,
          timerEndsAt: null,
          submissionsOpen: false,
          screenMode: "time_up",
        });
        await logAction(actor, "end_task");
        return NextResponse.json({ ok: true });
      }

      case "close_submissions": {
        await updateState({ submissionsOpen: false, screenMode: "submissions_closed" });
        await logAction(actor, "close_submissions");
        return NextResponse.json({ ok: true });
      }

      case "open_submissions": {
        await updateState({ submissionsOpen: true });
        await logAction(actor, "open_submissions");
        return NextResponse.json({ ok: true });
      }

      case "set_judging": {
        const state = await getTournamentState();
        if (state.activeTaskId) {
          await db.update(tasks).set({ status: "closed" }).where(eq(tasks.id, state.activeTaskId));
        }
        await updateState({ submissionsOpen: false, screenMode: "judging" });
        await logAction(actor, "judging");
        return NextResponse.json({ ok: true });
      }

      case "publish_task_scores": {
        const taskId = Number(body.taskId ?? (await getTournamentState()).activeTaskId);
        if (!taskId) return NextResponse.json({ error: "Ընտրեք առաջադրանքը" }, { status: 400 });
        await publishTaskScores(taskId);
        const bundle = await getTaskBundle(taskId);
        await updateState({ screenMode: "leaderboard" });
        await logAction(actor, "publish_scores", bundle ? `«${bundle.task.title}»` : `#${taskId}`);
        return NextResponse.json({ ok: true });
      }

      case "unpublish_task_scores": {
        const taskId = Number(body.taskId);
        if (!taskId) return NextResponse.json({ error: "Ընտրեք առաջադրանքը" }, { status: 400 });
        await unpublishTaskScores(taskId);
        await logAction(actor, "unpublish_scores", `#${taskId}`);
        return NextResponse.json({ ok: true });
      }

      case "set_score": {
        const taskId = Number(body.taskId);
        const teamId = Number(body.teamId);
        const value = Math.max(0, Math.round(Number(body.score) || 0));
        const reason = String(body.reason ?? "").slice(0, 500);
        const bundle = await getTaskBundle(taskId);
        if (!bundle) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });
        const clamped = Math.min(value, bundle.task.maxScore);
        const [existing] = await db
          .select()
          .from(scores)
          .where(and(eq(scores.taskId, taskId), eq(scores.teamId, teamId)))
          .limit(1);
        if (existing) {
          await db
            .update(scores)
            .set({ score: clamped, maxScore: bundle.task.maxScore, publishedAt: new Date() })
            .where(eq(scores.id, existing.id));
        } else {
          await db.insert(scores).values({
            taskId,
            teamId,
            score: clamped,
            maxScore: bundle.task.maxScore,
            published: true,
            publishedAt: new Date(),
          });
        }
        await logAction(actor, "set_score", `թիմ #${teamId}, «${bundle.task.title}» → ${clamped}${reason ? ` (${reason})` : ""}`);
        return NextResponse.json({ ok: true });
      }

      case "reopen_submission": {
        const submissionId = Number(body.submissionId);
        const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
        if (!sub) return NextResponse.json({ error: "Պատասխանը չի գտնվել" }, { status: 404 });
        await db.delete(submissions).where(eq(submissions.id, submissionId));
        await logAction(actor, "reopen_submission", `թիմ #${sub.teamId}, առաջադրանք #${sub.taskId}`);
        return NextResponse.json({ ok: true });
      }

      case "complete_stage": {
        const stageId = Number(body.stageId ?? (await getTournamentState()).activeStageId);
        if (!stageId) return NextResponse.json({ error: "Ընտրեք փուլը" }, { status: 400 });
        await db.update(stages).set({ status: "completed" }).where(eq(stages.id, stageId));
        await logAction(actor, "complete_stage", `#${stageId}`);
        return NextResponse.json({ ok: true });
      }

      case "finish_tournament": {
        const tournament = await getActiveTournament();
        if (tournament) {
          await db.update(tournaments).set({ status: "finished" }).where(eq(tournaments.id, tournament.id));
        }
        await updateState({ screenMode: "winners", submissionsOpen: false });
        await logAction(actor, "finish_tournament");
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Անհայտ գործողություն" }, { status: 400 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
