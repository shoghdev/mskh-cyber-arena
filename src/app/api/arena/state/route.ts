import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, submissions, taskOptions } from "@/db/schema";
import {
  computeLeaderboard,
  getActiveTournament,
  getFullStructure,
  getTaskBundle,
  getTournamentState,
} from "@/lib/state";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getTournamentState();
  const tournament = await getActiveTournament();
  const [schoolRows, leaderboard, structure] = await Promise.all([
    db.select().from(schools).orderBy(asc(schools.id)),
    computeLeaderboard(true),
    getFullStructure(),
  ]);

  let activeTask = null;
  let taskIndex = null;
  let submissionStats = null;
  if (state.activeTaskId) {
    const bundle = await getTaskBundle(state.activeTaskId);
    if (bundle) {
      const { task, options, criteria: crits } = bundle;
      const stage = structure.stages.find((s) => s.id === task.stageId);
      const allTasks = structure.stages.flatMap((s) => s.tasks);
      const idx = allTasks.findIndex((t) => t.id === task.id);
      taskIndex = { current: idx + 1, total: allTasks.length };
      // Public payload: never leak which options are correct.
      activeTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        maxScore: task.maxScore,
        durationSec: task.durationSec,
        mediaUrl: task.mediaUrl,
        answerFormat: task.answerFormat,
        stageName: stage?.name ?? "",
        options: options.map((o) => ({ id: o.id, text: o.text })),
        criteria: crits.map((c) => ({ id: c.id, name: c.name, maxPoints: c.maxPoints })),
      };
      const subs = await db.select().from(submissions).where(eq(submissions.taskId, task.id));
      submissionStats = { submitted: subs.length, total: leaderboard.rows.length };
    }
  }

  return NextResponse.json({
    serverNow: Date.now(),
    tournament: tournament
      ? {
          name: tournament.name,
          description: tournament.description,
          date: tournament.date,
          status: tournament.status,
        }
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
    activeStageId: state.activeStageId,
    taskIndex,
    submissionStats,
    schools: schoolRows.map((s) => ({ id: s.id, name: s.name, color: s.color, shortCode: s.shortCode })),
    leaderboard: leaderboard.rows.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      school: r.school?.name ?? "",
      schoolColor: r.school?.color ?? "#22d3ee",
      grade: r.team.grade,
      total: r.total,
      rank: r.rank,
      perStage: r.perStage,
    })),
    stageList: leaderboard.stageList.map((s) => ({ id: s.id, name: s.name, order: s.order })),
  });
}
