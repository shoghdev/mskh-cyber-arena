import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getActiveTournament, logAction } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const tournament = await getActiveTournament();
  if (!tournament) return NextResponse.json({ stages: [] });
  const rows = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, tournament.id))
    .orderBy(asc(stages.order));
  return NextResponse.json({ stages: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const tournament = await getActiveTournament();
  if (!tournament) return NextResponse.json({ error: "Մրցույթ չկա" }, { status: 404 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim().slice(0, 200);
    const description = String(body.description ?? "").trim().slice(0, 2000);
    const order = Number(body.order) || 0;
    if (!name) return NextResponse.json({ error: "Լրացրեք փուլի անվանումը" }, { status: 400 });
    const [stage] = await db
      .insert(stages)
      .values({ tournamentId: tournament.id, name, description, order })
      .returning();
    await logAction(session.user.name, "stage_created", name);
    return NextResponse.json({ ok: true, stage });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
