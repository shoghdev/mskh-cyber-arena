import { NextResponse } from "next/server";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { evaluations, schools, scores, submissions, teams, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getFullStructure } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });

  const structure = await getFullStructure();
  const allTasks = structure.stages.flatMap((s) =>
    s.tasks.map((t) => ({ ...t, stageName: s.name })),
  );
  const taskIds = allTasks.map((t) => t.id);
  const [teamRows, schoolRows, userRows] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.id)),
    db.select().from(schools),
    db.select().from(users),
  ]);
  const subRows = taskIds.length
    ? await db.select().from(submissions).where(inArray(submissions.taskId, taskIds))
    : [];
  const subIds = subRows.map((s) => s.id);
  const [evalRows, scoreRows] = await Promise.all([
    subIds.length ? db.select().from(evaluations).where(inArray(evaluations.submissionId, subIds)) : Promise.resolve([]),
    taskIds.length ? db.select().from(scores).where(inArray(scores.taskId, taskIds)) : Promise.resolve([]),
  ]);

  const juryName = (id: number) => userRows.find((u) => u.id === id)?.name ?? "Ժյուրի";

  const tasksPayload = allTasks.map((task) => ({
    id: task.id,
    title: task.title,
    stageName: task.stageName,
    type: task.type,
    autoGrade: task.autoGrade,
    maxScore: task.maxScore,
    status: task.status,
    published: scoreRows.some((s) => s.taskId === task.id && s.published),
    teams: teamRows.map((team) => {
      const sub = subRows.find((s) => s.taskId === task.id && s.teamId === team.id);
      const school = schoolRows.find((sc) => sc.id === team.schoolId);
      const evals = sub
        ? evalRows
            .filter((e) => e.submissionId === sub.id)
            .map((e) => ({
              id: e.id,
              juryName: juryName(e.juryId),
              totalScore: e.totalScore,
              comment: e.comment,
            }))
        : [];
      const avg = evals.length
        ? Math.round(evals.reduce((a, e) => a + e.totalScore, 0) / evals.length)
        : null;
      const publishedScore = scoreRows.find((s) => s.taskId === task.id && s.teamId === team.id);
      return {
        teamId: team.id,
        teamName: team.name,
        schoolName: school?.name ?? "",
        schoolColor: school?.color ?? "#22d3ee",
        submission: sub
          ? {
              id: sub.id,
              textAnswer: sub.textAnswer,
              linkUrl: sub.linkUrl,
              autoScore: sub.autoScore,
              submittedAt: sub.submittedAt.getTime(),
            }
          : null,
        evaluations: evals,
        average: task.autoGrade ? (sub?.autoScore ?? null) : avg,
        publishedScore: publishedScore?.published ? publishedScore.score : null,
      };
    }),
  }));

  return NextResponse.json({ tasks: tasksPayload, juryCount: userRows.filter((u) => u.role === "jury" && u.active).length });
}
