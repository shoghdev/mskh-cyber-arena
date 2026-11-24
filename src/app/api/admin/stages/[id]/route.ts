import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const stageId = Number(id);
  try {
    const body = await req.json();
    const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (!stage) return NextResponse.json({ error: "Փուլը չի գտնվել" }, { status: 404 });
    const patch: Partial<typeof stages.$inferInsert> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 200);
    if (body.description !== undefined) patch.description = String(body.description).trim().slice(0, 2000);
    if (body.order !== undefined) patch.order = Number(body.order) || 0;
    if (body.status !== undefined && ["pending", "active", "completed"].includes(body.status)) {
      patch.status = body.status;
    }
    const [updated] = await db.update(stages).set(patch).where(eq(stages.id, stageId)).returning();
    await logAction(session.user.name, "stage_updated", updated.name);
    return NextResponse.json({ ok: true, stage: updated });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const stageId = Number(id);
  const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage) return NextResponse.json({ error: "Փուլը չի գտնվել" }, { status: 404 });
  await db.delete(stages).where(eq(stages.id, stageId));
  await logAction(session.user.name, "stage_deleted", stage.name);
  return NextResponse.json({ ok: true });
}
