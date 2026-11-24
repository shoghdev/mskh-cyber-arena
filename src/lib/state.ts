import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  criteria,
  evaluations,
  schools,
  scores,
  stages,
  submissions,
  taskOptions,
  tasks,
  teams,
  tournamentState,
  tournaments,
  users,
  type Task,
  type TaskOption,
  type Criterion,
  type Stage,
  type Team,
  type School,
} from "@/db/schema";

/* ------------------------------ Audit logging ------------------------------ */

export async function logAction(actor: string, action: string, details = "") {
  try {
    await db.insert(auditLogs).values({ actor, action, details });
  } catch {
    // never block the main flow on logging
  }
}

/* --------------------------- Tournament state ------------------------------ */

export async function getTournamentState() {
  let [state] = await db.select().from(tournamentState).limit(1);
  if (!state) {
    const [t] = await db.select().from(tournaments).limit(1);
    [state] = await db
      .insert(tournamentState)
      .values({ tournamentId: t?.id ?? null, screenMode: "lobby" })
      .returning();
  }

  // Lazy timer reconciliation: when the timer expires, close submissions and
  // switch the big screen to the "time up" state automatically.
  if (state.timerState === "running" && state.timerEndsAt) {
    const endsAt = state.timerEndsAt.getTime();
    if (Date.now() >= endsAt) {
      const patch: Partial<typeof tournamentState.$inferInsert> = {
        timerState: "finished",
        timerRemainingMs: 0,
        submissionsOpen: false,
        updatedAt: new Date(),
      };
      if (state.screenMode === "task_live") patch.screenMode = "time_up";
      [state] = await db
        .update(tournamentState)
        .set(patch)
        .where(eq(tournamentState.id, state.id))
        .returning();
    }
  }
  return state;
}

export async function updateState(patch: Partial<typeof tournamentState.$inferInsert>) {
  const state = await getTournamentState();
  const [updated] = await db
    .update(tournamentState)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tournamentState.id, state.id))
    .returning();
  return updated;
}

/* ------------------------------ Domain loads ------------------------------- */

export async function getActiveTournament() {
  const state = await getTournamentState();
  let tournament = null;
  if (state.tournamentId) {
    [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, state.tournamentId));
  }
  if (!tournament) {
    [tournament] = await db.select().from(tournaments).limit(1);
  }
  return tournament ?? null;
}

export async function getFullStructure() {
  const tournament = await getActiveTournament();
  if (!tournament) return { tournament: null, stages: [] as (Stage & { tasks: Task[] })[] };
  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, tournament.id))
    .orderBy(asc(stages.order), asc(stages.id));
  const stageIds = stageRows.map((s) => s.id);
  const taskRows = stageIds.length
    ? await db
        .select()
        .from(tasks)
        .where(inArray(tasks.stageId, stageIds))
        .orderBy(asc(tasks.order), asc(tasks.id))
    : [];
  return {
    tournament,
    stages: stageRows.map((s) => ({
      ...s,
      tasks: taskRows.filter((t) => t.stageId === s.id),
    })),
  };
}

export async function getTaskBundle(taskId: number): Promise<{
  task: Task;
  options: TaskOption[];
  criteria: Criterion[];
} | null> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return null;
  const [options, crits] = await Promise.all([
    db.select().from(taskOptions).where(eq(taskOptions.taskId, taskId)).orderBy(asc(taskOptions.order), asc(taskOptions.id)),
    db.select().from(criteria).where(eq(criteria.taskId, taskId)).orderBy(asc(criteria.order), asc(criteria.id)),
  ]);
  return { task, options, criteria: crits };
}

/* ------------------------------- Leaderboard ------------------------------- */

export type LeaderboardRow = {
  team: Team;
  school: School | null;
  total: number;
  maxTotal: number;
  perStage: Record<number, { score: number; max: number }>;
  rank: number;
};

export async function computeLeaderboard(onlyPublished = true): Promise<{
  rows: LeaderboardRow[];
  stageList: Stage[];
}> {
  const tournament = await getActiveTournament();
  const [teamRows, schoolRows, scoreRows, stageRows, taskRows] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.id)),
    db.select().from(schools),
    db.select().from(scores),
    tournament
      ? db.select().from(stages).where(eq(stages.tournamentId, tournament.id)).orderBy(asc(stages.order))
      : Promise.resolve([] as Stage[]),
    db.select().from(tasks),
  ]);

  const visibleScores = scoreRows.filter((s) => (onlyPublished ? s.published : true));
  const rows: LeaderboardRow[] = teamRows.map((team) => {
    const perStage: Record<number, { score: number; max: number }> = {};
    let total = 0;
    let maxTotal = 0;
    for (const sc of visibleScores.filter((s) => s.teamId === team.id)) {
      const task = taskRows.find((t) => t.id === sc.taskId);
      if (!task) continue;
      const entry = perStage[task.stageId] ?? { score: 0, max: 0 };
      entry.score += sc.score;
      entry.max += sc.maxScore;
      perStage[task.stageId] = entry;
      total += sc.score;
      maxTotal += sc.maxScore;
    }
    return {
      team,
      school: schoolRows.find((s) => s.id === team.schoolId) ?? null,
      total,
      maxTotal,
      perStage,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.total - a.total || a.team.id - b.team.id);
  rows.forEach((r, i) => (r.rank = i + 1));
  return { rows, stageList: stageRows };
}

/* ------------------------------ Score publish ------------------------------ */

export async function publishTaskScores(taskId: number) {
  const bundle = await getTaskBundle(taskId);
  if (!bundle) throw new Error("Task not found");
  const { task } = bundle;
  const [teamRows, subRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(submissions).where(eq(submissions.taskId, taskId)),
  ]);
  const subIds = subRows.map((s) => s.id);
  const evalRows = subIds.length
    ? await db.select().from(evaluations).where(inArray(evaluations.submissionId, subIds))
    : [];

  for (const team of teamRows) {
    const sub = subRows.find((s) => s.teamId === team.id);
    let value = 0;
    if (sub) {
      if (task.autoGrade) {
        value = sub.autoScore ?? 0;
      } else {
        const evals = evalRows.filter((e) => e.submissionId === sub.id);
        if (evals.length > 0) {
          value = Math.round(evals.reduce((a, e) => a + e.totalScore, 0) / evals.length);
        }
      }
    }
    value = Math.max(0, Math.min(task.maxScore, value));
    const existing = await db
      .select()
      .from(scores)
      .where(eq(scores.taskId, taskId))
      .then((r) => r.find((x) => x.teamId === team.id));
    if (existing) {
      await db
        .update(scores)
        .set({ score: value, maxScore: task.maxScore, published: true, publishedAt: new Date() })
        .where(eq(scores.id, existing.id));
    } else {
      await db.insert(scores).values({
        taskId,
        teamId: team.id,
        score: value,
        maxScore: task.maxScore,
        published: true,
        publishedAt: new Date(),
      });
    }
  }
}

export async function unpublishTaskScores(taskId: number) {
  await db.update(scores).set({ published: false, publishedAt: null }).where(eq(scores.taskId, taskId));
}

/* ------------------------------ Misc helpers ------------------------------- */

export async function getJuryUsers() {
  return db.select().from(users).orderBy(asc(users.id));
}

export function gradeQuizScore(
  selected: number[],
  options: TaskOption[],
  maxScore: number,
): number {
  const correct = options.filter((o) => o.isCorrect).map((o) => o.id);
  if (correct.length === 0) return 0;
  const correctPicked = selected.filter((id) => correct.includes(id)).length;
  const wrongPicked = selected.filter((id) => !correct.includes(id)).length;
  const ratio = Math.max(0, (correctPicked - wrongPicked) / correct.length);
  return Math.round(ratio * maxScore);
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
