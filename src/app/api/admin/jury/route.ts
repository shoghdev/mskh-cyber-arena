import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { logAction } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const rows = await db.select().from(users).orderBy(asc(users.id));
  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim().slice(0, 100);
    const role = body.role === "admin" ? "admin" : "jury";
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Մուտքանունը՝ 3-30 նիշ (a-z, 0-9, _ . -)" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Գաղտնաբառը՝ առնվազն 6 նիշ" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Լրացրեք անունը" }, { status: 400 });
    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) return NextResponse.json({ error: "Մուտքանունն զբաղված է" }, { status: 409 });
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash: hashPassword(password), name, role })
      .returning();
    await logAction(session.user.name, "user_created", `${name} (${username}, ${role})`);
    return NextResponse.json({ ok: true, user: { id: user.id, username, name, role } });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
