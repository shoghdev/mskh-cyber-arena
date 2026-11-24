"use client";

import { useEffect, useState } from "react";
import {
  Award, Loader2, Eye, EyeOff, RotateCcw, Inbox, Link2, UserRound, Pencil, Check, X,
} from "lucide-react";
import { Badge, Btn, Input, Panel } from "@/components/ui";
import { cn } from "@/lib/utils";
import { api, control } from "./types";

type EvalTeam = {
  teamId: number; teamName: string; schoolName: string; schoolColor: string;
  submission: { id: number; textAnswer: string; linkUrl: string; autoScore: number | null; submittedAt: number } | null;
  evaluations: { id: number; juryName: string; totalScore: number; comment: string }[];
  average: number | null;
  publishedScore: number | null;
};

type EvalTask = {
  id: number; title: string; stageName: string; type: string; autoGrade: boolean;
  maxScore: number; status: string; published: boolean; teams: EvalTeam[];
};

export default function EvaluationsTab() {
  const [tasks, setTasks] = useState<EvalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<{ taskId: number; teamId: number } | null>(null);
  const [scoreValue, setScoreValue] = useState("");
  const [scoreReason, setScoreReason] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api<{ tasks: EvalTask[] }>("/api/admin/evaluations");
    if (res.ok) setTasks(res.data.tasks);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function run(action: string, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const res = await control(action, payload);
    setMsg(res.ok ? "" : res.error ?? "Սխալ");
    await load();
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-cyan" size={32} /></div>;

  return (
    <div className="space-y-5 animate-pop">
      <h2 className="flex items-center gap-2 text-xl font-black text-white">
        <Award size={20} className="text-violet" /> Գնահատականների կառավարում
      </h2>
      {msg && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

      {tasks.map((task) => {
        const submitted = task.teams.filter((t) => t.submission).length;
        return (
          <Panel key={task.id} className="overflow-hidden">
            <button
              onClick={() => setOpen(open === task.id ? null : task.id)}
              className="flex w-full flex-wrap items-center gap-3 p-5 text-left cursor-pointer"
            >
              <Badge color="slate">{task.stageName}</Badge>
              <span className="font-bold text-white">{task.title}</span>
              <span className="text-xs text-slate-500">{submitted}/{task.teams.length} պատասխան</span>
              {task.autoGrade && <Badge color="cyan">ավտոմատ</Badge>}
              <span className="ml-auto flex items-center gap-2">
                {task.published ? <Badge color="mint">Հրապարակված</Badge> : <Badge color="amber">Չի հրապարակվել</Badge>}
              </span>
            </button>

            {open === task.id && (
              <div className="border-t border-line/60 p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {task.published ? (
                    <Btn size="sm" variant="warn" onClick={() => run("unpublish_task_scores", { taskId: task.id }, "Հանե՞լ հրապարակված միավորները էկրանից")}>
                      <EyeOff size={14} /> Հանել հրապարակումը
                    </Btn>
                  ) : (
                    <Btn
                      size="sm"
                      variant="success"
                      onClick={() => run("publish_task_scores", { taskId: task.id }, `Հրապարակե՞լ «${task.title}» առաջադրանքի միավորները (հաշվարկ՝ ժյուրիի միջին)`)}
                    >
                      <Eye size={14} /> Հաստատել և հրապարակել
                    </Btn>
                  )}
                </div>

                <div className="space-y-2">
                  {task.teams.map((t) => (
                    <div key={t.teamId} className="rounded-xl border border-line bg-panel2/40 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: t.schoolColor }}
                        />
                        <span className="font-bold text-white">{t.teamName}</span>
                        <span className="text-xs text-slate-500">{t.schoolName}</span>
                        <span className="ml-auto flex flex-wrap items-center gap-2">
                          {!t.submission && <Badge color="slate">Չի պատասխանել</Badge>}
                          {t.evaluations.map((e) => (
                            <span key={e.id} title={e.comment} className="rounded-lg border border-violet/30 bg-violet/10 px-2.5 py-1 text-xs text-violet">
                              <UserRound size={11} className="mr-1 inline" />
                              {e.juryName}․ <b className="font-display">{e.totalScore}</b>
                            </span>
                          ))}
                          {t.submission && t.average !== null && (
                            <Badge color="cyan" className="font-display">միջ. {t.average}</Badge>
                          )}
                          {t.publishedScore !== null && (
                            <Badge color="mint" className="font-display">→ {t.publishedScore}</Badge>
                          )}
                        </span>
                      </div>

                      {t.submission && (
                        <div className="mt-3 rounded-lg border border-line bg-abyss/50 p-3 text-xs text-slate-400">
                          {t.submission.linkUrl && (
                            <a href={t.submission.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-cyan hover:underline">
                              <Link2 size={12} /> {t.submission.linkUrl}
                            </a>
                          )}
                          {t.submission.textAnswer && (
                            <p className="line-clamp-3 whitespace-pre-wrap">{t.submission.textAnswer}</p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {editScore?.taskId === task.id && editScore.teamId === t.teamId ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="number"
                              value={scoreValue}
                              onChange={(e) => setScoreValue(e.target.value)}
                              className="w-24 px-2 py-1.5 text-center font-display"
                              min={0}
                              max={task.maxScore}
                              placeholder="0"
                            />
                            <Input
                              value={scoreReason}
                              onChange={(e) => setScoreReason(e.target.value)}
                              placeholder="Պատճառաբանում…"
                              className="w-56 px-3 py-1.5"
                            />
                            <Btn
                              size="sm"
                              variant="success"
                              onClick={async () => {
                                await run("set_score", { taskId: task.id, teamId: t.teamId, score: Number(scoreValue), reason: scoreReason });
                                setEditScore(null);
                              }}
                            >
                              <Check size={13} />
                            </Btn>
                            <Btn size="sm" variant="ghost" onClick={() => setEditScore(null)}><X size={13} /></Btn>
                          </div>
                        ) : (
                          <Btn size="sm" variant="ghost" onClick={() => { setEditScore({ taskId: task.id, teamId: t.teamId }); setScoreValue(String(t.publishedScore ?? t.average ?? 0)); setScoreReason(""); }}>
                            <Pencil size={12} /> Ձեռքով միավոր
                          </Btn>
                        )}
                        {t.submission && (
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={() => run("reopen_submission", { submissionId: t.submission!.id }, `Վերաբացե՞լ «${t.teamName}» թիմի պատասխանը (ընթացիկը կջնջվի)`)}
                          >
                            <RotateCcw size={12} /> Վերաբացել պատասխանը
                          </Btn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        );
      })}

      {tasks.length === 0 && (
        <Panel className="grid place-items-center gap-3 p-16 text-center text-slate-500">
          <Inbox size={40} /> Առաջադրանքներ դեռ չկան
        </Panel>
      )}
    </div>
  );
}
