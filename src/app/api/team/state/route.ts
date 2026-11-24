import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, scores, submissions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  computeLeaderboard,
  getActiveTournament,
  getFullStructure,
  getTaskBundle,
  getTournamentState,
} from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("team");
  if (!session?.team) {
    return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  }
  const team = session.team;
  const state = await getTournamentState();
  const tournament = await getActiveTournament();
  const structure = await getFullStructure();
  const leaderboard = await computeLeaderboard(true);
  const myRow = leaderboard.rows.find((r) => r.team.id === team.id);

  const [school] = await db.select().from(schools).where(eq(schools.id, team.schoolId)).limit(1);

  let activeTask = null;
  let mySubmission = null;
  let myTaskScore = null;
  if (state.activeTaskId) {
    const bundle = await getTaskBundle(state.activeTaskId);
    if (bundle) {
      const { task, options } = bundle;
      const stage = structure.stages.find((s) => s.id === task.stageId);
      const correctCount = options.filter((o) => o.isCorrect).length;
      activeTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        maxScore: task.maxScore,
        durationSec: task.durationSec,
        mediaUrl: task.mediaUrl,
        answerFormat: task.answerFormat,
        multiSelect: task.answerFormat === "choice" ? correctCount > 1 : false,
        stageName: stage?.name ?? "",
        options: options.map((o) => ({ id: o.id, text: o.text })),
      };
      const [sub] = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.taskId, task.id), eq(submissions.teamId, team.id)))
        .limit(1);
      if (sub) {
        mySubmission = {
          id: sub.id,
          submittedAt: sub.submittedAt.getTime(),
          textAnswer: sub.textAnswer,
          linkUrl: sub.linkUrl,
          selectedOptions: sub.selectedOptions,
          autoScore: task.autoGrade ? sub.autoScore : null,
        };
      }
      const [sc] = await db
        .select()
        .from(scores)
        .where(and(eq(scores.taskId, task.id), eq(scores.teamId, team.id)))
        .limit(1);
      if (sc?.published) myTaskScore = { score: sc.score, maxScore: sc.maxScore };
    }
  }

  // Total tasks in the tournament + how many this team has answered
  const allTasks = structure.stages.flatMap((s) => s.tasks);
  const mySubs = await db.select().from(submissions).where(eq(submissions.teamId, team.id));
  const answeredTaskIds = new Set(mySubs.map((s) => s.taskId));
  const answeredCount = allTasks.filter((t) => answeredTaskIds.has(t.id)).length;

  return NextResponse.json({
    serverNow: Date.now(),
    team: {
      id: team.id,
      name: team.name,
      grade: team.grade,
      members: team.members,
      school: school?.name ?? "",
      schoolColor: school?.color ?? "#22d3ee",
    },
    tournament: tournament
      ? { name: tournament.name, status: tournament.status, description: tournament.description }
      : null,
    screen: state.screenMode,
    timer: {
      state: state.timerState,
      durationSec: state.timerDurationSec,
      endsAt: state.timerEndsAt?.getTime() ?? null,
      remainingMs: state.timerRemainingMs,
    },
    submissionsOpen: state.submissionsOpen,
    activeTask,
    mySubmission,
    myTaskScore,
    stats: {
      total: myRow?.total ?? 0,
      rank: myRow?.rank ?? 0,
      teamCount: leaderboard.rows.length,
      answered: answeredCount,
      taskCount: allTasks.length,
    },
    leaderboard: leaderboard.rows.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      school: r.school?.name ?? "",
      schoolColor: r.school?.color ?? "#22d3ee",
      total: r.total,
      rank: r.rank,
    })),
  });
}
