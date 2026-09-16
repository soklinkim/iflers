import { useState } from "react";
import type { FlatQuestion } from "../lib/types";

interface Props {
  fq: FlatQuestion;
  correct: boolean;
}

/** Shown once a study-mode question has been answered. Must never break on a missing explanation (README §4.1). */
export function ExplanationPanel({ fq, correct }: Props) {
  const [open, setOpen] = useState(!correct);
  const explanation = fq.question.explanation;

  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex w-full items-center justify-between gap-2 text-left font-medium text-slate-700 dark:text-slate-200"
        aria-expanded={open}
      >
        <span>{correct ? "Correct — explanation" : "Why this is correct"}</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {explanation ?? "No explanation is available for this question yet."}
        </p>
      )}
    </div>
  );
}
