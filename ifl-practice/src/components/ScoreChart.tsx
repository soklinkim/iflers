import type { Attempt } from "../lib/types";
import { formatDate } from "../lib/format";

interface Props {
  /** Full attempts only — retakes never appear here (README §6.5). */
  attempts: Attempt[];
}

/**
 * Lightweight inline-SVG line chart — no charting library, to stay inside the
 * 200 KB JS budget (README §3). Resolves the open question in §14: study
 * attempts plot too, in a lighter tone, rather than being hidden — the trend
 * line is the point, and hiding half the attempts would distort it.
 */
export function ScoreChart({ attempts }: Props) {
  const scored = attempts
    .filter((a) => a.status === "submitted" && a.score && !a.parentAttemptId)
    .sort((a, b) => a.startedAt - b.startedAt);

  if (scored.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No attempts yet — your score history will appear here after your first full attempt.
      </p>
    );
  }

  const width = 320;
  const height = 140;
  const pad = 24;
  const pct = (a: Attempt) => (a.score!.correct / a.score!.total) * 100;
  const xStep = scored.length > 1 ? (width - pad * 2) / (scored.length - 1) : 0;
  const x = (i: number) => pad + i * xStep;
  const y = (v: number) => height - pad - (v / 100) * (height - pad * 2);

  const points = scored.map((a, i) => ({ x: x(i), y: y(pct(a)), attempt: a }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score over attempts" className="w-full max-w-md">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad} x2={width - pad} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
            <text x={2} y={y(v) + 3} fontSize={8} className="fill-slate-400 dark:fill-slate-500">
              {v}
            </text>
          </g>
        ))}
        <path d={path} fill="none" className="stroke-indigo-500" strokeWidth={2} />
        {points.map((p) => (
          <circle
            key={p.attempt.id}
            cx={p.x}
            cy={p.y}
            r={4}
            className={p.attempt.mode === "exam" ? "fill-indigo-600" : "fill-indigo-300 dark:fill-indigo-700"}
          >
            <title>
              {formatDate(p.attempt.startedAt)} — {p.attempt.score!.correct}/{p.attempt.score!.total} ({p.attempt.mode})
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-600" /> Exam
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-300 dark:bg-indigo-700" /> Study
        </span>
      </div>
    </div>
  );
}
