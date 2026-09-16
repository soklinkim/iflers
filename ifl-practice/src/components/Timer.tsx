import { formatClock } from "../lib/format";

interface Props {
  remainingMs: number;
}

/** Stays visible while scrolling, without dominating the screen (README §8). */
export function Timer({ remainingMs }: Props) {
  const low = remainingMs <= 60_000;
  const warn = remainingMs <= 10 * 60_000;
  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${formatClock(remainingMs)}`}
      className={`tap-target flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${
        low
          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          : warn
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      <span aria-hidden="true">⏱</span>
      {formatClock(remainingMs)}
    </div>
  );
}
