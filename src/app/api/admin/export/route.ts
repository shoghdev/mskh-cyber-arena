import { NextResponse } from "next/server";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { schools, scores, teams } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getFullStructure } from "@/lib/state";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });

  const structure = await getFullStructure();
  const allTasks = structure.stages.flatMap((s) => s.tasks.map((t) => ({ ...t, stageName: s.name })));
  const taskIds = allTasks.map((t) => t.id);
  const [teamRows, schoolRows] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.id)),
    db.select().from(schools),
  ]);
  const scoreRows = taskIds.length
    ? await db.select().from(scores).where(inArray(scores.taskId, taskIds))
    : [];

  const header = [
    "Տեղ",
    "Թիմ",
    "Դպրոց",
    "Դասարան",
    ...allTasks.map((t) => `${t.stageName} — ${t.title} (առավել. ${t.maxScore})`),
    "Ընդամենը",
  ];

  const rows = teamRows
    .map((team) => {
      const school = schoolRows.find((s) => s.id === team.schoolId);
      const perTask = allTasks.map((task) => {
        const sc = scoreRows.find((s) => s.taskId === task.id && s.teamId === team.id && s.published);
        return sc ? sc.score : 0;
      });
      const total = perTask.reduce((a, b) => a + b, 0);
      return { team, school, perTask, total };
    })
    .sort((a, b) => b.total - a.total)
    .map((r, i) => [
      i + 1,
      r.team.name,
      r.school?.name ?? "",
      r.team.grade,
      ...r.perTask,
      r.total,
    ]);

  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mskch-cyber-arena-results.csv"`,
    },
  });
}
