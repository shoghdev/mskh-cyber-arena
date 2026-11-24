import Link from "next/link";
import { MonitorPlay, Users, Scale, SlidersHorizontal, ArrowUpRight, Radar, Lock, Bug, Trophy, TerminalSquare } from "lucide-react";
import { Brand, Backdrop } from "@/components/ui";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { getActiveTournament } from "@/lib/state";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PORTALS = [
  {
    href: "/arena",
    icon: MonitorPlay,
    title: "Arena Display",
    hy: "Մեծ էկրան",
    desc: "Մրցույթի ընթացքը, առաջադրանքները, ժամաչափը և արդյունքները՝ պրոյեկտորի համար",
    color: "cyan",
    border: "hover:border-cyan/60",
    glow: "group-hover:shadow-[0_0_60px_rgba(34,211,238,0.25)]",
    iconBg: "bg-cyan/10 text-cyan border-cyan/30",
  },
  {
    href: "/team",
    icon: Users,
    title: "Team Portal",
    hy: "Թիմերի միջավայր",
    desc: "Մուտք թիմային կոդով, առաջադրանքների դիտում և պատասխանների ներկայացում",
    color: "violet",
    border: "hover:border-violet/60",
    glow: "group-hover:shadow-[0_0_60px_rgba(167,139,250,0.25)]",
    iconBg: "bg-violet/10 text-violet border-violet/30",
  },
  {
    href: "/jury",
    icon: Scale,
    title: "Jury Panel",
    hy: "Ժյուրիի վահանակ",
    desc: "Աշխատանքների դիտում, չափանիշներով գնահատում և մեկնաբանություններ",
    color: "mint",
    border: "hover:border-mint/60",
    glow: "group-hover:shadow-[0_0_60px_rgba(52,211,153,0.25)]",
    iconBg: "bg-mint/10 text-mint border-mint/30",
  },
  {
    href: "/admin",
    icon: SlidersHorizontal,
    title: "Admin Panel",
    hy: "Կազմակերպիչ",
    desc: "Մրցույթի, թիմերի, առաջադրանքների և գնահատման ամբողջական կառավարում",
    color: "amber",
    border: "hover:border-amber/60",
    glow: "group-hover:shadow-[0_0_60px_rgba(251,191,36,0.25)]",
    iconBg: "bg-amber/10 text-amber border-amber/30",
  },
];

const STATUS_HY: Record<string, { label: string; cls: string }> = {
  draft: { label: "Նախապատրաստվում է", cls: "text-slate-400 border-line bg-panel2/60" },
  ready: { label: "Պատրաստ է մեկնարկին", cls: "text-azure border-azure/40 bg-azure/10" },
  live: { label: "ԸՆԹԱՑՔՈՒՄ Է", cls: "text-mint border-mint/40 bg-mint/10" },
  paused: { label: "Դադարեցված է", cls: "text-amber border-amber/40 bg-amber/10" },
  finished: { label: "Ավարտված է", cls: "text-violet border-violet/40 bg-violet/10" },
};

export default async function HomePage() {
  const [tournament, schoolRows] = await Promise.all([
    getActiveTournament(),
    db.select().from(schools).orderBy(asc(schools.id)),
  ]);
  const status = STATUS_HY[tournament?.status ?? "draft"] ?? STATUS_HY.draft;

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Brand />
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wider ${status.cls}`}>
            {tournament?.status === "live" && <span className="h-2 w-2 rounded-full bg-mint animate-blink" />}
            {status.label}
          </span>
        </header>

        <section className="mt-14 flex flex-1 flex-col items-center text-center md:mt-20">
          <div className="relative mb-8 hidden md:block">
            <Radar className="absolute -left-40 top-2 text-cyan/25 animate-float" size={44} />
            <Lock className="absolute -right-40 -top-6 text-violet/25 animate-float" size={40} style={{ animationDelay: "1.2s" }} />
            <Bug className="absolute -right-56 top-24 text-rose/20 animate-float" size={36} style={{ animationDelay: "2.1s" }} />
            <TerminalSquare className="absolute -left-56 top-28 text-azure/20 animate-float" size={38} style={{ animationDelay: "0.6s" }} />
            <Trophy className="absolute left-1/2 -top-16 -translate-x-1/2 text-amber/25 animate-float" size={34} style={{ animationDelay: "1.8s" }} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-cyan">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-blink" />
            «ԿԻԲԵՐՊԱՇՏՊԱՆՆԵՐ» ԿՐԹԱԿԱՆ ՆԱԽԱԳԻԾ
          </div>

          <h1 className="mt-6 font-display text-4xl font-black leading-tight tracking-wide text-white md:text-6xl">
            MSKH <span className="shimmer-text">CYBER ARENA</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
            {tournament?.description ||
              "Կիբեռանվտանգության ուսումնական մրցույթ 4–6-րդ դասարանների սովորողների համար՝ սովորող-սովորեցնող մեթոդով։"}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {schoolRows.map((s) => (
              <span
                key={s.id}
                className="rounded-full border px-4 py-1.5 text-xs font-semibold"
                style={{ borderColor: `${s.color}55`, color: s.color, background: `${s.color}14` }}
              >
                {s.name}
              </span>
            ))}
          </div>

          <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group panel-glass rounded-2xl border border-line p-6 text-left transition-all duration-300 hover:-translate-y-1.5 ${p.border} ${p.glow}`}
              >
                <div className={`inline-flex rounded-xl border p-3 ${p.iconBg}`}>
                  <p.icon size={26} strokeWidth={1.7} />
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold tracking-widest text-white">{p.title}</h2>
                  <ArrowUpRight size={18} className="text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-300">{p.hy}</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{p.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-14 flex flex-col items-center gap-2 border-t border-line/60 pt-6 text-center">
          <p className="text-xs text-slate-500">
            «Մխիթար Սեբաստացի» կրթահամալիր • 4–6-րդ դասարաններ • Սովորող-սովորեցնող մեթոդ
          </p>
          <p className="font-display text-[10px] tracking-[0.4em] text-slate-600">CYBERSECURITY • GAMING • EDUCATION</p>
        </footer>
      </div>
    </main>
  );
}
