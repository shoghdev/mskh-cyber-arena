import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { createSession, teamLoginAllowed, teamLoginFailed } from "@/lib/auth";
import { logAction } from "@/lib/state";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Մուտքագրեք թիմային կոդը" }, { status: 400 });
    }
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!teamLoginAllowed(ip)) {
      return NextResponse.json(
        { error: "Չափից շատ փորձեր․ փորձեք մի քանի րոպեից" },
        { status: 429 },
      );
    }
    const [team] = await db.select().from(teams).where(eq(teams.accessCode, code)).limit(1);
    if (!team) {
      teamLoginFailed(ip);
      return NextResponse.json({ error: "Կոդը սխալ է․ ստուգեք և կրկին փորձեք" }, { status: 401 });
    }
    if (team.disabled) {
      return NextResponse.json({ error: "Թիմի մուտքը ժամանակավորապես անջատված է" }, { status: 403 });
    }
    await createSession({ role: "team", teamId: team.id });
    await logAction(team.name, "team_login", "Թիմը մուտք գործեց");
    return NextResponse.json({ ok: true, team: { id: team.id, name: team.name } });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
