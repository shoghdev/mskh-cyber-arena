"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, Plus, Minus, Square, Lock, Unlock, Award,
  MonitorPlay, CheckCircle2, Hourglass, Trophy, Loader2, Flag, Rocket, TimerOff,
} from "lucide-react";
import { Badge, Btn, Panel, TimerRing } from "@/components/ui";
import { cn, SCREEN_MODES } from "@/lib/utils";
import { api, control, type OverviewData, type TaskRow, type StageRow } from "./types";

const SCREEN_ICONS: Record<string, typeof MonitorPlay> = {
  lobby: MonitorPlay,
  task_intro: Flag,
  task_live: Play,
  time_up: TimerOff,
  submissions_closed: Lock,
  judging: Award,
  leaderboard: Trophy,
  break: Hourglass,
  winners: Trophy,
};

export default function ControlTab() {
  const [ov, setOv] = useState<OverviewData | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const offsetRef = useRef(0);

  async function load() {
    const [o, t] = await Promise.all([
      api<OverviewData>("/api/admin/overview"),
      api<{ tasks: TaskRow[]; stages: StageRow[] }>("/api/admin/tasks"),
    ]);
    if (o.ok) {
      setOv(o.data);
      offsetRef.current = (o.data.serverNow ?? Date.now()) - Date.now();
    }
    if (t.ok) {
      setTasks(t.data.tasks);
      setStages(t.data.stages);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, []);

  async function run(action: string, payload: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setMsg("");
    const res = await control(action, payload);
    if (!res.ok) setMsg(res.error ?? "Սխալ");
    await load();
    setBusy("");
  }

  if (!ov) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  const { state } = ov;
  const running = state.timerState === "running";
  const paused = state.timerState === "paused";

  return (
    <div className="space-y-6 animate-pop">
      {msg && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>
      )}

      {/* Tournament status */}
      <Panel className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Մրցույթի կարգավիճակ</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {["draft", "ready", "live", "paused", "finished"].map((s) => (
            <Btn
              key={s}
              size="sm"
              variant={ov.tournament?.status === s ? "primary" : "ghost"}
              onClick={() => run("set_tournament_status", { status: s })}
              disabled={busy !== ""}
            >
              {{ draft: "Նախապատրաստում", ready: "Պատրաստ", live: "Ընթացքում", paused: "Դադար", finished: "Ավարտված" }[s]}
            </Btn>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Screen control */}
        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <MonitorPlay size={16} className="text-cyan" /> Մեծ էկրանի ռեժիմ
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SCREEN_MODES.map((m) => {
              const Icon = SCREEN_ICONS[m.id] ?? MonitorPlay;
              const active = state.screenMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => run("set_screen", { mode: m.id })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                      : "border-line bg-panel2/50 text-slate-400 hover:border-azure/40 hover:text-slate-200",
                  )}
                >
                  <Icon size={20} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Timer control */}
        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <Hourglass size={16} className="text-violet" /> Ժամաչափ
          </h3>
          <div className="mt-4 flex items-center gap-6">
            <TimerRing
              ms={computeRemaining(state, offsetRef.current)}
              durationSec={state.timerDurationSec || ov.activeTask?.durationSec || 300}
              size={140}
            />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                {!running && (
                  <Btn size="sm" onClick={() => run("start_timer")} disabled={busy !== "" || !state.activeTaskId}>
                    <Play size={14} /> {paused ? "Շարունակել" : "Մեկնարկ"}
                  </Btn>
                )}
                {running && (
                  <Btn size="sm" variant="warn" onClick={() => run("pause_timer")} disabled={busy !== ""}>
                    <Pause size={14} /> Դադարեցնել
                  </Btn>
                )}
                <Btn size="sm" variant="ghost" onClick={() => run("reset_timer")} disabled={busy !== "" || !state.activeTaskId}>
                  <RotateCcw size={14} /> Զրոյացնել
                </Btn>
                <Btn size="sm" variant="danger" onClick={() => run("end_task", {}, "Ավարտե՞լ առաջադրանքը և կանգնեցնել ժամաչափը")} disabled={busy !== "" || !state.activeTaskId}>
                  <Square size={14} /> Ավարտել
                </Btn>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" variant="ghost" onClick={() => run("add_time", { seconds: 30 })} disabled={busy !== ""}>
                  <Plus size={13} /> 30 վ
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => run("add_time", { seconds: 60 })} disabled={busy !== ""}>
                  <Plus size={13} /> 1 ր
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => run("add_time", { seconds: -30 })} disabled={busy !== ""}>
                  <Minus size={13} /> 30 վ
                </Btn>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.submissionsOpen ? (
                  <Btn size="sm" variant="danger" onClick={() => run("close_submissions")} disabled={busy !== ""}>
                    <Lock size={14} /> Փակել պատասխանները
                  </Btn>
                ) : (
                  <Btn size="sm" variant="success" onClick={() => run("open_submissions")} disabled={busy !== "" || !state.activeTaskId}>
                    <Unlock size={14} /> Բացել պատասխանները
                  </Btn>
                )}
              </div>
            </div>
          </div>
          {ov.activeTask && (
            <div className="mt-4 rounded-xl border border-line bg-abyss/50 px-4 py-3 text-sm">
              <span className="text-slate-500">Ակտիվ առաջադրանք՝ </span>
              <span className="font-semibold text-white">{ov.activeTask.title}</span>
              <span className="ml-2 text-xs text-slate-500">({ov.activeTask.stageName})</span>
            </div>
          )}
        </Panel>
      </div>

      {/* Task activation */}
      <Panel className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <Rocket size={16} className="text-amber" /> Առաջադրանքի ակտիվացում
        </h3>
        <div className="mt-4 space-y-4">
          {stages.map((stage) => (
            <div key={stage.id}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span className={cn("h-1.5 w-1.5 rounded-full", stage.status === "completed" ? "bg-mint" : stage.status === "active" ? "bg-cyan animate-blink" : "bg-slate-600")} />
                Փուլ {stage.order}․ {stage.name}
                {stage.status !== "completed" && state.activeStageId === stage.id && (
                  <Btn size="sm" variant="ghost" className="ml-auto !py-1 !text-[11px]" onClick={() => run("complete_stage", { stageId: stage.id })} disabled={busy !== ""}>
                    Ավարտել փուլը
                  </Btn>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {tasks.filter((t) => t.stageId === stage.id).map((t) => {
                  const active = state.activeTaskId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3.5",
                        active ? "border-cyan/60 bg-cyan/10" : "border-line bg-panel2/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{t.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {Math.floor(t.durationSec / 60)} ր • {t.maxScore} միավոր
                          {t.autoGrade ? " • ավտոմատ" : ""}
                        </div>
                      </div>
                      {active ? (
                        <Badge color="cyan">Ակտիվ</Badge>
                      ) : (
                        <Btn size="sm" variant="ghost" onClick={() => run("activate_task", { taskId: t.id })} disabled={busy !== ""}>
                          Ակտիվացնել
                        </Btn>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Submissions + publish */}
      {ov.activeTask && (
        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            <CheckCircle2 size={16} className="text-mint" /> Պատասխանների վիճակ
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ov.leaderboard.map((t) => {
              const answered = ov.activeTaskSubs.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
                    answered ? "border-mint/40 bg-mint/10 text-mint" : "border-line bg-panel2/40 text-slate-500",
                  )}
                >
                  {answered ? <CheckCircle2 size={14} /> : <Hourglass size={14} />}
                  <span className="truncate">{t.name}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant="success"
              onClick={() => run("publish_task_scores", { taskId: ov.activeTask!.id }, "Հրապարակե՞լ այս առաջադրանքի միավորները մեծ էկրանին")}
              disabled={busy !== ""}
            >
              <Award size={16} /> Հրապարակել միավորները
            </Btn>
            <Btn variant="ghost" onClick={() => run("set_screen", { mode: "judging" })} disabled={busy !== ""}>
              Գնահատման էկրան
            </Btn>
            <Btn variant="ghost" onClick={() => run("set_screen", { mode: "leaderboard" })} disabled={busy !== ""}>
              <Trophy size={16} /> Leaderboard
            </Btn>
            <Btn
              variant="warn"
              onClick={() => run("finish_tournament", {}, "Ավարտե՞լ մրցույթը և ցուցադրել հաղթողներին")}
              disabled={busy !== ""}
            >
              <Trophy size={16} /> Ավարտել մրցույթը
            </Btn>
          </div>
        </Panel>
      )}
    </div>
  );
}

function computeRemaining(state: OverviewData["state"], offset: number): number {
  if (state.timerState === "running" && state.timerEndsAt) {
    return Math.max(0, state.timerEndsAt - (Date.now() + offset));
  }
  return state.timerRemainingMs;
}
