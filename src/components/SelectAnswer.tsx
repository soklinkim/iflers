import type { FlatQuestion, Mode, Option } from "../lib/types";

/**
 * Dropdown-based answer picker, used for cloze gaps and heading-match — drag-and-drop on a
 * small touchscreen is miserable and fails for anyone with motor difficulties (README §8).
 */
interface Props {
  fq: FlatQuestion;
  options: Option[];
  mode: Mode;
  answer: string | null | undefined;
  onSelect: (optionId: string) => void;
  label: string;
  inline?: boolean;
}

export function SelectAnswer({ fq, options, mode, answer, onSelect, label, inline }: Props) {
  const reveal = mode === "study" && answer != null;
  const correct = reveal && answer === fq.question.answerId;

  return (
    <span className={inline ? "inline-flex items-center gap-1 align-baseline" : "flex items-center gap-2"}>
      <select
        aria-label={label}
        value={answer ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className={`tap-target rounded-md border-2 px-2 py-1 text-sm font-medium ${
          reveal
            ? correct
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
              : "border-rose-500 bg-rose-50 dark:bg-rose-950"
            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        }`}
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.id}. {opt.text}
          </option>
        ))}
      </select>
      {reveal && (correct ? <span className="text-emerald-600 dark:text-emerald-400">✓</span> : <span className="text-rose-600 dark:text-rose-400">✗ correct: {fq.question.answerId}</span>)}
    </span>
  );
}
