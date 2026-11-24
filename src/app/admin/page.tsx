"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  LayoutDashboard, Gamepad2, Users, ListChecks, Scale, Award, BarChart3,
  LogOut, Loader2, AlertTriangle, SlidersHorizontal, ShieldHalf,
} from "lucide-react";
import { Backdrop, Btn, Input, Panel } from "@/components/ui";
import { cn } from "@/lib/utils";
import OverviewTab from "@/components/admin/overview";
import ControlTab from "@/components/admin/control";
import TeamsTab from "@/components/admin/teams";
import TasksTab from "@/components/admin/tasks";
import JuryTab from "@/components/admin/jury";
import EvaluationsTab from "@/components/admin/evaluations";
import ResultsTab from "@/components/admin/results";

const TABS = [
  { id: "overview", label: "Վահանակ", icon: LayoutDashboard },
  { id: "control", label: "Կառավարում", icon: Gamepad2 },
  { id: "teams", label: "Թիմեր", icon: Users },
  { id: "tasks", label: "Առաջադրանքներ", icon: ListChecks },
  { id: "jury", label: "Ժյուրի", icon: Scale },
  { id: "evaluations", label: "Գնահատականներ", icon: Award },
  { id: "results", label: "Արդյունքներ", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAuthed(j.session?.role === "admin"))
      .catch(() => setAuthed(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (authed === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-void">
        <Loader2 className="animate-spin text-cyan" size={32} />
      </main>
    );
  }

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-void/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-xl border border-amber/40 bg-panel2 p-2">
              <ShieldHalf size={20} className="text-amber" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-widest text-white">ADMIN PANEL</div>
              <div className="text-[11px] text-slate-500">Կազմակերպչի կառավարում</div>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={logout}>
            <LogOut size={14} /> Ելք
          </Btn>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer",
                tab === t.id
                  ? "bg-cyan/15 text-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
                  : "text-slate-400 hover:bg-panel2/60 hover:text-slate-200",
              )}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 pb-20">
        {tab === "overview" && <OverviewTab onGoControl={() => setTab("control")} />}
        {tab === "control" && <ControlTab />}
        {tab === "teams" && <TeamsTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "jury" && <JuryTab />}
        {tab === "evaluations" && <EvaluationsTab />}
        {tab === "results" && <ResultsTab />}
      </div>
    </main>
  );
}

/* ---------------------------------- Login ---------------------------------- */

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
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
      else if (json.role !== "admin") setError("Այս հաշիվը ադմինիստրատորի չէ․ օգտագործեք Jury Panel-ը");
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
          <div className="grid place-items-center rounded-2xl border border-amber/40 bg-panel2 p-4">
            <SlidersHorizontal size={36} className="text-amber" strokeWidth={1.6} />
          </div>
          <h1 className="mt-6 font-display text-xl font-black tracking-widest text-white">ADMIN PANEL</h1>
          <p className="mt-2 text-sm text-slate-400">Կազմակերպչի մուտք</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Մուտքանուն" autoFocus />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Գաղտնաբառ" type="password" />
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger animate-pop">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <Btn type="submit" size="lg" className="w-full" disabled={busy || !username || !password}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldHalf size={18} />}
            Մուտք գործել
          </Btn>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Ցուցադրական հաշիվ՝ admin / admin123</p>
      </Panel>
    </main>
  );
}
