export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const SCREEN_MODES = [
  { id: "lobby", label: "Սկզբնական էկրան" },
  { id: "task_intro", label: "Առաջադրանքի ներկայացում" },
  { id: "task_live", label: "Առաջադրանքը ընթացքում է" },
  { id: "time_up", label: "Ժամանակն ավարտված է" },
  { id: "submissions_closed", label: "Պատասխաններն ավարտված են" },
  { id: "judging", label: "Գնահատման ընթացք" },
  { id: "leaderboard", label: "Միավորների աղյուսակ" },
  { id: "break", label: "Ընդմիջում" },
  { id: "winners", label: "Հաղթողներ" },
] as const;

export const TASK_TYPES: Record<string, { label: string; color: string }> = {
  video: { label: "Ուսումնական տեսանյութ", color: "#a78bfa" },
  quiz: { label: "Վիկտորինա", color: "#22d3ee" },
  threat: { label: "Որսա՛ վտանգը", color: "#f87171" },
  game: { label: "Թվային խաղ", color: "#34d399" },
  scenario: { label: "Սցենարային լուծում", color: "#fbbf24" },
};

export const ANSWER_FORMATS: Record<string, string> = {
  choice: "Տարբերակների ընտրություն",
  text: "Տեքստային պատասխան",
  link: "Հղում",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Նախապատրաստվում է",
  ready: "Պատրաստ է",
  live: "Ընթացքի մեջ է",
  paused: "Դադարեցված է",
  finished: "Ավարտված է",
  pending: "Սպասում է",
  active: "Ակտիվ",
  completed: "Ավարտված",
  closed: "Փակված",
};
