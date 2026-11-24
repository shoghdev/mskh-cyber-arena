"use client";

import { useMemo } from "react";
import {
  Trophy, Hourglass, Scale, Coffee, Medal, Flag, Zap, ShieldHalf,
  MonitorPlay, CheckCircle2, FileVideo, Gamepad2, HelpCircle, Bug, ScrollText,
} from "lucide-react";
import { Backdrop, LiveDot, TimerDigits, usePoll, useRemainingMs, type TimerInfo } from "@/components/ui";
import { cn, formatMs, TASK_TYPES } from "@/lib/utils";

type ArenaState = {
  serverNow: number;
  tournament: { name: string; description: string; date: string; status: string } | null;
  screen: string;
  timer: TimerInfoLike;
  submissionsOpen: boolean;
  activeTask: {
    id: number; title: string; description: string; type: string; maxScore: number;
    durationSec: number; mediaUrl: string; answerFormat: string; stageName: string;
    options: { id: number; text: string }[];
    criteria: { id: number; name: string; maxPoints: number }[];
  } | null;
  taskIndex: { current: number; total: number } | null;
  submissionStats: { submitted: number; total: number } | null;
  schools: { id: number; name: string; color: string; shortCode: string }[];
  leaderboard: {
    id: number; name: string; school: string; schoolColor: string; grade: string;
    total: number; rank: number; perStage: Record<number, { score: number; max: number }>;
  }[];
  stageList: { id: number; name: string; order: number }[];
};

type TimerInfoLike = TimerInfo;

const TYPE_ICONS: Record<string, typeof FileVideo> = {
  video: FileVideo,
  quiz: HelpCircle,
  threat: Bug,
  game: Gamepad2,
  scenario: ScrollText,
};

export default function ArenaPage() {
  const { data, offsetRef } = usePoll<ArenaState>("/api/arena/state", 1200);
  const ms = useRemainingMs(data?.timer, offsetRef);
  return <ArenaInner data={data} ms={ms} />;
}

function ArenaInner({ data, ms }: { data: ArenaState | null; ms: number }) {
  const screen = data?.screen ?? "lobby";

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-void">
      <Backdrop />
      <Scanline />
      <header className="relative z-10 flex items-center justify-between px-10 pt-6">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center rounded-2xl border border-cyan/40 bg-panel2/70 p-2.5 panel-glow">
            <ShieldHalf size={30} className="text-cyan" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-[0.25em] text-white">
              MSKH <span className="text-cyan">CYBER ARENA</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-azure/60">«Կիբեռպաշտպաններ» մրցույթ</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {data?.tournament?.status === "live" && <LiveDot label="ՈՒՂԻՂ" />}
          {data?.taskIndex && (
            <span className="rounded-full border border-line bg-panel2/70 px-4 py-1.5 font-display text-sm font-bold tracking-widest text-slate-300">
              ԱՌԱՋԱԴՐԱՆՔ {data.taskIndex.current}/{data.taskIndex.total}
            </span>
          )}
        </div>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-10 pb-24">
        {!data && <LoadingMsg />}
        {data && screen === "lobby" && <LobbyScreen data={data} />}
        {data && screen === "task_intro" && <TaskIntro data={data} />}
        {data && screen === "task_live" && <TaskLive data={data} ms={ms} />}
        {data && screen === "time_up" && <TimeUp />}
        {data && screen === "submissions_closed" && <SubmissionsClosed />}
        {data && screen === "judging" && <Judging />}
        {data && screen === "leaderboard" && <LeaderboardScreen data={data} />}
        {data && screen === "break" && <BreakScreen />}
        {data && screen === "winners" && <WinnersScreen data={data} />}
      </section>

      <footer className="absolute inset-x-0 bottom-0 z-10">
        <div className="flex h-1.5">
          {(data?.schools ?? []).map((s) => (
            <div key={s.id} className="flex-1" style={{ background: s.color }} />
          ))}
        </div>
        <div className="flex items-center justify-between bg-abyss/80 px-10 py-3 text-[11px] tracking-widest text-slate-500 backdrop-blur">
          <span>ՄԽԻԹԱՐ ՍԵԲԱՍՏԱՑԻ ԿՐԹԱՀԱՄԱԼԻՐ</span>
          <span className="font-display">CYBERSECURITY • GAMING • EDUCATION</span>
          <span>{data?.tournament?.date ?? ""}</span>
        </div>
      </footer>
    </main>
  );
}

function Scanline() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 animate-scanline bg-gradient-to-b from-transparent via-cyan/[0.04] to-transparent" />
  );
}

function LoadingMsg() {
  return <div className="animate-pulse text-slate-500">Բեռնվում է…</div>;
}

/* --------------------------------- Screens -------------------------------- */

function LobbyScreen({ data }: { data: ArenaState }) {
  return (
    <div className="flex w-full max-w-6xl flex-col items-center text-center">
      <div className="relative mb-10">
        <div className="absolute inset-0 scale-150 rounded-full bg-cyan/10 blur-3xl" />
        <ShieldHalf size={110} className="relative text-cyan animate-float" strokeWidth={1.2} />
      </div>
      <h1 className="font-display text-[4.2vw] font-black leading-none tracking-wide text-white glow-cyan">
        MSKH CYBER ARENA
      </h1>
      <p className="mt-6 text-[1.5vw] font-semibold text-violet glow-violet">«Կիբեռպաշտպաններ»</p>
      <p className="mt-4 max-w-3xl text-[1vw] leading-relaxed text-slate-400">
        Կիբեռանվտանգության ուսումնական մրցույթ 4–6-րդ դասարանների համար
      </p>
      <div className="mt-12 grid w-full grid-cols-4 gap-4">
        {data.schools.map((s, i) => (
          <div
            key={s.id}
            className="panel-glass rounded-2xl p-5 animate-rise"
            style={{ animationDelay: `${i * 0.15}s`, borderColor: `${s.color}44` }}
          >
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full" style={{ background: s.color }} />
            <div className="text-[1vw] font-bold" style={{ color: s.color }}>{s.name}</div>
          </div>
        ))}
      </div>
      <div className="mt-12 inline-flex items-center gap-3 rounded-full border border-cyan/30 bg-cyan/5 px-8 py-3 text-[1vw] font-semibold text-cyan">
        <Hourglass size={20} className="animate-spin-slow" />
        Սպասեք մրցույթի մեկնարկին
      </div>
    </div>
  );
}

function TaskHeader({ data }: { data: ArenaState }) {
  const task = data.activeTask;
  if (!task) return null;
  const typeMeta = TASK_TYPES[task.type];
  const Icon = TYPE_ICONS[task.type] ?? Zap;
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-[0.9vw] font-bold"
        style={{ borderColor: `${typeMeta?.color ?? "#22d3ee"}55`, color: typeMeta?.color ?? "#22d3ee", background: `${typeMeta?.color ?? "#22d3ee"}14` }}
      >
        <Icon size={18} />
        {typeMeta?.label ?? task.type}
      </span>
      <span className="rounded-full border border-line bg-panel2/70 px-5 py-2 text-[0.9vw] font-semibold text-slate-300">
        Փուլ․ {task.stageName}
      </span>
      <span className="rounded-full border border-amber/40 bg-amber/10 px-5 py-2 text-[0.9vw] font-bold text-amber">
        Առավել. {task.maxScore} միավոր
      </span>
    </div>
  );
}

function TaskIntro({ data }: { data: ArenaState }) {
  const task = data.activeTask;
  if (!task) return <SubmissionsClosed label="Սպասեք առաջադրանքին" />;
  return (
    <div className="flex w-full max-w-6xl flex-col items-center text-center animate-pop">
      <TaskHeader data={data} />
      <h2 className="mt-8 font-display text-[3vw] font-black leading-tight text-white glow-cyan">{task.title}</h2>
      <p className="mt-6 max-w-4xl whitespace-pre-wrap text-[1.15vw] leading-relaxed text-slate-300">{task.description}</p>
      {task.answerFormat === "choice" && task.options.length > 0 && (
        <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-4">
          {task.options.map((o, i) => (
            <div key={o.id} className="panel-glass rounded-xl p-5 text-left animate-rise" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="mr-3 font-display text-lg font-bold text-cyan">{String.fromCharCode(65 + i)}.</span>
              <span className="text-[1.05vw] text-slate-200">{o.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 flex items-center gap-6 text-[1vw] text-slate-400">
        <span className="inline-flex items-center gap-2">
          <Hourglass size={18} className="text-cyan" />
          Ժամանակը՝ <span className="font-display font-bold text-white">{formatMs(task.durationSec * 1000)}</span>
        </span>
        <span className="inline-flex items-center gap-2 text-amber">
          <Zap size={18} />
          Պատրաստ եղեք․ մեկնարկը մոտ է
        </span>
      </div>
    </div>
  );
}

function TaskLive({ data, ms }: { data: ArenaState; ms: number }) {
  const task = data.activeTask;
  const stats = data.submissionStats;
  const total = Math.max(1, (data.timer.durationSec || task?.durationSec || 1) * 1000);
  const ratio = Math.max(0, Math.min(1, ms / total));
  const danger = ratio <= 0.2;
  if (!task) return null;
  return (
    <div className="grid w-full max-w-7xl grid-cols-[1.35fr_1fr] items-center gap-12">
      <div className="animate-pop">
        <TaskHeader data={data} />
        <h2 className="mt-6 font-display text-[2.1vw] font-black leading-tight text-white">{task.title}</h2>
        <p className="mt-4 max-h-[38vh] overflow-hidden whitespace-pre-wrap text-[1vw] leading-relaxed text-slate-300">
          {task.description}
        </p>
        {task.answerFormat === "choice" && task.options.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {task.options.map((o, i) => (
              <div key={o.id} className="rounded-xl border border-line bg-panel2/60 p-4 text-left">
                <span className="mr-2 font-display font-bold text-cyan">{String.fromCharCode(65 + i)}.</span>
                <span className="text-[0.95vw] text-slate-200">{o.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center">
        <div className={cn("relative grid place-items-center rounded-full p-8", danger && "animate-ticker")}>
          <div className={cn("absolute inset-0 rounded-full blur-3xl", danger ? "bg-danger/15" : "bg-cyan/10")} />
          <TimerDigits ms={ms} className="relative text-[5.5vw] leading-none glow-cyan" />
        </div>
        <div className="mt-4 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-panel2">
          <div
            className={cn("h-full rounded-full transition-[width] duration-200", danger ? "bg-danger" : "bg-gradient-to-r from-cyan to-azure")}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="mt-8 w-full max-w-md panel-glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-[0.95vw]">
            <span className="inline-flex items-center gap-2 text-slate-400">
              <CheckCircle2 size={18} className="text-mint" />
              Պատասխաններ
            </span>
            <span className="font-display text-xl font-bold text-white">
              {stats?.submitted ?? 0}<span className="text-slate-500">/{stats?.total ?? 0}</span>
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-abyss">
            <div
              className="h-full rounded-full bg-mint transition-all duration-500"
              style={{ width: `${stats ? (stats.submitted / Math.max(1, stats.total)) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeUp() {
  return (
    <BigCentered
      icon={<Hourglass size={90} className="text-danger" strokeWidth={1.3} />}
      title="ԺԱՄԱՆԱԿԸ ԼՐԱՑԱՎ"
      subtitle="Պատասխանների ներկայացումն այլևս հնարավոր չէ"
      color="danger"
    />
  );
}

function SubmissionsClosed({ label }: { label?: string }) {
  return (
    <BigCentered
      icon={<CheckCircle2 size={90} className="text-mint" strokeWidth={1.3} />}
      title={label ?? "ՊԱՏԱՍԽԱՆՆԵՐՆ ԸՆԴՈՒՆՎԱԾ ԵՆ"}
      subtitle="Շնորհակալություն բոլոր թիմերին"
      color="mint"
    />
  );
}

function Judging() {
  return (
    <BigCentered
      icon={<Scale size={90} className="text-violet animate-float" strokeWidth={1.3} />}
      title="ԳՆԱՀԱՏՄԱՆ ԸՆԹԱՑՔ"
      subtitle="Ժյուրին քննարկում և գնահատում է թիմերի աշխատանքները"
      color="violet"
    />
  );
}

function BreakScreen() {
  return (
    <BigCentered
      icon={<Coffee size={90} className="text-amber animate-float" strokeWidth={1.3} />}
      title="ԸՆԴՄԻՋՈՒՄ"
      subtitle="Հարստացրեք ուժերը․ մրցույթը շուտով կշարունակվի"
      color="amber"
    />
  );
}

function BigCentered({ icon, title, subtitle, color }: { icon: React.ReactNode; title: string; subtitle: string; color: string }) {
  const glows: Record<string, string> = {
    danger: "text-danger",
    mint: "text-mint",
    violet: "text-violet",
    amber: "text-amber",
  };
  return (
    <div className="flex flex-col items-center text-center animate-pop">
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-current/10 blur-3xl opacity-20" />
        {icon}
      </div>
      <h2 className={cn("mt-8 font-display text-[3.6vw] font-black tracking-wide", glows[color] ?? "text-white")}>{title}</h2>
      <p className="mt-4 text-[1.2vw] text-slate-400">{subtitle}</p>
    </div>
  );
}

function LeaderboardScreen({ data }: { data: ArenaState }) {
  const rows = data.leaderboard;
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex items-center justify-center gap-4">
        <Flag size={30} className="text-cyan" />
        <h2 className="font-display text-[2.4vw] font-black tracking-widest text-white glow-cyan">ԸՆԹԱՑԻԿ ԱՐԴՅՈՒՆՔՆԵՐ</h2>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "panel-glass grid grid-cols-[64px_1fr_220px_110px] items-center gap-4 rounded-2xl px-6 py-4 animate-rise",
              i === 0 && r.total > 0 && "border-amber/50 shadow-[0_0_40px_rgba(251,191,36,0.15)]",
            )}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className={cn(
              "font-display text-3xl font-black",
              i === 0 ? "text-amber" : i === 1 ? "text-slate-300" : i === 2 ? "text-[#cd7f32]" : "text-slate-600",
            )}>
              {r.rank}
            </div>
            <div>
              <div className="text-[1.15vw] font-bold text-white">{r.name}</div>
              <div className="text-[0.8vw]" style={{ color: r.schoolColor }}>{r.school}</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-abyss">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(r.total / maxTotal) * 100}%`, background: `linear-gradient(90deg, ${r.schoolColor}88, ${r.schoolColor})` }}
              />
            </div>
            <div className="text-right font-display text-[1.6vw] font-bold text-white">{r.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Winners --------------------------------- */

function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function WinnersScreen({ data }: { data: ArenaState }) {
  const rows = data.leaderboard;
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean);
  const rest = rows.slice(3);
  const confetti = useMemo(() => {
    const rand = mulberry(42);
    const colors = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#38bdf8"];
    return Array.from({ length: 48 }, (_, i) => ({
      left: rand() * 100,
      delay: rand() * 6,
      duration: 5 + rand() * 5,
      color: colors[i % colors.length],
      size: 5 + rand() * 7,
    }));
  }, []);

  const heights = ["h-40", "h-56", "h-32"];
  const medals = ["text-slate-300", "text-amber", "text-[#cd7f32]"];
  const places = [2, 1, 3];

  return (
    <div className="relative w-full max-w-6xl text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute top-[-20px] rounded-sm opacity-70 animate-float"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 0.5,
              background: c.color,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">
        <Trophy size={72} className="mx-auto text-amber glow-amber animate-float" strokeWidth={1.3} />
        <h2 className="mt-4 font-display text-[3vw] font-black tracking-widest text-amber glow-amber">ՀԱՂԹՈՂՆԵՐ</h2>
        <p className="mt-2 text-[1.1vw] text-slate-400">Շնորհավորում ենք բոլոր մասնակիցներին</p>

        <div className="mt-10 flex items-end justify-center gap-6">
          {podium.map((r, i) => (
            <div key={r.id} className="flex w-56 flex-col items-center animate-rise" style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
              <Medal size={34} className={medals[i]} />
              <div className="mt-3 text-[1.15vw] font-black text-white">{r.name}</div>
              <div className="text-[0.85vw]" style={{ color: r.schoolColor }}>{r.school}</div>
              <div className="mt-1 font-display text-[1.5vw] font-bold text-white">{r.total} միավոր</div>
              <div
                className={cn("mt-4 w-full rounded-t-2xl border-x border-t border-line panel-glass grid place-items-start justify-center pt-4", heights[i])}
                style={{ boxShadow: `0 -10px 60px ${r.schoolColor}33` }}
              >
                <span className={cn("font-display text-5xl font-black", medals[i])}>{places[i]}</span>
              </div>
            </div>
          ))}
        </div>

        {rest.length > 0 && (
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-3 gap-3">
            {rest.map((r) => (
              <div key={r.id} className="panel-glass flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-[0.9vw] text-slate-300">
                  <span className="mr-2 font-display font-bold text-slate-500">{r.rank}</span>
                  {r.name}
                </span>
                <span className="font-display font-bold text-white">{r.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
