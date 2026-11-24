export type OverviewData = {
  serverNow: number;
  tournament: {
    id: number; name: string; description: string; date: string; status: string; scoringMethod: string;
  } | null;
  state: {
    screenMode: string; activeTaskId: number | null; activeStageId: number | null;
    timerState: string; timerDurationSec: number; timerEndsAt: number | null;
    timerRemainingMs: number; submissionsOpen: boolean;
  };
  activeTask: {
    id: number; title: string; type: string; status: string; maxScore: number;
    durationSec: number; autoGrade: boolean; answerFormat: string; stageName: string;
  } | null;
  activeTaskSubs: number[];
  stats: { teams: number; jury: number; tasks: number; stages: number; submissions: number };
  leaderboard: { id: number; name: string; school: string; schoolColor: string; total: number; rank: number }[];
  stageList: { id: number; name: string; order: number; status: string }[];
  schools: { id: number; name: string; shortCode: string; color: string }[];
};

export type TeamRow = {
  id: number; name: string; schoolId: number; schoolName: string; schoolColor: string;
  grade: string; members: string; accessCode: string; disabled: boolean;
};

export type TaskRow = {
  id: number; stageId: number; title: string; description: string; type: string;
  order: number; durationSec: number; maxScore: number; mediaUrl: string;
  answerFormat: string; autoGrade: boolean; status: string;
  options: { id: number; text: string; isCorrect: boolean; order: number }[];
  criteria: { id: number; name: string; maxPoints: number; order: number }[];
};

export type StageRow = {
  id: number; tournamentId: number; name: string; description: string; order: number; status: string;
};

export type UserRow = {
  id: number; username: string; name: string; role: string; active: boolean; createdAt: string;
};

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json as T, error: json.error };
  } catch {
    return { ok: false, data: {} as T, error: "Կապի խնդիր" };
  }
}

export async function control(action: string, payload: Record<string, unknown> = {}) {
  return api<{ ok?: boolean }>("/api/admin/control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
}
