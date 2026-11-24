import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(150);
  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      details: r.details,
      at: r.createdAt.getTime(),
    })),
  });
}
