"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldHalf, LogOut, Users, KeyRound, Send, CheckCircle2, Hourglass,
  Trophy, Zap, FileVideo, Gamepad2, HelpCircle, Bug, ScrollText, Link2, AlertTriangle, Loader2,
} from "lucide-react";
import { Backdrop, Badge, Btn, Input, Panel, Textarea, TimerRing, usePoll, useRemainingMs, type TimerInfo } from "@/components/ui";
import { cn, formatMs, TASK_TYPES } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof FileVideo> = {
  video: FileVideo, quiz: HelpCircle, threat: Bug, game: Gamepad2, scenario: ScrollText,
};

type TeamState = {
  serverNow: number;
  team: { id: number; name: string; grade: string; members: string; school: string; schoolColor: string };
  tournament: { name: string; status: string; description: string } | null;
  screen: string;
  timer: TimerInfo;
  submissionsOpen: boolean;
  activeTask: {
    id: number; title: string; description: string; type: string; maxScore: number;
    durationSec: number; mediaUrl: string; answerFormat: string; multiSelect: boolean;
    stageName: string; options: { id: number; text: string }[];
  } | null;
  mySubmission: {
    id: number; submittedAt: number; textAnswer: string; linkUrl: string;
    selectedOptions: number[]; autoScore: number | null;
  } | null;
  myTaskScore: { score: number; maxScore: number } | null;
  stats: { total: number; rank: number; teamCount: number; answered: number; taskCount: number };
  leaderboard: { id: number; name: string; school: string; schoolColor: string; total: number; rank: number }[];
};

export default function TeamPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAuthed(j.session?.role === "team"))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-void">
        <Loader2 className="animate-spin text-cyan" size={32} />
      </main>
    );
  }
  return authed ? <TeamDashboard /> : <TeamLogin onSuccess={() => setAuthed(true)} />;
}

/* ---------------------------------- Login ---------------------------------- */

function TeamLogin({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Սխալ կոդ");
      } else {
        onSuccess();
      }
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
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-violet/30 blur-xl animate-pulse-ring" />
            <div className="relative grid place-items-center rounded-2xl border border-violet/40 bg-panel2 p-4">
              <Users size={36} className="text-violet" strokeWidth={1.6} />
            </div>
          </div>
          <h1 className="mt-6 font-display text-xl font-black tracking-widest text-white">TEAM PORTAL</h1>
          <p className="mt-2 text-sm text-slate-400">Մուտք գործեք ձեր թիմի կոդով</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="relative">
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ՕՐ․ EAST-K7P2"
              className="pl-11 py-3.5 text-center font-display text-lg tracking-[0.3em] uppercase"
              maxLength={20}
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger animate-pop">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          <Btn type="submit" size="lg" className="w-full" disabled={busy || code.length < 4}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            Մուտք գործել
          </Btn>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Կոդը տրվում է կազմակերպչի կողմից • Սխալ փորձերը սահմանափակված են
        </p>
      </Panel>
    </main>
  );
}

/* -------------------------------- Dashboard -------------------------------- */

function TeamDashboard() {
  const { data, error, refresh, offsetRef } = usePoll<TeamState>("/api/team/state", 2000);
  const ms = useRemainingMs(data?.timer, offsetRef);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-void">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-cyan" size={32} />
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </main>
    );
  }

  const task = data.activeTask;
  const canSubmit =
    !!task && data.submissionsOpen && data.timer.state !== "finished" && !data.mySubmission;

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <header className="sticky top-0 z-20 border-b border-line/60 bg-void/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-xl border border-cyan/40 bg-panel2 p-2">
              <ShieldHalf size={20} className="text-cyan" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{data.team.name}</div>
              <div className="text-[11px]" style={{ color: data.team.schoolColor }}>{data.team.school}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="amber" className="font-display">
              <Trophy size={12} /> {data.stats.total} միավոր
            </Badge>
            <Badge color="slate">Տեղ {data.stats.rank}/{data.stats.teamCount}</Badge>
            <Btn variant="ghost" size="sm" onClick={logout}>
              <LogOut size={14} />
              <span className="hidden sm:inline">Ելք</span>
            </Btn>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-20">
        {/* Status strip */}
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className={cn("h-2.5 w-2.5 rounded-full", data.timer.state === "running" ? "bg-mint animate-blink" : "bg-slate-600")} />
            <span className="text-sm font-semibold text-slate-300">
              {data.timer.state === "running"
                ? "Առաջադրանքն ընթացքում է"
                : data.screen === "winners"
                  ? "Մրցույթն ավարտված է"
                  : "Սպասում ենք կազմակերպչին"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Hourglass size={16} className="text-cyan" />
            <span className={cn("font-display text-xl font-bold tabular-nums", ms <= 30000 && ms > 0 ? "text-danger" : "text-white")}>
              {formatMs(ms)}
            </span>
            <span className="text-xs text-slate-500">մնացած ժամանակ</span>
          </div>
        </Panel>

        {/* Active task */}
        {task ? (
          <Panel className="overflow-hidden">
            <div className="border-b border-line/60 bg-panel2/40 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const Icon = TYPE_ICONS[task.type] ?? Zap;
                  const meta = TASK_TYPES[task.type];
                  return (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold"
                      style={{ borderColor: `${meta?.color ?? "#22d3ee"}55`, color: meta?.color ?? "#22d3ee", background: `${meta?.color ?? "#22d3ee"}14` }}
                    >
                      <Icon size={14} />
                      {meta?.label ?? task.type}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-500">Փուլ․ {task.stageName}</span>
                <span className="ml-auto">
                  <Badge color="amber" className="font-display">{task.maxScore} միավոր</Badge>
                </span>
              </div>
              <h2 className="mt-3 text-xl font-black text-white md:text-2xl">{task.title}</h2>
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_240px]">
              <div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{task.description}</p>
                {task.mediaUrl && (
                  <a href={task.mediaUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan hover:underline">
                    <Link2 size={14} /> Կցված նյութ
                  </a>
                )}

                <div className="mt-6">
                  {data.mySubmission ? (
                    <SubmittedView data={data} />
                  ) : canSubmit ? (
                    <SubmitForm task={task} onDone={() => refresh()} />
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel2/50 px-5 py-4 text-sm text-slate-400">
                      <Hourglass size={18} className="text-slate-500" />
                      {data.timer.state === "finished"
                        ? "Ժամանակը լրացավ․ պատասխաններն այլևս չեն ընդունվում"
                        : data.submissionsOpen
                          ? "Պատրաստվեք պատասխանելու…"
                          : "Պատասխանների ընդունումը դեռ բացված չէ․ սպասեք կազմակերպչի ազդանշանին"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-abyss/60 p-5">
                <TimerRing ms={ms} durationSec={data.timer.durationSec || task.durationSec} size={170} />
                <span className="text-[11px] uppercase tracking-widest text-slate-500">
                  {data.timer.state === "paused" ? "Դադարեցված" : data.timer.state === "running" ? "Ընթացքում" : data.timer.state === "finished" ? "Ավարտված" : "Սպասում"}
                </span>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel className="grid place-items-center gap-4 p-14 text-center">
            <Hourglass size={48} className="text-cyan/60 animate-float" />
            <h2 className="text-lg font-bold text-white">Սպասեք հաջորդ առաջադրանքին</h2>
            <p className="max-w-md text-sm text-slate-400">
              Կազմակերպիչը կհրապարակի առաջադրանքը, և այն միանգամից կհայտնվի այստեղ։ Հետևեք մեծ էկրանին։
            </p>
          </Panel>
        )}

        {/* Progress + leaderboard */}
        <div className="grid gap-6 md:grid-cols-2">
          <Panel className="p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
              <Zap size={16} className="text-cyan" /> Ձեր առաջընթացը
            </h3>
            <div className="mt-4 flex items-end justify-between">
              <span className="font-display text-4xl font-black text-white">{data.stats.total}</span>
              <span className="text-xs text-slate-500">
                {data.stats.answered}/{data.stats.taskCount} առաջադրանք
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-abyss">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-700"
                style={{ width: `${data.stats.taskCount ? (data.stats.answered / data.stats.taskCount) * 100 : 0}%` }}
              />
            </div>
            {data.team.members && (
              <p className="mt-4 text-xs text-slate-500">
                <span className="text-slate-400">Անդամներ՝</span> {data.team.members}
                {data.team.grade ? ` • ${data.team.grade} դասարան` : ""}
              </p>
            )}
          </Panel>

          <Panel className="p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
              <Trophy size={16} className="text-amber" /> Արդյունքներ
            </h3>
            <div className="mt-4 space-y-2">
              {data.leaderboard.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2",
                    r.id === data.team.id ? "border border-cyan/40 bg-cyan/10" : "bg-panel2/40",
                  )}
                >
                  <span className={cn("w-6 font-display font-bold", r.rank <= 3 ? "text-amber" : "text-slate-500")}>{r.rank}</span>
                  <span className="flex-1 truncate text-sm text-slate-200">{r.name}</span>
                  <span className="font-display text-sm font-bold text-white">{r.total}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------ Submitted view ------------------------------ */

function SubmittedView({ data }: { data: TeamState }) {
  const sub = data.mySubmission!;
  const task = data.activeTask!;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-mint/40 bg-mint/10 px-5 py-4 animate-pop">
        <CheckCircle2 size={22} className="shrink-0 text-mint" />
        <div>
          <div className="font-bold text-mint">Ձեր պատասխանը հաջողությամբ ներկայացվել է</div>
          <div className="text-xs text-mint/70">
            {new Date(sub.submittedAt).toLocaleTimeString("hy-AM")} • Փոփոխելն այլևս հնարավոր չէ
          </div>
        </div>
      </div>
      {sub.autoScore !== null && (
        <div className="rounded-xl border border-cyan/40 bg-cyan/10 px-5 py-4">
          <span className="text-sm text-cyan">Ավտոմատ գնահատական՝ </span>
          <span className="font-display text-2xl font-black text-white">{sub.autoScore}</span>
          <span className="text-sm text-slate-400"> / {task.maxScore}</span>
        </div>
      )}
      {data.myTaskScore && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 px-5 py-4">
          <span className="text-sm text-amber">Հրապարակված գնահատական՝ </span>
          <span className="font-display text-2xl font-black text-white">{data.myTaskScore.score}</span>
          <span className="text-sm text-slate-400"> / {data.myTaskScore.maxScore}</span>
        </div>
      )}
      <div className="rounded-xl border border-line bg-panel2/50 p-5 text-sm">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ձեր պատասխանը</div>
        {sub.selectedOptions.length > 0 && (
          <ul className="space-y-1">
            {task.options.filter((o) => sub.selectedOptions.includes(o.id)).map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 size={14} className="text-cyan" /> {o.text}
              </li>
            ))}
          </ul>
        )}
        {sub.linkUrl && (
          <a href={sub.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-cyan hover:underline break-all">
            <Link2 size={14} /> {sub.linkUrl}
          </a>
        )}
        {sub.textAnswer && <p className="whitespace-pre-wrap text-slate-300">{sub.textAnswer}</p>}
      </div>
    </div>
  );
}

/* ------------------------------- Submit form -------------------------------- */

function SubmitForm({ task, onDone }: { task: NonNullable<TeamState["activeTask"]>; onDone: () => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleOption(id: number) {
    if (task.multiSelect) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelected([id]);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/team/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          selectedOptions: selected,
          textAnswer: text,
          linkUrl: link,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Սխալ");
      } else {
        onDone();
      }
    } catch {
      setError("Կապի խնդիր․ փորձեք կրկին");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {task.answerFormat === "choice" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {task.multiSelect ? "Ընտրեք բոլոր ճիշտ տարբերակները" : "Ընտրեք ճիշտ տարբերակը"}
          </p>
          {task.options.map((o, i) => (
            <button
              type="button"
              key={o.id}
              onClick={() => toggleOption(o.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left transition-all cursor-pointer",
                selected.includes(o.id)
                  ? "border-cyan/60 bg-cyan/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                  : "border-line bg-panel2/50 hover:border-azure/40",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold",
                  selected.includes(o.id) ? "bg-cyan text-void" : "bg-abyss text-cyan",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-slate-200">{o.text}</span>
            </button>
          ))}
        </div>
      )}

      {task.answerFormat === "link" && (
        <div className="space-y-3">
          <div className="relative">
            <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://… (տեսանյութի կամ խաղի հղումը)"
              className="pl-10 py-3"
              type="url"
            />
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Լրացուցիչ նշում (ոչ պարտադիր)․ օրինակ՝ ինչ կանոնն եք բացատրում"
            rows={2}
          />
        </div>
      )}

      {task.answerFormat === "text" && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Գրեք ձեր թիմի մանրամասն պատասխանն ու հիմնավորումը այստեղ…"
          rows={6}
          className="text-base"
        />
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger animate-pop">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <Btn type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        Ուղարկել վերջնական պատասխանը
      </Btn>
      <p className="text-center text-xs text-slate-500">
        Ուշադրություն․ ուղարկելուց հետո պատասխանը փոխել հնարավոր չէ
      </p>
    </form>
  );
}
