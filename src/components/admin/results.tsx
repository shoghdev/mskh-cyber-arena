"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, Download, Trophy, Loader2, Medal, Settings2 } from "lucide-react";
import { Badge, Btn, Field, Input, Panel, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { api, control, type OverviewData } from "./types";

type EvalTask = {
  id: number; title: string; stageName: string; maxScore: number; published: boolean;
  teams: { teamId: number; teamName: string; publishedScore: number | null }[];
};

export default function ResultsTab() {
  const [ov, setOv] = useState<OverviewData | null>(null);
  const [tasks, setTasks] = useState<EvalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [o, e] = await Promise.all([
      api<OverviewData>("/api/admin/overview"),
      api<{ tasks: EvalTask[] }>("/api/admin/evaluations"),
    ]);
    if (o.ok) setOv(o.data);
    if (e.ok) setTasks(e.data.tasks);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading || !ov) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  const stageNames = [...new Set(tasks.map((t) => t.stageName))];
  const maxTotal = tasks.filter((t) => t.published).reduce((a, t) => a + t.maxScore, 0);

  const rows = ov.leaderboard.map((r) => {
    const perStage: Record<string, number> = {};
    for (const stage of stageNames) {
      perStage[stage] = tasks
        .filter((t) => t.stageName === stage)
        .reduce((a, t) => a + (t.teams.find((x) => x.teamId === r.id)?.publishedScore ?? 0), 0);
    }
    return { ...r, perStage };
  });

  async function finish() {
    if (!window.confirm("Ավարտե՞լ մրցույթը և ցուցադրել հաղթողների էկրանը")) return;
    const res = await control("finish_tournament");
    setMsg(res.ok ? "" : res.error ?? "Սխալ");
    await load();
  }

  return (
    <div className="space-y-5 animate-pop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <BarChart3 size={20} className="text-amber" /> Վերջնական արդյունքներ
        </h2>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 size={15} /> Մրցույթի տվյալներ
          </Btn>
          <a href="/api/admin/export" download>
            <Btn variant="ghost"><Download size={15} /> Արտահանել CSV</Btn>
          </a>
          <Btn variant="warn" onClick={finish}>
            <Trophy size={15} /> Ավարտել և ցույց տալ հաղթողներին
          </Btn>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

      {showSettings && ov.tournament && (
        <TournamentSettings
          tournament={ov.tournament}
          onSaved={async () => { setShowSettings(false); await load(); }}
        />
      )}

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-4">Տեղ</th>
              <th className="px-5 py-3">Թիմ</th>
              <th className="px-5 py-3">Դպրոց</th>
              {stageNames.map((s) => <th key={s} className="px-4 py-3 text-center">{s}</th>)}
              <th className="px-5 py-3 text-right">Ընդամենը{maxTotal > 0 ? ` / ${maxTotal}` : ""}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-b border-line/40 transition hover:bg-panel2/40", r.rank === 1 && "bg-amber/5")}>
                <td className="px-5 py-3.5">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 font-display text-lg font-black",
                    r.rank === 1 ? "text-amber" : r.rank === 2 ? "text-slate-300" : r.rank === 3 ? "text-[#cd7f32]" : "text-slate-600",
                  )}>
                    {r.rank <= 3 && <Medal size={15} />}
                    {r.rank}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-bold text-white">{r.name}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: r.schoolColor }}>{r.school}</td>
                {stageNames.map((s) => (
                  <td key={s} className="px-4 py-3.5 text-center font-display text-slate-300">{r.perStage[s]}</td>
                ))}
                <td className="px-5 py-3.5 text-right font-display text-lg font-black text-white">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Տվյալներ չկան</p>}
      </Panel>

      <p className="text-xs text-slate-500">
        Աղյուսակում արտացոլված են միայն <Badge color="mint" className="mx-1">հրապարակված</Badge> միավորները։
        Հրապարակումը կատարվում է «Գնահատականներ» բաժնից՝ յուրաքանչյուր առաջադրանքի համար առանձին։
      </p>
    </div>
  );
}

function TournamentSettings({ tournament, onSaved }: {
  tournament: NonNullable<OverviewData["tournament"]>; onSaved: () => void;
}) {
  const [name, setName] = useState(tournament.name);
  const [date, setDate] = useState(tournament.date);
  const [description, setDescription] = useState(tournament.description);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await control("set_tournament_info", { name, date, description });
    setBusy(false);
    onSaved();
  }

  return (
    <Panel className="border-amber/30 p-6">
      <h3 className="font-bold text-white">Մրցույթի տվյալներ</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Անվանում"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Ամսաթիվ"><Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2025-06-01" /></Field>
        <div className="sm:col-span-2">
          <Field label="Նկարագրություն"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Btn type="submit" disabled={busy}>{busy ? "Պահպանվում…" : "Պահպանել"}</Btn>
        </div>
      </form>
    </Panel>
  );
}
