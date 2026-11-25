"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Scale,
  LogOut,
  Loader2,
  AlertTriangle,
  Send,
  FileVideo,
  Gamepad2,
  HelpCircle,
  Bug,
  ScrollText,
  Zap,
  CheckCircle2,
  Link2,
  MessageSquare,
  UserRound,
  Inbox,
  House,
} from "lucide-react";
import { Backdrop, Badge, Btn, Input, Panel, Textarea } from "@/components/ui";
import { cn, TASK_TYPES } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof FileVideo> = {
  video: FileVideo,
  quiz: HelpCircle,
  threat: Bug,
  game: Gamepad2,
  scenario: ScrollText,
};

type Eval = {
  id: number;
  juryId: number;
  juryName: string;
  totalScore: number;
  criteriaScores: Record<string, number>;
  comment: string;
  updatedAt: number;
};

type Submission = {
  id: number;
  teamId: number;
  teamName: string;
  schoolName: string;
  schoolColor: string;
  textAnswer: string;
  linkUrl: string;
  selectedOptions: number[];
  autoScore: number | null;
  submittedAt: number;
  evaluations: Eval[];
  myEvaluation: Eval | null;
};

type JuryTask = {
  id: number;
  title: string;
  description: string;
  type: string;
  stageName: string;
  maxScore: number;
  answerFormat: string;
  mediaUrl: string;
  status: string;
  isActive: boolean;
  autoGrade: boolean;
  criteria: { id: number; name: string; maxPoints: number }[];
  options: { id: number; text: string; isCorrect: boolean }[];
  submissions: Submission[];
};

type JuryState = {
  me: { id: number; name: string };
  activeTaskId: number | null;
  screen: string;
  tasks: JuryTask[];
  stats: { submissions: number; myEvaluations: number };
};

export default function JuryPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) =>
        setAuthed(j.session?.role === "jury" || j.session?.role === "admin"),
      )
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-void">
        <Loader2 className="animate-spin text-cyan" size={32} />
      </main>
    );
  }
  return authed ? (
    <JuryDashboard />
  ) : (
    <JuryLogin onSuccess={() => setAuthed(true)} />
  );
}

/* ---------------------------------- Login ---------------------------------- */

function JuryLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Սխալ");
      else onSuccess();
    } catch {
      setError("Կապի խնդիր․ փորձեք կրկին");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-4">
      <Backdrop />
      <Panel className="w-full max-w-md p-8 animate-pop">
        <div className="flex flex-col items-center text-center">
          <div className="grid place-items-center rounded-2xl border border-mint/40 bg-panel2 p-4">
            <Scale size={36} className="text-mint" strokeWidth={1.6} />
          </div>
          <h1 className="mt-6 font-display text-xl font-black tracking-widest text-white">
            JURY PANEL
          </h1>
          <p className="mt-2 text-sm text-slate-400">Ժյուրիի անդամների մուտք</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Մուտքանուն"
            autoFocus
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Գաղտնաբառ"
            type="password"
          />
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger animate-pop">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <Btn
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !username || !password}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Scale size={18} />
            )}
            Մուտք գործել
          </Btn>
        </form>
        <Link
          href="/"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <House size={14} /> Գլխավոր էջ
        </Link>
      </Panel>
    </main>
  );
}

/* -------------------------------- Dashboard -------------------------------- */

function JuryDashboard() {
  const [data, setData] = useState<JuryState | null>(null);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [openSub, setOpenSub] = useState<number | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/jury/state", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      /* keep old data */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  const task = useMemo(() => {
    if (!data) return null;
    const id = selectedTask ?? data.activeTaskId ?? data.tasks[0]?.id ?? null;
    return data.tasks.find((t) => t.id === id) ?? null;
  }, [data, selectedTask]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-void">
        <Loader2 className="animate-spin text-cyan" size={32} />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <header className="sticky top-0 z-20 border-b border-line/60 bg-void/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-xl border border-mint/40 bg-panel2 p-2">
              <Scale size={20} className="text-mint" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-widest text-white">
                JURY PANEL
              </div>
              <div className="text-[11px] text-slate-500">{data.me.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="mint">
              {data.stats.myEvaluations}/{data.stats.submissions} գնահատված
            </Badge>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-panel2/60 hover:text-white"
            >
              <House size={14} /> Գլխավոր
            </Link>
            <Btn variant="ghost" size="sm" onClick={logout}>
              <LogOut size={14} /> Ելք
            </Btn>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr]">
        {/* Task list */}
        <div className="space-y-3">
          <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">
            Առաջադրանքներ
          </h3>
          {data.tasks.map((t) => {
            const Icon = TYPE_ICONS[t.type] ?? Zap;
            const evaluated = t.submissions.filter(
              (s) => s.myEvaluation,
            ).length;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTask(t.id);
                  setOpenSub(null);
                }}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all cursor-pointer",
                  task?.id === t.id
                    ? "border-cyan/50 bg-cyan/10"
                    : "border-line bg-panel2/50 hover:border-azure/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={15}
                    style={{ color: TASK_TYPES[t.type]?.color }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {t.stageName}
                  </span>
                  {t.isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-mint animate-blink" />
                  )}
                </div>
                <div className="mt-1.5 text-sm font-bold text-white">
                  {t.title}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <Inbox size={12} />
                  {t.submissions.length} պատասխան
                  {!t.autoGrade && t.submissions.length > 0 && (
                    <span
                      className={cn(
                        "ml-auto",
                        evaluated === t.submissions.length
                          ? "text-mint"
                          : "text-amber",
                      )}
                    >
                      {evaluated}/{t.submissions.length} գնահատված
                    </span>
                  )}
                  {t.autoGrade && (
                    <span className="ml-auto text-cyan">ավտոմատ</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Task detail */}
        <div>
          {!task ? (
            <Panel className="grid place-items-center gap-3 p-16 text-center text-slate-500">
              <Inbox size={40} />
              Առաջադրանքներ դեռ չկան
            </Panel>
          ) : (
            <div className="space-y-4">
              <Panel className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color="slate">{task.stageName}</Badge>
                  <Badge color="amber" className="font-display">
                    առավել. {task.maxScore}
                  </Badge>
                  {task.isActive && <Badge color="mint">Ակտիվ</Badge>}
                </div>
                <h2 className="mt-3 text-xl font-black text-white">
                  {task.title}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                  {task.description}
                </p>
                {task.answerFormat === "choice" && task.options.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {task.options.map((o) => (
                      <div
                        key={o.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs",
                          o.isCorrect
                            ? "border-mint/40 bg-mint/10 text-mint"
                            : "border-line bg-panel2/50 text-slate-400",
                        )}
                      >
                        {o.isCorrect ? "✓ " : ""}
                        {o.text}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {task.submissions.length === 0 ? (
                <Panel className="grid place-items-center gap-3 p-14 text-center">
                  <Inbox size={36} className="text-slate-600" />
                  <p className="text-sm text-slate-500">
                    Դեռ պատասխաններ չկան․ սպասեք թիմերին
                  </p>
                </Panel>
              ) : (
                task.submissions.map((s, i) => (
                  <SubmissionCard
                    key={s.id}
                    sub={s}
                    index={i}
                    task={task}
                    open={openSub === s.id}
                    onToggle={() => setOpenSub(openSub === s.id ? null : s.id)}
                    onSaved={refresh}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------ Submission card ----------------------------- */

function SubmissionCard({
  sub,
  index,
  task,
  open,
  onToggle,
  onSaved,
}: {
  sub: Submission;
  index: number;
  task: JuryTask;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const avg = sub.evaluations.length
    ? Math.round(
        sub.evaluations.reduce((a, e) => a + e.totalScore, 0) /
          sub.evaluations.length,
      )
    : null;

  return (
    <Panel
      className={cn(
        "overflow-hidden transition-all",
        sub.myEvaluation && "border-mint/30",
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left cursor-pointer"
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border font-display text-sm font-bold"
          style={{
            borderColor: `${sub.schoolColor}55`,
            color: sub.schoolColor,
            background: `${sub.schoolColor}14`,
          }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-white">{sub.teamName}</div>
          <div className="text-xs" style={{ color: sub.schoolColor }}>
            {sub.schoolName}
          </div>
        </div>
        {sub.autoScore !== null && (
          <Badge color="cyan" className="font-display">
            ավտո՝ {sub.autoScore}
          </Badge>
        )}
        {avg !== null && (
          <Badge color="violet" className="font-display">
            միջ. {avg}
          </Badge>
        )}
        {sub.myEvaluation ? (
          <Badge color="mint">
            <CheckCircle2 size={12} /> Գնահատված՝ {sub.myEvaluation.totalScore}
          </Badge>
        ) : (
          !task.autoGrade && <Badge color="amber">Սպասում է գնահատման</Badge>
        )}
      </button>

      {open && (
        <div className="border-t border-line/60 p-5 animate-pop">
          {/* Answer */}
          <div className="rounded-xl border border-line bg-abyss/60 p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Թիմի պատասխանը
            </div>
            {sub.selectedOptions.length > 0 && (
              <ul className="space-y-1 text-sm">
                {task.options
                  .filter((o) => sub.selectedOptions.includes(o.id))
                  .map((o) => (
                    <li
                      key={o.id}
                      className={cn(
                        "flex items-center gap-2",
                        o.isCorrect ? "text-mint" : "text-danger",
                      )}
                    >
                      {o.isCorrect ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}{" "}
                      {o.text}
                    </li>
                  ))}
              </ul>
            )}
            {sub.linkUrl && (
              <a
                href={sub.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 break-all text-sm text-cyan hover:underline"
              >
                <Link2 size={14} /> {sub.linkUrl}
              </a>
            )}
            {sub.textAnswer && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {sub.textAnswer}
              </p>
            )}
            {!sub.textAnswer &&
              !sub.linkUrl &&
              sub.selectedOptions.length === 0 && (
                <p className="text-sm text-slate-500">Դատարկ պատասխան</p>
              )}
          </div>

          {task.autoGrade ? (
            <div className="mt-4 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm text-cyan">
              Այս առաջադրանքը գնահատվել է ավտոմատ՝{" "}
              <b className="font-display">{sub.autoScore ?? 0}</b> /{" "}
              {task.maxScore} միավոր
            </div>
          ) : (
            <EvaluationForm sub={sub} task={task} onSaved={onSaved} />
          )}

          {/* Other jury evaluations */}
          {sub.evaluations.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Գնահատականներ
              </div>
              {sub.evaluations.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 rounded-lg border border-line bg-panel2/40 px-4 py-2.5 text-sm"
                >
                  <UserRound size={15} className="mt-0.5 text-violet" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-200">
                      {e.juryName}
                    </span>
                    {e.comment && (
                      <span className="ml-2 text-xs text-slate-500">
                        «{e.comment}»
                      </span>
                    )}
                  </div>
                  <span className="font-display font-bold text-white">
                    {e.totalScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------ Evaluation form ----------------------------- */

function EvaluationForm({
  sub,
  task,
  onSaved,
}: {
  sub: Submission;
  task: JuryTask;
  onSaved: () => void;
}) {
  const [scores, setScores] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const c of task.criteria) {
      initial[c.id] = sub.myEvaluation?.criteriaScores?.[String(c.id)] ?? 0;
    }
    return initial;
  });
  const [comment, setComment] = useState(sub.myEvaluation?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const total = task.criteria.reduce((a, c) => a + (scores[c.id] ?? 0), 0);
  const maxTotal = task.criteria.reduce((a, c) => a + c.maxPoints, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/jury/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: sub.id,
          criteriaScores: scores,
          comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Սխալ");
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onSaved();
      }
    } catch {
      setError("Կապի խնդիր");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Գնահատում ըստ չափանիշների
      </div>
      {task.criteria.map((c) => {
        const value = scores[c.id] ?? 0;
        return (
          <div
            key={c.id}
            className="rounded-xl border border-line bg-panel2/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-200">
                {c.name}
              </span>
              <span className="font-display text-lg font-bold text-white">
                {value}
                <span className="text-xs text-slate-500">/{c.maxPoints}</span>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={c.maxPoints}
                value={value}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-abyss accent-cyan"
              />
              <Input
                type="number"
                min={0}
                max={c.maxPoints}
                value={value}
                onChange={(e) =>
                  setScores((s) => ({
                    ...s,
                    [c.id]: Math.max(
                      0,
                      Math.min(c.maxPoints, Number(e.target.value) || 0),
                    ),
                  }))
                }
                className="w-20 px-2 py-1.5 text-center font-display"
              />
            </div>
          </div>
        );
      })}

      <div className="relative">
        <MessageSquare
          size={15}
          className="absolute left-4 top-4 text-slate-500"
        />
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Մեկնաբանություն թիմին (ոչ պարտադիր)…"
          rows={2}
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-cyan/30 bg-cyan/5 px-5 py-4">
        <span className="text-sm font-semibold text-slate-300">Ընդամենը</span>
        <span className="font-display text-2xl font-black text-cyan">
          {total}
          <span className="text-sm text-slate-500">
            {" "}
            / {Math.min(maxTotal, task.maxScore)}
          </span>
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <Btn
        type="submit"
        size="lg"
        className="w-full"
        disabled={busy}
        variant={saved ? "success" : "primary"}
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : saved ? (
          <CheckCircle2 size={18} />
        ) : (
          <Send size={18} />
        )}
        {saved
          ? "Պահպանված է"
          : sub.myEvaluation
            ? "Թարմացնել գնահատականը"
            : "Պահպանել գնահատականը"}
      </Btn>
    </form>
  );
}
