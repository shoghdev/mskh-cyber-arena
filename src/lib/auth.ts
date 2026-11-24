import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, teams, type User, type Team } from "@/db/schema";

/* ------------------------------ Passwords --------------------------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateTeamCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) suffix += alphabet[bytes[i] % alphabet.length];
  return `${
    prefix
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6) || "TEAM"
  }-${suffix}`;
}

/* ------------------------------- Sessions --------------------------------- */

export type SessionData = {
  token: string;
  role: "admin" | "jury" | "team";
  userId: number | null;
  teamId: number | null;
  user?: User | null;
  team?: Team | null;
};

export async function createSession(opts: {
  role: "admin" | "jury" | "team";
  userId?: number;
  teamId?: number;
}): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await db.insert(sessions).values({
    token,
    role: opts.role,
    userId: opts.userId ?? null,
    teamId: opts.teamId ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set("arena_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get("arena_session")?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    jar.delete("arena_session");
  }
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get("arena_session")?.value;
  if (!token) return null;
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  const result: SessionData = {
    token: row.token,
    role: row.role as SessionData["role"],
    userId: row.userId,
    teamId: row.teamId,
  };
  if (row.userId) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    if (!u || !u.active) return null;
    result.user = u;
  }
  if (row.teamId) {
    const [t] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, row.teamId))
      .limit(1);
    if (!t || t.disabled) return null;
    result.team = t;
  }
  return result;
}

export async function requireRole(
  role: "admin" | "jury" | "team",
): Promise<SessionData | null> {
  const session = await getSession();
  if (!session) return null;
  if (role === "jury" && (session.role === "jury" || session.role === "admin"))
    return session;
  if (session.role !== role) return null;
  return session;
}

/* --------------------------- Team login throttle --------------------------- */

const attempts = new Map<string, number[]>();

export function teamLoginAllowed(key: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const list = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  attempts.set(key, list);
  return list.length < 6;
}

export function teamLoginFailed(key: string): void {
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}
