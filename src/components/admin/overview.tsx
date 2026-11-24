"use client";

import { useEffect, useState } from "react";
import {
  Users, Scale, ListChecks, Inbox, Gamepad2, Crown, History, Loader2,
} from "lucide-react";
import { Badge, Btn, Panel } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/utils";
import { api, type OverviewData } from "./types";

type LogRow = { id: number; actor: string; action: string; details: string; at: number };

export default function OverviewTab({ onGoControl }: { onGoControl: () => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    let stop = false;
    async function load() {
      const [o, l] = await Promise.all([
        api<OverviewData>("/api/admin/overview"),
        api<{ logs: LogRow[] }>("/api/admin/logs"),
      ]);
      if (!stop) {
        if (o.ok) setData(o.data);
        if (l.ok) setLogs(l.data.logs);
      }
    }
    load();
    const id = setInterval(load, 4000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  if (!data) return <Loading />;

  const statusLabel = STATUS_LABELS[data.tournament?.status ?? "draft"] ?? data.tournament?.status;
  const cards = [
    { icon: Users, label: "Թիմեր", value: data.stats.teams, color: "text-cyan" },
    { icon: ListChecks, label: "Առաջադրանքներ", value: data.stats.tasks, color: "text-violet" },
    { icon: Inbox, label: "Պատասխաններ", value: data.stats.submissions, color: "text-azure" },
    { icon: Scale, label: "Ժյուրիի անդամներ", value: data.stats.jury, color: "text-mint" },
  ];

  return (
    <div className="space-y-6 animate-pop">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">{data.tournament?.name ?? "Մրցույթ"}</h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
            <Badge color={data.tournament?.status === "live" ? "mint" : "slate"}>{statusLabel}</Badge>
            {data.tournament?.date && <span>{data.tournament.date}</span>}
          </div>
        </div>
        <Btn onClick={onGoControl} size="lg">
          <Gamepad2 size={18} /> Բացել կառավարման վահանակը
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Panel key={c.label} className="p-5">
            <c.icon size={22} className={c.color} />
            <div className="mt-3 font-display text-3xl font-black text-white">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <Crown size={16} className="text-amber" /> Առաջատարներ
          </h3>
          <div className="mt-4 space-y-2">
            {data.leaderboard.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-panel2/50 px-4 py-2.5">
                <span className="w-6 font-display font-bold text-amber">{r.rank}</span>
                <span className="flex-1 truncate text-sm font-semibold text-white">{r.name}</span>
                <span className="text-xs" style={{ color: r.schoolColor }}>{r.school}</span>
                <span className="font-display font-bold text-white">{r.total}</span>
              </div>
            ))}
            {data.leaderboard.length === 0 && <p className="text-sm text-slate-500">Թիմեր դեռ չկան</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <History size={16} className="text-azure" /> Վերջին գործողությունները
          </h3>
          <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {logs.slice(0, 20).map((l) => (
              <div key={l.id} className="flex items-baseline gap-3 rounded-lg bg-panel2/40 px-3 py-2 text-xs">
                <span className="shrink-0 font-display text-[10px] text-slate-600">
                  {new Date(l.at).toLocaleTimeString("hy-AM")}
                </span>
                <span className="font-semibold text-cyan">{l.actor}</span>
                <span className="text-slate-400">{l.action}</span>
                {l.details && <span className="truncate text-slate-500">{l.details}</span>}
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-slate-500">Գործողություններ դեռ չկան</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="animate-spin text-cyan" size={32} />
    </div>
  );
}

export { Loading };
