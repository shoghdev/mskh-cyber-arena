import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { criteria, taskOptions, tasks } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const taskId = Number(id);
  try {
    const body = await req.json();
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });

    const patch: Partial<typeof tasks.$inferInsert> = {};
    if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 300);
    if (body.description !== undefined) patch.description = String(body.description).trim().slice(0, 5000);
    if (body.type !== undefined) patch.type = String(body.type);
    if (body.order !== undefined) patch.order = Number(body.order) || 0;
    if (body.durationSec !== undefined) patch.durationSec = Math.max(30, Math.min(7200, Number(body.durationSec) || 300));
    if (body.maxScore !== undefined) patch.maxScore = Math.max(1, Math.min(1000, Number(body.maxScore) || 100));
    if (body.mediaUrl !== undefined) patch.mediaUrl = String(body.mediaUrl).trim().slice(0, 500);
    if (body.answerFormat !== undefined) patch.answerFormat = String(body.answerFormat);
    if (body.autoGrade !== undefined) patch.autoGrade = Boolean(body.autoGrade);
    if (body.status !== undefined) patch.status = String(body.status);
    if (body.stageId !== undefined) patch.stageId = Number(body.stageId);

    const [updated] = await db.update(tasks).set(patch).where(eq(tasks.id, taskId)).returning();

    if (Array.isArray(body.options)) {
      await db.delete(taskOptions).where(eq(taskOptions.taskId, taskId));
      const opts = body.options as { text: string; isCorrect: boolean }[];
      if (opts.length) {
        await db.insert(taskOptions).values(
          opts
            .filter((o) => String(o.text).trim())
            .map((o, i) => ({
              taskId,
              text: String(o.text).trim().slice(0, 500),
              isCorrect: Boolean(o.isCorrect),
              order: i,
            })),
        );
      }
    }
    if (Array.isArray(body.criteria)) {
      await db.delete(criteria).where(eq(criteria.taskId, taskId));
      const crits = body.criteria as { name: string; maxPoints: number }[];
      if (crits.length) {
        await db.insert(criteria).values(
          crits
            .filter((c) => String(c.name).trim())
            .map((c, i) => ({
              taskId,
              name: String(c.name).trim().slice(0, 200),
              maxPoints: Math.max(1, Math.min(1000, Number(c.maxPoints) || 10)),
              order: i,
            })),
        );
      }
    }
    await logAction(session.user.name, "task_updated", updated.title);
    return NextResponse.json({ ok: true, task: updated });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const taskId = Number(id);
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });
  await db.delete(tasks).where(eq(tasks.id, taskId));
  await logAction(session.user.name, "task_deleted", task.title);
  return NextResponse.json({ ok: true });
}
