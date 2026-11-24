import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { schools, teams } from "@/db/schema";
import { generateTeamCode, requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const [teamRows, schoolRows] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.id)),
    db.select().from(schools).orderBy(asc(schools.id)),
  ]);
  return NextResponse.json({
    teams: teamRows.map((t) => ({
      ...t,
      schoolName: schoolRows.find((s) => s.id === t.schoolId)?.name ?? "",
      schoolColor: schoolRows.find((s) => s.id === t.schoolId)?.color ?? "#22d3ee",
    })),
    schools: schoolRows,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim().slice(0, 100);
    const schoolId = Number(body.schoolId);
    const grade = String(body.grade ?? "").trim().slice(0, 20);
    const members = String(body.members ?? "").trim().slice(0, 500);
    if (!name || !schoolId) {
      return NextResponse.json({ error: "Լրացրեք թիմի անունը և դպրոցը" }, { status: 400 });
    }
    const schoolRow = (await db.select().from(schools)).find((s) => s.id === schoolId);
    if (!schoolRow) return NextResponse.json({ error: "Դպրոցը չի գտնվել" }, { status: 404 });
    const accessCode = generateTeamCode(schoolRow.shortCode);
    const [team] = await db
      .insert(teams)
      .values({ name, schoolId, grade, members, accessCode })
      .returning();
    await logAction(session.user.name, "team_created", `${name} (${accessCode})`);
    return NextResponse.json({ ok: true, team });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
