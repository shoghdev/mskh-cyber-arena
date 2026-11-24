import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, teams } from "@/db/schema";
import { generateTeamCode, requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const teamId = Number(id);
  try {
    const body = await req.json();
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return NextResponse.json({ error: "Թիմը չի գտնվել" }, { status: 404 });

    const patch: Partial<typeof teams.$inferInsert> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 100);
    if (body.grade !== undefined) patch.grade = String(body.grade).trim().slice(0, 20);
    if (body.members !== undefined) patch.members = String(body.members).trim().slice(0, 500);
    if (body.disabled !== undefined) patch.disabled = Boolean(body.disabled);
    if (body.schoolId !== undefined) {
      const schoolRow = (await db.select().from(schools)).find((s) => s.id === Number(body.schoolId));
      if (!schoolRow) return NextResponse.json({ error: "Դպրոցը չի գտնվել" }, { status: 404 });
      patch.schoolId = schoolRow.id;
    }
    if (body.regenerateCode) {
      const schoolRow = (await db.select().from(schools)).find((s) => s.id === team.schoolId);
      patch.accessCode = generateTeamCode(schoolRow?.shortCode ?? "TEAM");
    }
    const [updated] = await db.update(teams).set(patch).where(eq(teams.id, teamId)).returning();
    await logAction(session.user.name, "team_updated", `${updated.name}${body.regenerateCode ? " (նոր կոդ)" : ""}`);
    return NextResponse.json({ ok: true, team: updated });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const { id } = await ctx.params;
  const teamId = Number(id);
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return NextResponse.json({ error: "Թիմը չի գտնվել" }, { status: 404 });
  await db.delete(teams).where(eq(teams.id, teamId));
  await logAction(session.user.name, "team_deleted", team.name);
  return NextResponse.json({ ok: true });
}
