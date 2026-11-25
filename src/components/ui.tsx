"use client";
import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ShieldHalf } from "lucide-react";
import { cn, formatMs } from "@/lib/utils";

/* --------------------------------- Brand ---------------------------------- */

export function Brand({
  size = "md",
  subtitle = true,
}: {
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
}) {
  const icon = size === "lg" ? 54 : size === "md" ? 38 : 28;
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-cyan/30 blur-xl animate-pulse-ring" />
        <div className="relative grid place-items-center rounded-2xl border border-cyan/40 bg-gradient-to-br from-panel2 to-abyss p-2 panel-glow">
          <ShieldHalf size={icon} className="text-cyan" strokeWidth={1.6} />
        </div>
      </div>
      <Link
        href="/"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <div>
          <div
            className={cn(
              "font-display font-bold tracking-widest text-white",
              size === "lg"
                ? "text-2xl"
                : size === "md"
                  ? "text-lg"
                  : "text-sm",
            )}
          >
            MSKH <span className="text-cyan">CYBER</span> ARENA
          </div>
          {subtitle && (
            <div className="text-[11px] uppercase tracking-[0.3em] text-azure/70">
              Կիբեռպաշտպաններ
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

/* --------------------------------- Panels --------------------------------- */

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel-glass panel-glow rounded-2xl", className)}>
      {children}
    </div>
  );
}

/* --------------------------------- Buttons -------------------------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success" | "warn";
  size?: "sm" | "md" | "lg";
};

export function Btn({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BtnProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-cyan/90 to-azure/90 text-void hover:from-cyan hover:to-azure shadow-[0_0_24px_rgba(34,211,238,0.35)]",
    ghost: "",
    danger:
      "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
    success: "bg-mint/15 text-mint border border-mint/40 hover:bg-mint/25",
    warn: "bg-amber/15 text-amber border border-amber/40 hover:bg-amber/25",
    ghost2:
      "border border-line bg-panel2/60 text-slate-300 hover:border-azure/40 hover:text-white",
  };
  const v = variant === "ghost" ? variants.ghost2 : variants[variant];
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        v,
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------- Inputs --------------------------------- */

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] transition",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-line bg-abyss/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] transition resize-y min-h-24",
        props.className,
      )}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

/* --------------------------------- Badge ---------------------------------- */

export function Badge({
  children,
  color = "cyan",
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan/40 bg-cyan/10 text-cyan",
    violet: "border-violet/40 bg-violet/10 text-violet",
    mint: "border-mint/40 bg-mint/10 text-mint",
    amber: "border-amber/40 bg-amber/10 text-amber",
    danger: "border-danger/40 bg-danger/10 text-danger",
    slate: "border-line bg-panel2/60 text-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        colors[color] ?? colors.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- Polling --------------------------------- */

export function usePoll<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Սխալ");
        if (res.status === 401) setData(null);
        return json;
      }
      if (typeof json.serverNow === "number") {
        offsetRef.current = json.serverNow - Date.now();
      }
      setData(json);
      setError(null);
      return json;
    } catch {
      setError("Կապի խնդիր․ կրկնում ենք…");
    }
  }, [url]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, error, refresh, offsetRef };
}

/* ------------------------------ Timer display ------------------------------ */

export type TimerInfo = {
  state: string;
  durationSec: number;
  endsAt: number | null;
  remainingMs: number;
};

export function useRemainingMs(
  timer: TimerInfo | null | undefined,
  offsetRef: React.RefObject<number>,
) {
  const [ms, setMs] = useState(timer?.remainingMs ?? 0);
  useEffect(() => {
    const tick = () => {
      if (!timer) return setMs(0);
      if (timer.state === "running" && timer.endsAt) {
        setMs(Math.max(0, timer.endsAt - (Date.now() + offsetRef.current)));
      } else {
        setMs(timer.remainingMs);
      }
    };
    tick();
    const id = setInterval(tick, 120);
    return () => clearInterval(id);
  }, [timer, offsetRef]);
  return ms;
}

export function TimerDigits({
  ms,
  className,
}: {
  ms: number;
  className?: string;
}) {
  const danger = ms <= 30000 && ms > 0;
  return (
    <span
      className={cn(
        "font-display font-bold tabular-nums tracking-wider",
        danger ? "text-danger" : "text-white",
        className,
      )}
    >
      {formatMs(ms)}
    </span>
  );
}

export function TimerRing({
  ms,
  durationSec,
  size = 180,
}: {
  ms: number;
  durationSec: number;
  size?: number;
}) {
  const total = Math.max(1, durationSec * 1000);
  const ratio = Math.max(0, Math.min(1, ms / total));
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const danger = ratio <= 0.2;
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#132038"
          strokeWidth="9"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={danger ? "#f87171" : "#22d3ee"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <TimerDigits ms={ms} className="text-3xl" />
      </div>
    </div>
  );
}

/* -------------------------------- Live dot --------------------------------- */

export function LiveDot({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-danger/50 bg-danger/10 px-3 py-1 text-xs font-bold tracking-widest text-danger">
      <span className="h-2 w-2 rounded-full bg-danger animate-blink" />
      {label}
    </span>
  );
}

/* ------------------------------ Backdrop art ------------------------------- */

export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 cyber-grid animate-grid-pan opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-cyan/10 blur-[140px]" />
      <div className="absolute bottom-0 -left-40 h-[380px] w-[480px] rounded-full bg-violet/10 blur-[140px]" />
      <div className="absolute bottom-0 -right-40 h-[380px] w-[480px] rounded-full bg-azure/10 blur-[140px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
    </div>
  );
}
