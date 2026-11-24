import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { criteria, evaluations, schools, submissions, taskOptions, tasks, teams } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getFullStructure, getTournamentState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("jury");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });

  const state = await getTournamentState();
  const structure = await getFullStructure();
  const allTasks = structure.stages.flatMap((s) => s.tasks.map((t) => ({ ...t, stageName: s.name })));
  const taskIds = allTasks.map((t) => t.id);

  const [subRows, critRows, optRows, teamRows, schoolRows] = await Promise.all([
    taskIds.length ? db.select().from(submissions).where(inArray(submissions.taskId, taskIds)) : Promise.resolve([]),
    taskIds.length ? db.select().from(criteria).where(inArray(criteria.taskId, taskIds)) : Promise.resolve([]),
    taskIds.length ? db.select().from(taskOptions).where(inArray(taskOptions.taskId, taskIds)) : Promise.resolve([]),
    db.select().from(teams),
    db.select().from(schools),
  ]);
  const subIds = subRows.map((s) => s.id);
  const evalRows = subIds.length
    ? await db.select().from(evaluations).where(inArray(evaluations.submissionId, subIds))
    : [];
  const juryNames = new Map<number, string>();
  const { users } = await import("@/db/schema");
  const juryUsers = await db.select().from(users);
  juryUsers.forEach((u) => juryNames.set(u.id, u.name));

  const payload = allTasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    stageName: task.stageName,
    maxScore: task.maxScore,
    answerFormat: task.answerFormat,
    mediaUrl: task.mediaUrl,
    status: task.status,
    isActive: state.activeTaskId === task.id,
    criteria: critRows
      .filter((c) => c.taskId === task.id)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, name: c.name, maxPoints: c.maxPoints })),
    options: optRows
      .filter((o) => o.taskId === task.id)
      .map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
    submissions: subRows
      .filter((s) => s.taskId === task.id)
      .map((s) => {
        const team = teamRows.find((t) => t.id === s.teamId);
        const school = team ? schoolRows.find((sc) => sc.id === team.schoolId) : null;
        const evals = evalRows
          .filter((e) => e.submissionId === s.id)
          .map((e) => ({
            id: e.id,
            juryId: e.juryId,
            juryName: juryNames.get(e.juryId) ?? "Ժյուրի",
            totalScore: e.totalScore,
            criteriaScores: e.criteriaScores,
            comment: e.comment,
            updatedAt: e.updatedAt.getTime(),
          }));
        return {
          id: s.id,
          teamId: s.teamId,
          teamName: team?.name ?? "Թիմ",
          schoolName: school?.name ?? "",
          schoolColor: school?.color ?? "#22d3ee",
          textAnswer: s.textAnswer,
          linkUrl: s.linkUrl,
          selectedOptions: s.selectedOptions,
          autoScore: s.autoScore,
          submittedAt: s.submittedAt.getTime(),
          evaluations: evals,
          myEvaluation: evals.find((e) => e.juryId === session.user!.id) ?? null,
        };
      })
      .sort((a, b) => a.submittedAt - b.submittedAt),
  }));

  const totalSubs = subRows.length;
  const myEvals = evalRows.filter((e) => e.juryId === session.user!.id).length;

  return NextResponse.json({
    serverNow: Date.now(),
    me: { id: session.user.id, name: session.user.name },
    activeTaskId: state.activeTaskId,
    screen: state.screenMode,
    tasks: payload,
    stats: { submissions: totalSubs, myEvaluations: myEvals },
  });
}
