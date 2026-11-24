"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Plus, ListChecks, Trash2, Pencil, Loader2, Layers, X,
  FileVideo, Gamepad2, HelpCircle, Bug, ScrollText, Zap,
} from "lucide-react";
import { Badge, Btn, Field, Input, Panel, Textarea } from "@/components/ui";
import { cn, ANSWER_FORMATS, TASK_TYPES } from "@/lib/utils";
import { api, type TaskRow, type StageRow } from "./types";

const TYPE_ICONS: Record<string, typeof FileVideo> = {
  video: FileVideo, quiz: HelpCircle, threat: Bug, game: Gamepad2, scenario: ScrollText,
};

export default function TasksTab() {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStage, setEditingStage] = useState<StageRow | null>(null);
  const [taskFormStage, setTaskFormStage] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api<{ tasks: TaskRow[]; stages: StageRow[] }>("/api/admin/tasks");
    if (res.ok) {
      setTasks(res.data.tasks);
      setStages(res.data.stages);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function removeTask(id: number, title: string) {
    if (!window.confirm(`Ջնջե՞լ «${title}» առաջադրանքը`)) return;
    await api(`/api/admin/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function removeStage(id: number, name: string) {
    if (!window.confirm(`Ջնջե՞լ «${name}» փուլը՝ բոլոր առաջադրանքներով`)) return;
    await api(`/api/admin/stages/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  return (
    <div className="space-y-5 animate-pop">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          <ListChecks size={20} className="text-violet" /> Փուլեր և առաջադրանքներ
        </h2>
        <Btn onClick={() => { setShowStageForm(true); setEditingStage(null); }}>
          <Plus size={16} /> Նոր փուլ
        </Btn>
      </div>

      {msg && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

      {(showStageForm || editingStage) && (
        <StageForm
          stage={editingStage}
          nextOrder={stages.length + 1}
          onClose={() => { setShowStageForm(false); setEditingStage(null); }}
          onSaved={async () => { setShowStageForm(false); setEditingStage(null); await load(); }}
        />
      )}

      {stages.map((stage) => (
        <Panel key={stage.id} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line/60 bg-panel2/40 px-5 py-4">
            <Layers size={16} className="text-azure" />
            <span className="font-display text-xs font-bold tracking-widest text-slate-500">ՓՈՒԼ {stage.order}</span>
            <h3 className="font-bold text-white">{stage.name}</h3>
            <Badge color={stage.status === "completed" ? "mint" : stage.status === "active" ? "cyan" : "slate"}>
              {stage.status === "completed" ? "Ավարտված" : stage.status === "active" ? "Ակտիվ" : "Սպասում է"}
            </Badge>
            <div className="ml-auto flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => { setEditingStage(stage); setShowStageForm(false); }}>
                <Pencil size={13} />
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => removeStage(stage.id, stage.name)}>
                <Trash2 size={13} />
              </Btn>
              <Btn size="sm" onClick={() => { setTaskFormStage(stage.id); setEditingTask(null); }}>
                <Plus size={13} /> Առաջադրանք
              </Btn>
            </div>
          </div>
          {stage.description && <p className="px-5 pt-3 text-xs text-slate-500">{stage.description}</p>}

          {taskFormStage === stage.id && !editingTask && (
            <div className="p-5 pt-4">
              <TaskForm
                stageId={stage.id}
                task={null}
                onClose={() => setTaskFormStage(null)}
                onSaved={async () => { setTaskFormStage(null); await load(); }}
              />
            </div>
          )}

          <div className="space-y-2 p-5">
            {tasks.filter((t) => t.stageId === stage.id).map((t) => (
              editingTask?.id === t.id ? (
                <TaskForm
                  key={t.id}
                  stageId={stage.id}
                  task={t}
                  onClose={() => setEditingTask(null)}
                  onSaved={async () => { setEditingTask(null); await load(); }}
                />
              ) : (
                <div key={t.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel2/40 p-4">
                  {(() => {
                    const Icon = TYPE_ICONS[t.type] ?? Zap;
                    return <Icon size={18} style={{ color: TASK_TYPES[t.type]?.color }} />;
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{t.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {TASK_TYPES[t.type]?.label} • {Math.floor(t.durationSec / 60)} ր • {t.maxScore} միավոր • {ANSWER_FORMATS[t.answerFormat]}
                      {t.autoGrade ? " • ավտոմատ գնահատում" : ""}
                      {t.criteria.length > 0 && ` • ${t.criteria.length} չափանիշ`}
                      {t.options.length > 0 && ` • ${t.options.length} տարբերակ`}
                    </div>
                  </div>
                  <Btn size="sm" variant="ghost" onClick={() => { setEditingTask(t); setTaskFormStage(null); }}>
                    <Pencil size={13} />
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => removeTask(t.id, t.title)}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
              )
            ))}
            {tasks.filter((t) => t.stageId === stage.id).length === 0 && taskFormStage !== stage.id && (
              <p className="py-3 text-center text-xs text-slate-600">Առաջադրանքներ չկան</p>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* -------------------------------- Stage form -------------------------------- */

function StageForm({ stage, nextOrder, onClose, onSaved }: {
  stage: StageRow | null; nextOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(stage?.name ?? "");
  const [description, setDescription] = useState(stage?.description ?? "");
  const [order, setOrder] = useState(stage?.order ?? nextOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { name, description, order };
    const res = stage
      ? await api(`/api/admin/stages/${stage.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await api("/api/admin/stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      setError(res.error ?? "Սխալ");
      setBusy(false);
    } else onSaved();
  }

  return (
    <Panel className="border-azure/30 p-6">
      <h3 className="font-bold text-white">{stage ? "Խմբագրել փուլը" : "Նոր փուլ"}</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Անվանում"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Հերթականություն"><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} min={1} /></Field>
        <div className="sm:col-span-2">
          <Field label="Նկարագրություն"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></Field>
        </div>
        {error && <div className="sm:col-span-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <div className="flex gap-2 sm:col-span-2">
          <Btn type="submit" disabled={busy || !name}>{busy ? "Պահպանվում…" : "Պահպանել"}</Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Չեղարկել</Btn>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------- Task form --------------------------------- */

const DEFAULT_BY_TYPE: Record<string, { answerFormat: string; autoGrade: boolean }> = {
  quiz: { answerFormat: "choice", autoGrade: true },
  threat: { answerFormat: "text", autoGrade: false },
  scenario: { answerFormat: "text", autoGrade: false },
  video: { answerFormat: "link", autoGrade: false },
  game: { answerFormat: "link", autoGrade: false },
};

function TaskForm({ stageId, task, onClose, onSaved }: {
  stageId: number; task: TaskRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState(task?.type ?? "scenario");
  const [durationMin, setDurationMin] = useState(Math.round((task?.durationSec ?? 300) / 60));
  const [maxScore, setMaxScore] = useState(task?.maxScore ?? 100);
  const [mediaUrl, setMediaUrl] = useState(task?.mediaUrl ?? "");
  const [answerFormat, setAnswerFormat] = useState(task?.answerFormat ?? "text");
  const [autoGrade, setAutoGrade] = useState(task?.autoGrade ?? false);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>(
    task?.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) ?? [],
  );
  const [crits, setCrits] = useState<{ name: string; maxPoints: number }[]>(
    task?.criteria.map((c) => ({ name: c.name, maxPoints: c.maxPoints })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onTypeChange(t: string) {
    setType(t);
    const def = DEFAULT_BY_TYPE[t];
    if (def) {
      setAnswerFormat(def.answerFormat);
      setAutoGrade(def.autoGrade);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      stageId, title, description, type,
      durationSec: durationMin * 60,
      maxScore, mediaUrl, answerFormat, autoGrade,
      options: answerFormat === "choice" ? options : [],
      criteria: autoGrade ? [] : crits,
    };
    const res = task
      ? await api(`/api/admin/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await api("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      setError(res.error ?? "Սխալ");
      setBusy(false);
    } else onSaved();
  }

  return (
    <div className="rounded-xl border border-cyan/30 bg-abyss/60 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white">{task ? "Խմբագրել առաջադրանքը" : "Նոր առաջադրանք"}</h4>
        <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Վերնագիր"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Տեսակ">
            <select value={type} onChange={(e) => onTypeChange(e.target.value)} className="w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white focus:border-cyan/60">
              {Object.entries(TASK_TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Պայման / նկարագրություն">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Տևողություն (րոպե)"><Input type="number" min={1} max={120} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} /></Field>
          <Field label="Առավել. միավոր"><Input type="number" min={1} max={1000} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} /></Field>
          <Field label="Պատասխանի ձև">
            <select value={answerFormat} onChange={(e) => setAnswerFormat(e.target.value)} className="w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white focus:border-cyan/60">
              {Object.entries(ANSWER_FORMATS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </Field>
          <Field label="Մեդիա հղում (ոչ պարտադիր)"><Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" /></Field>
        </div>

        {answerFormat === "choice" && (
          <div className="space-y-3 rounded-xl border border-line bg-panel2/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Տարբերակներ</span>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={autoGrade} onChange={(e) => setAutoGrade(e.target.checked)} className="accent-cyan" />
                Ավտոմատ գնահատում
              </label>
            </div>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={o.isCorrect}
                  onChange={(e) => setOptions((s) => s.map((x, xi) => xi === i ? { ...x, isCorrect: e.target.checked } : x))}
                  className="h-4 w-4 accent-mint"
                  title="Ճիշտ տարբերակ"
                />
                <Input value={o.text} onChange={(e) => setOptions((s) => s.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x))} placeholder={`Տարբերակ ${i + 1}`} />
                <Btn type="button" size="sm" variant="danger" onClick={() => setOptions((s) => s.filter((_, xi) => xi !== i))}><X size={13} /></Btn>
              </div>
            ))}
            <Btn type="button" size="sm" variant="ghost" onClick={() => setOptions((s) => [...s, { text: "", isCorrect: false }])}>
              <Plus size={13} /> Ավելացնել տարբերակ
            </Btn>
            <p className="text-[11px] text-slate-500">Նշեք ճիշտ տարբերակը (կամ մի քանիսը)։ Թիմերը ճիշտները չեն տեսնի։</p>
          </div>
        )}

        {!autoGrade && (
          <div className="space-y-3 rounded-xl border border-line bg-panel2/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Գնահատման չափանիշներ</span>
              <span className="text-xs text-slate-500">Ընդամենը՝ {crits.reduce((a, c) => a + (c.maxPoints || 0), 0)}</span>
            </div>
            {crits.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={c.name} onChange={(e) => setCrits((s) => s.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))} placeholder="Չափանիշի անվանում" className="flex-1" />
                <Input type="number" min={1} max={1000} value={c.maxPoints} onChange={(e) => setCrits((s) => s.map((x, xi) => xi === i ? { ...x, maxPoints: Number(e.target.value) } : x))} className="w-24 text-center" />
                <Btn type="button" size="sm" variant="danger" onClick={() => setCrits((s) => s.filter((_, xi) => xi !== i))}><X size={13} /></Btn>
              </div>
            ))}
            <Btn type="button" size="sm" variant="ghost" onClick={() => setCrits((s) => [...s, { name: "", maxPoints: 25 }])}>
              <Plus size={13} /> Ավելացնել չափանիշ
            </Btn>
          </div>
        )}

        {error && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <div className="flex gap-2">
          <Btn type="submit" disabled={busy || !title}>{busy ? "Պահպանվում…" : "Պահպանել առաջադրանքը"}</Btn>
          <Btn type="button" variant="ghost" onClick={onClose}>Չեղարկել</Btn>
        </div>
      </form>
    </div>
  );
}
