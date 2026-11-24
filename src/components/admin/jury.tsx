"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Scale, Trash2, KeyRound, Ban, Loader2, CircleCheck, ShieldHalf } from "lucide-react";
import { Badge, Btn, Field, Input, Panel } from "@/components/ui";
import { api, type UserRow } from "./types";

export default function JuryTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api<{ users: UserRow[] }>("/api/admin/jury");
    if (res.ok) setUsers(res.data.users);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function patch(id: number, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const res = await api(`/api/admin/jury/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMsg(res.ok ? "" : res.error ?? "Սխալ");
    await load();
  }

  async function remove(id: number, username: string) {
    if (!window.confirm(`Ջնջե՞լ «${username}» հաշիվը`)) return;
    const res = await api(`/api/admin/jury/${id}`, { method: "DELETE" });
    setMsg(res.ok ? "" : res.error ?? "Սխալ");
    await load();
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  const jury = users.filter((u) => u.role === "jury");
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div className="space-y-5 animate-pop">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <Scale size={20} className="text-mint" /> Ժյուրիի անդամներ ({jury.length})
        </h2>
        <Btn onClick={() => setShowForm(true)}><Plus size={16} /> Նոր հաշիվ</Btn>
      </div>

      {msg && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}
      {showForm && <JuryForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await load(); }} />}

      <div className="grid gap-3 md:grid-cols-2">
        {jury.map((u) => (
          <Panel key={u.id} className="flex items-center justify-between gap-3 p-5">
            <div>
              <div className="font-bold text-white">{u.name}</div>
              <div className="text-xs text-slate-500">@{u.username}</div>
            </div>
            <div className="flex items-center gap-2">
              {u.active ? <Badge color="mint">Ակտիվ</Badge> : <Badge color="danger">Անջատված</Badge>}
              <Btn size="sm" variant="ghost" onClick={() => {
                const pw = window.prompt("Նոր գաղտնաբառ (առնվազն 6 նիշ)․");
                if (pw) patch(u.id, { password: pw });
              }}>
                <KeyRound size={13} />
              </Btn>
              <Btn size="sm" variant={u.active ? "warn" : "success"} onClick={() => patch(u.id, { active: !u.active })}>
                {u.active ? <Ban size={13} /> : <CircleCheck size={13} />}
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => remove(u.id, u.username)}>
                <Trash2 size={13} />
              </Btn>
            </div>
          </Panel>
        ))}
      </div>

      <h3 className="flex items-center gap-2 pt-4 text-sm font-bold uppercase tracking-wider text-slate-400">
        <ShieldHalf size={15} className="text-amber" /> Ադմինիստրատորներ
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {admins.map((u) => (
          <Panel key={u.id} className="flex items-center justify-between gap-3 p-5">
            <div>
              <div className="font-bold text-white">{u.name}</div>
              <div className="text-xs text-slate-500">@{u.username}</div>
            </div>
            <Badge color="amber">Admin</Badge>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function JuryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("jury");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/api/admin/jury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, password, role }),
    });
    if (!res.ok) {
      setError(res.error ?? "Սխալ");
      setBusy(false);
    } else {
      onSaved();
    }
  }

  return (
    <Panel className="border-mint/30 p-6">
      <h3 className="font-bold text-white">Նոր ժյուրիի / ադմինի հաշիվ</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Անուն, ազգանուն">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Օր․ Արամ Սարգսյան" required />
        </Field>
        <Field label="Մուտքանուն" hint="a-z, 0-9, _ . -">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jury4" required />
        </Field>
        <Field label="Գաղտնաբառ" hint="Առնվազն 6 նիշ">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </Field>
        <Field label="Դեր">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white focus:border-cyan/60">
            <option value="jury">Ժյուրի</option>
            <option value="admin">Ադմինիստրատոր</option>
          </select>
        </Field>
        {error && <div className="sm:col-span-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <div className="flex gap-2 sm:col-span-2">
          <Btn type="submit" disabled={busy || !username || !name || password.length < 6}>
            {busy ? "Ստեղծվում է…" : "Ստեղծել հաշիվը"}
          </Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Չեղարկել</Btn>
        </div>
      </form>
    </Panel>
  );
}
