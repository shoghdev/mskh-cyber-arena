import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { logAction } from "@/lib/state";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ error: "Լրացրեք բոլոր դաշտերը" }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Սխալ մուտքանուն կամ գաղտնաբառ" }, { status: 401 });
    }
    if (user.role !== "admin" && user.role !== "jury") {
      return NextResponse.json({ error: "Մուտքն արգելված է" }, { status: 403 });
    }
    await createSession({ role: user.role as "admin" | "jury", userId: user.id });
    await logAction(user.name, "login", `${user.role} մուտք գործեց`);
    return NextResponse.json({ ok: true, role: user.role, name: user.name });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
