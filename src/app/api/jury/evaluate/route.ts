import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { criteria, evaluations, submissions, tasks } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

export async function POST(req: NextRequest) {
  const session = await requireRole("jury");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });

  try {
    const body = await req.json();
    const submissionId = Number(body.submissionId);
    const comment = String(body.comment ?? "").slice(0, 2000);
    const rawScores = (body.criteriaScores ?? {}) as Record<string, unknown>;

    const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!sub) return NextResponse.json({ error: "Աշխատանքը չի գտնվել" }, { status: 404 });
    const [task] = await db.select().from(tasks).where(eq(tasks.id, sub.taskId)).limit(1);
    if (!task) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });
    if (task.autoGrade) {
      return NextResponse.json(
        { error: "Այս առաջադրանքը գնահատվում է ավտոմատ" },
        { status: 400 },
      );
    }

    const critRows = await db.select().from(criteria).where(eq(criteria.taskId, task.id));
    const criteriaScores: Record<string, number> = {};
    let total = 0;
    for (const c of critRows) {
      const raw = Number(rawScores[String(c.id)] ?? 0);
      const value = Math.max(0, Math.min(c.maxPoints, Number.isFinite(raw) ? Math.round(raw) : 0));
      criteriaScores[String(c.id)] = value;
      total += value;
    }
    total = Math.min(total, task.maxScore);

    const [existing] = await db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.submissionId, submissionId), eq(evaluations.juryId, session.user.id)))
      .limit(1);

    if (existing) {
      await db
        .update(evaluations)
        .set({ criteriaScores, totalScore: total, comment, updatedAt: new Date() })
        .where(eq(evaluations.id, existing.id));
      await logAction(
        session.user.name,
        "evaluation_updated",
        `«${task.title}»՝ ${existing.totalScore} → ${total}`,
      );
      return NextResponse.json({ ok: true, totalScore: total, updated: true });
    }

    await db.insert(evaluations).values({
      submissionId,
      juryId: session.user.id,
      criteriaScores,
      totalScore: total,
      comment,
    });
    await logAction(session.user.name, "evaluation_created", `«${task.title}»՝ ${total} միավոր`);
    return NextResponse.json({ ok: true, totalScore: total, updated: false });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
