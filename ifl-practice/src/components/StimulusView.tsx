import { Fragment } from "react";
import type { FlatQuestion, Mode, Stimulus } from "../lib/types";
import { tokenizeStimulusText } from "../lib/text";
import { SelectAnswer } from "./SelectAnswer";

interface GapBinding {
  fq: FlatQuestion;
  answer: string | null | undefined;
  onSelect: (optionId: string) => void;
}

interface Props {
  stimulus: Stimulus;
  mode: Mode;
  /** Only present for cloze groups — maps a question's printed number to its answer binding. */
  gaps?: Map<number, GapBinding>;
}

export function StimulusView({ stimulus, mode, gaps }: Props) {
  return (
    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
      {stimulus.title && <p className="mb-2 font-semibold">{stimulus.title}</p>}
      {stimulus.blocks.map((block, i) => {
        if (block.kind === "image") {
          return <img key={i} src={block.src} alt={block.alt ?? ""} className="rounded-lg border border-slate-200 dark:border-slate-800" />;
        }
        return (
          <p key={i} className={block.kind === "subheading" ? "font-semibold" : "leading-relaxed"}>
            {block.label && <span className="mr-2 font-bold text-slate-500 dark:text-slate-400">{block.label}.</span>}
            {tokenizeStimulusText(block.text ?? "").map((token, j) => {
              const key = `${i}-${j}`;
              if (token.type === "text") return <Fragment key={key}>{token.value}</Fragment>;
              if (token.type === "bold") return <strong key={key}>{token.value}</strong>;
              // gap
              const binding = gaps?.get(token.n);
              if (!binding) {
                return (
                  <span key={key} className="font-mono text-rose-500">
                    {`{{${token.n}}}`}
                  </span>
                );
              }
              return (
                <SelectAnswer
                  key={key}
                  fq={binding.fq}
                  options={binding.fq.options}
                  mode={mode}
                  answer={binding.answer}
                  onSelect={binding.onSelect}
                  label={`Gap ${token.n}`}
                  inline
                />
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
