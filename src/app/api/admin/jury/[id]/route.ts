import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);
  try {
    const body = await req.json();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return NextResponse.json({ error: "Օգտատերը չի գտնվել" }, { status: 404 });
    const patch: Partial<typeof users.$inferInsert> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 100);
    if (body.active !== undefined) {
      if (user.id === session.user.id && !body.active) {
        return NextResponse.json({ error: "Չեք կարող անջատել սեփական հաշիվը" }, { status: 400 });
      }
      patch.active = Boolean(body.active);
    }
    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json({ error: "Գաղտնաբառը՝ առնվազն 6 նիշ" }, { status: 400 });
      }
      patch.passwordHash = hashPassword(String(body.password));
    }
    await db.update(users).set(patch).where(eq(users.id, userId));
    await logAction(session.user.name, "user_updated", user.username);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return NextResponse.json({ error: "Օգտատերը չի գտնվել" }, { status: 404 });
  if (user.id === session.user.id) {
    return NextResponse.json({ error: "Չեք կարող ջնջել սեփական հաշիվը" }, { status: 400 });
  }
  await db.delete(users).where(eq(users.id, userId));
  await logAction(session.user.name, "user_deleted", user.username);
  return NextResponse.json({ ok: true });
}
