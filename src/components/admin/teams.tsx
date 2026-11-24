"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Users, Copy, Check, RefreshCw, Ban, Trash2, Pencil, Loader2, CircleCheck } from "lucide-react";
import { Badge, Btn, Field, Input, Panel } from "@/components/ui";
import { cn } from "@/lib/utils";
import { api, type TeamRow } from "./types";

type School = { id: number; name: string; shortCode: string; color: string };

export default function TeamsTab() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api<{ teams: TeamRow[]; schools: School[] }>("/api/admin/teams");
    if (res.ok) {
      setTeams(res.data.teams);
      setSchools(res.data.schools);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function patch(id: number, payload: Record<string, unknown>) {
    const res = await api(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) setMsg(res.error ?? "Սխալ");
    else setMsg("");
    await load();
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Ջնջե՞լ «${name}» թիմը՝ բոլոր պատասխաններով`)) return;
    await api(`/api/admin/teams/${id}`, { method: "DELETE" });
    await load();
  }

  function copyCode(code: string, id: number) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  return (
    <div className="space-y-5 animate-pop">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <Users size={20} className="text-cyan" /> Թիմեր ({teams.length})
        </h2>
        <Btn onClick={() => { setShowForm(true); setEditing(null); }}>
          <Plus size={16} /> Նոր թիմ
        </Btn>
      </div>

      {msg && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

      {(showForm || editing) && (
        <TeamForm
          schools={schools}
          team={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={async () => { setShowForm(false); setEditing(null); await load(); }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {teams.map((t) => (
          <Panel key={t.id} className={cn("p-5", t.disabled && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl border font-display text-sm font-black"
                  style={{ borderColor: `${t.schoolColor}55`, color: t.schoolColor, background: `${t.schoolColor}14` }}
                >
                  {t.name.slice(0, 2)}
                </span>
                <div>
                  <div className="font-bold text-white">{t.name}</div>
                  <div className="text-xs" style={{ color: t.schoolColor }}>{t.schoolName}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {t.grade && `${t.grade} դասարան • `}{t.members || "անդամները նշված չեն"}
                  </div>
                </div>
              </div>
              {t.disabled ? <Badge color="danger">Անջատված</Badge> : <Badge color="mint">Ակտիվ</Badge>}
            </div>

            <button
              onClick={() => copyCode(t.accessCode, t.id)}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-line bg-abyss/70 px-4 py-3 transition hover:border-cyan/40 cursor-pointer"
            >
              <span className="font-display text-lg font-bold tracking-[0.25em] text-cyan">{t.accessCode}</span>
              {copied === t.id ? <Check size={16} className="text-mint" /> : <Copy size={16} className="text-slate-500" />}
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="ghost" onClick={() => { setEditing(t); setShowForm(false); }}>
                <Pencil size={13} /> Խմբագրել
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => patch(t.id, { regenerateCode: true })}>
                <RefreshCw size={13} /> Նոր կոդ
              </Btn>
              <Btn size="sm" variant={t.disabled ? "success" : "warn"} onClick={() => patch(t.id, { disabled: !t.disabled })}>
                {t.disabled ? <CircleCheck size={13} /> : <Ban size={13} />}
                {t.disabled ? "Միացնել" : "Անջատել"}
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => remove(t.id, t.name)}>
                <Trash2 size={13} />
              </Btn>
            </div>
          </Panel>
        ))}
      </div>

      {teams.length === 0 && (
        <Panel className="grid place-items-center gap-3 p-16 text-center text-slate-500">
          <Users size={40} /> Թիմեր դեռ չկան․ ավելացրեք առաջին թիմը
        </Panel>
      )}
    </div>
  );
}

function TeamForm({ schools, team, onClose, onSaved }: {
  schools: School[]; team: TeamRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [schoolId, setSchoolId] = useState(team?.schoolId ?? schools[0]?.id ?? 0);
  const [grade, setGrade] = useState(team?.grade ?? "");
  const [members, setMembers] = useState(team?.members ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { name, schoolId, grade, members };
    const res = team
      ? await api(`/api/admin/teams/${team.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await api("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      setError(res.error ?? "Սխալ");
      setBusy(false);
    } else {
      onSaved();
    }
  }

  return (
    <Panel className="border-cyan/30 p-6">
      <h3 className="font-bold text-white">{team ? "Խմբագրել թիմը" : "Նոր թիմ"}</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Թիմի անվանում">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Օր․ ԿիբեռՀսկիչներ" required />
        </Field>
        <Field label="Դպրոց">
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white focus:border-cyan/60"
          >
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Դասարան">
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Օր․ 5-րդ" />
        </Field>
        <Field label="Անդամներ" hint="Անունները ստորակետով">
          <Input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Աննա, Դավիթ, Մարի" />
        </Field>
        {error && <div className="sm:col-span-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <div className="flex gap-2 sm:col-span-2">
          <Btn type="submit" disabled={busy || !name}>{busy ? "Պահպանվում է…" : team ? "Պահպանել" : "Ստեղծել թիմը"}</Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Չեղարկել</Btn>
        </div>
      </form>
      {!team && <p className="mt-3 text-xs text-slate-500">Մուտքի կոդը կստեղծվի ավտոմատ՝ դժվար կռահելի ձևաչափով։</p>}
    </Panel>
  );
}
