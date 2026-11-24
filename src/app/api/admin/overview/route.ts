import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, submissions, teams, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { computeLeaderboard, getActiveTournament, getFullStructure, getTaskBundle, getTournamentState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });

  const [state, tournament, structure, leaderboard, teamRows, schoolRows, juryRows] =
    await Promise.all([
      getTournamentState(),
      getActiveTournament(),
      getFullStructure(),
      computeLeaderboard(false),
      db.select().from(teams).orderBy(asc(teams.id)),
      db.select().from(schools).orderBy(asc(schools.id)),
      db.select().from(users).where(eq(users.role, "jury")),
    ]);

  const allTasks = structure.stages.flatMap((s) => s.tasks);
  const subRows = allTasks.length
    ? await db.select().from(submissions)
    : [];

  let activeTask = null;
  let activeTaskSubs: number[] = [];
  if (state.activeTaskId) {
    const bundle = await getTaskBundle(state.activeTaskId);
    if (bundle) {
      activeTask = {
        id: bundle.task.id,
        title: bundle.task.title,
        type: bundle.task.type,
        status: bundle.task.status,
        maxScore: bundle.task.maxScore,
        durationSec: bundle.task.durationSec,
        autoGrade: bundle.task.autoGrade,
        answerFormat: bundle.task.answerFormat,
        stageName: structure.stages.find((s) => s.id === bundle.task.stageId)?.name ?? "",
      };
      activeTaskSubs = subRows.filter((s) => s.taskId === bundle.task.id).map((s) => s.teamId);
    }
  }

  return NextResponse.json({
    serverNow: Date.now(),
    tournament,
    state: {
      screenMode: state.screenMode,
      activeTaskId: state.activeTaskId,
      activeStageId: state.activeStageId,
      timerState: state.timerState,
      timerDurationSec: state.timerDurationSec,
      timerEndsAt: state.timerEndsAt?.getTime() ?? null,
      timerRemainingMs: state.timerRemainingMs,
      submissionsOpen: state.submissionsOpen,
    },
    activeTask,
    activeTaskSubs,
    stats: {
      teams: teamRows.length,
      jury: juryRows.filter((j) => j.active).length,
      tasks: allTasks.length,
      stages: structure.stages.length,
      submissions: subRows.length,
    },
    leaderboard: leaderboard.rows.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      school: r.school?.name ?? "",
      schoolColor: r.school?.color ?? "#22d3ee",
      total: r.total,
      rank: r.rank,
    })),
    stageList: structure.stages.map((s) => ({ id: s.id, name: s.name, order: s.order, status: s.status })),
    schools: schoolRows.map((s) => ({ id: s.id, name: s.name, shortCode: s.shortCode, color: s.color })),
  });
}
