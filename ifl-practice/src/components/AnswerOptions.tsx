import type { FlatQuestion, Mode, Option } from "../lib/types";
import { optionVisualState } from "../lib/feedback";

const STATE_CLASSES: Record<string, string> = {
  neutral:
    "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500",
  selected: "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-400",
  "selected-correct": "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
  "selected-incorrect": "border-rose-500 bg-rose-50 dark:bg-rose-950",
  "correct-unselected": "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/60",
};

interface Props {
  fq: FlatQuestion;
  options: Option[];
  mode: Mode;
  answer: string | null | undefined;
  onSelect: (optionId: string) => void;
  name: string;
  /** Review screens always show correctness and never accept input, regardless of the attempt's mode. */
  readOnly?: boolean;
}

/** Radio-group option list. Never uses colour alone to signal correctness — every state also carries an icon and text (§9 accessibility). */
export function AnswerOptions({ fq, options, mode, answer, onSelect, name, readOnly }: Props) {
  return (
    <div role="radiogroup" aria-label="Answer options" className="flex flex-col gap-2">
      {options.map((opt) => {
        const state = optionVisualState(readOnly ? "study" : mode, fq, answer, opt.id);
        const selected = answer === opt.id;
        return (
          <label
            key={opt.id}
            className={`tap-target flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${STATE_CLASSES[state]}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={selected}
              disabled={readOnly}
              onChange={() => onSelect(opt.id)}
              className="h-5 w-5 shrink-0 accent-indigo-600"
            />
            <span className="flex-1 text-sm sm:text-base">
              <span className="mr-1.5 font-semibold text-slate-500 dark:text-slate-400">{opt.id}.</span>
              {opt.text}
            </span>
            {state === "selected-correct" && (
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct">
                ✓
              </span>
            )}
            {state === "selected-incorrect" && (
              <span className="shrink-0 text-rose-600 dark:text-rose-400" aria-label="Incorrect">
                ✗
              </span>
            )}
            {state === "correct-unselected" && (
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct answer">
                ✓
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
