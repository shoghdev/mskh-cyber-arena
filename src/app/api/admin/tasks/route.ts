import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { criteria, stages, taskOptions, tasks } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getActiveTournament, logAction } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  const tournament = await getActiveTournament();
  if (!tournament) return NextResponse.json({ stages: [], tasks: [] });
  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, tournament.id))
    .orderBy(asc(stages.order));
  const stageIds = stageRows.map((s) => s.id);
  const taskRows = stageIds.length
    ? await db.select().from(tasks).where(inArray(tasks.stageId, stageIds)).orderBy(asc(tasks.order))
    : [];
  const taskIds = taskRows.map((t) => t.id);
  const [optRows, critRows] = taskIds.length
    ? await Promise.all([
        db.select().from(taskOptions).where(inArray(taskOptions.taskId, taskIds)).orderBy(asc(taskOptions.order)),
        db.select().from(criteria).where(inArray(criteria.taskId, taskIds)).orderBy(asc(criteria.order)),
      ])
    : [[], []];
  return NextResponse.json({
    stages: stageRows,
    tasks: taskRows.map((t) => ({
      ...t,
      options: optRows.filter((o) => o.taskId === t.id),
      criteria: critRows.filter((c) => c.taskId === t.id),
    })),
  });
}

type PayloadOption = { text: string; isCorrect: boolean };
type PayloadCriterion = { name: string; maxPoints: number };

function parseBody(body: Record<string, unknown>) {
  return {
    stageId: Number(body.stageId),
    title: String(body.title ?? "").trim().slice(0, 300),
    description: String(body.description ?? "").trim().slice(0, 5000),
    type: String(body.type ?? "scenario"),
    order: Number(body.order) || 0,
    durationSec: Math.max(30, Math.min(7200, Number(body.durationSec) || 300)),
    maxScore: Math.max(1, Math.min(1000, Number(body.maxScore) || 100)),
    mediaUrl: String(body.mediaUrl ?? "").trim().slice(0, 500),
    answerFormat: String(body.answerFormat ?? "text"),
    autoGrade: Boolean(body.autoGrade),
    options: (Array.isArray(body.options) ? body.options : []) as PayloadOption[],
    criteria: (Array.isArray(body.criteria) ? body.criteria : []) as PayloadCriterion[],
  };
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session?.user) return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  try {
    const body = await req.json();
    const p = parseBody(body);
    if (!p.title || !p.stageId) {
      return NextResponse.json({ error: "Լրացրեք վերնագիրը և փուլը" }, { status: 400 });
    }
    const [task] = await db
      .insert(tasks)
      .values({
        stageId: p.stageId,
        title: p.title,
        description: p.description,
        type: p.type,
        order: p.order,
        durationSec: p.durationSec,
        maxScore: p.maxScore,
        mediaUrl: p.mediaUrl,
        answerFormat: p.answerFormat,
        autoGrade: p.autoGrade,
        status: "ready",
      })
      .returning();
    if (p.answerFormat === "choice" && p.options.length) {
      await db.insert(taskOptions).values(
        p.options
          .filter((o) => String(o.text).trim())
          .map((o, i) => ({
            taskId: task.id,
            text: String(o.text).trim().slice(0, 500),
            isCorrect: Boolean(o.isCorrect),
            order: i,
          })),
      );
    }
    if (p.criteria.length) {
      await db.insert(criteria).values(
        p.criteria
          .filter((c) => String(c.name).trim())
          .map((c, i) => ({
            taskId: task.id,
            name: String(c.name).trim().slice(0, 200),
            maxPoints: Math.max(1, Math.min(1000, Number(c.maxPoints) || 10)),
            order: i,
          })),
      );
    }
    await logAction(session.user.name, "task_created", p.title);
    return NextResponse.json({ ok: true, task });
  } catch {
    return NextResponse.json({ error: "Սերվերի սխալ" }, { status: 500 });
  }
}
