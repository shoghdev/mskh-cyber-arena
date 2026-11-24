import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  getTaskBundle,
  getTournamentState,
  gradeQuizScore,
  isValidUrl,
  logAction,
} from "@/lib/state";

export async function POST(req: NextRequest) {
  const session = await requireRole("team");
  if (!session?.team) {
    return NextResponse.json({ error: "Չկա մուտք" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const taskId = Number(body.taskId);
    if (!taskId) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 400 });

    const state = await getTournamentState();
    if (state.activeTaskId !== taskId) {
      return NextResponse.json({ error: "Այս առաջադրանքն այս պահին ակտիվ չէ" }, { status: 400 });
    }
    if (!state.submissionsOpen || state.timerState === "finished") {
      return NextResponse.json(
        { error: "Պատասխանների ընդունումը փակված է" },
        { status: 400 },
      );
    }
    const bundle = await getTaskBundle(taskId);
    if (!bundle) return NextResponse.json({ error: "Առաջադրանքը չի գտնվել" }, { status: 404 });
    const { task, options } = bundle;

    const [existing] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.taskId, taskId), eq(submissions.teamId, session.team.id)))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Դուք արդեն ներկայացրել եք վերջնական պատասխանը" },
        { status: 409 },
      );
    }

    let textAnswer = "";
    let linkUrl = "";
    let selectedOptions: number[] = [];
    let autoScore: number | null = null;

    if (task.answerFormat === "choice") {
      const raw: unknown[] = Array.isArray(body.selectedOptions) ? body.selectedOptions : [];
      selectedOptions = raw.map((v) => Number(v)).filter((n) => options.some((o) => o.id === n));
      if (selectedOptions.length === 0) {
        return NextResponse.json({ error: "Ընտրեք գոնե մեկ տարբերակ" }, { status: 400 });
      }
      if (task.autoGrade) {
        autoScore = gradeQuizScore(selectedOptions, options, task.maxScore);
      }
    } else if (task.answerFormat === "link") {
      linkUrl = String(body.linkUrl ?? "").trim();
      if (!linkUrl || !isValidUrl(linkUrl) || linkUrl.length > 500) {
        return NextResponse.json({ error: "Մուտքագրեք ճիշտ հղում (http/https)" }, { status: 400 });
      }
      textAnswer = String(body.textAnswer ?? "").slice(0, 2000);
    } else {
      textAnswer = String(body.textAnswer ?? "").trim();
      if (textAnswer.length < 10) {
        return NextResponse.json(
          { error: "Պատասխանը չափազանց կարճ է․ գրեք ավելի մանրամասն" },
          { status: 400 },
        );
      }
      if (textAnswer.length > 5000) {
        return NextResponse.json({ error: "Պատասխանը չափազանց երկար է" }, { status: 400 });
      }
    }

    const [created] = await db
      .insert(submissions)
      .values({
        taskId,
        teamId: session.team.id,
        textAnswer,
        linkUrl,
        selectedOptions,
        autoScore,
      })
      .returning();

    await logAction(
      session.team.name,
      "submit",
      `Պատասխան «${task.title}» առաջադրանքին${autoScore !== null ? ` (ավտոմատ՝ ${autoScore})` : ""}`,
    );
    return NextResponse.json({
      ok: true,
      submission: { id: created.id, autoScore: task.autoGrade ? autoScore : null },
      message: "Ձեր պատասխանը հաջողությամբ ներկայացվել է",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error && msg_of(e).includes("submissions_task_team_unique")
      ? "Դուք արդեն ներկայացրել եք վերջնական պատասխանը"
      : "Սերվերի սխալ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function msg_of(e: Error): string {
  return `${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`;
}
