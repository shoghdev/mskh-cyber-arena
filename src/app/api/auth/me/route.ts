import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });
  let school = null;
  if (session.team) {
    [school] = await db.select().from(schools).where(eq(schools.id, session.team.schoolId)).limit(1);
  }
  return NextResponse.json({
    session: {
      role: session.role,
      name: session.user?.name ?? session.team?.name ?? "",
      team: session.team
        ? {
            id: session.team.id,
            name: session.team.name,
            grade: session.team.grade,
            members: session.team.members,
            school: school?.name ?? "",
            schoolColor: school?.color ?? "#22d3ee",
          }
        : null,
    },
  });
}
