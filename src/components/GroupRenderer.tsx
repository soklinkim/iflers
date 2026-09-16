import { Fragment, type ReactNode } from "react";
import type { FlatQuestion, Group, Mode } from "../lib/types";
import { AnswerOptions } from "./AnswerOptions";
import { ExplanationPanel } from "./ExplanationPanel";
import { PassageLayout } from "./PassageLayout";
import { SelectAnswer } from "./SelectAnswer";
import { StimulusView } from "./StimulusView";
import { shouldRevealFeedback } from "../lib/feedback";
import { tokenizeStimulusText } from "../lib/text";

interface Props {
  group: Group;
  flatQuestions: FlatQuestion[]; // this group's questions, in printed order
  mode: Mode;
  answers: Record<string, string | null>;
  onAnswer: (questionId: string, optionId: string) => void;
  registerRef: (questionId: string, el: HTMLElement | null) => void;
}

function QuestionCard({
  fq,
  mode,
  answer,
  onAnswer,
  registerRef,
  children,
}: {
  fq: FlatQuestion;
  mode: Mode;
  answer: string | null | undefined;
  onAnswer: (optionId: string) => void;
  registerRef: (el: HTMLElement | null) => void;
  children?: ReactNode;
}) {
  const reveal = shouldRevealFeedback(mode, answer);
  const correct = answer === fq.question.answerId;
  return (
    <div
      ref={registerRef}
      id={`question-${fq.question.n}`}
      className="scroll-mt-24 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
    >
      <p className="mb-3 font-medium">
        <span className="mr-1.5 text-slate-500 dark:text-slate-400">{fq.question.n}.</span>
        {children}
      </p>
      <AnswerOptions fq={fq} options={fq.options} mode={mode} answer={answer} onSelect={onAnswer} name={fq.question.id} />
      {reveal && <ExplanationPanel fq={fq} correct={correct} />}
    </div>
  );
}

function highlightPrompt(prompt: string, highlight?: { start: number; end: number }) {
  if (!highlight) return prompt;
  return (
    <>
      {prompt.slice(0, highlight.start)}
      <u className="decoration-2 underline-offset-2">{prompt.slice(highlight.start, highlight.end)}</u>
      {prompt.slice(highlight.end)}
    </>
  );
}

export function GroupRenderer({ group, flatQuestions, mode, answers, onAnswer, registerRef }: Props) {
  const plainQuestions = (
    <div className="flex flex-col gap-4">
      {flatQuestions.map((fq) => (
        <QuestionCard
          key={fq.question.id}
          fq={fq}
          mode={mode}
          answer={answers[fq.question.id]}
          onAnswer={(optId) => onAnswer(fq.question.id, optId)}
          registerRef={(el) => registerRef(fq.question.id, el)}
        >
          {fq.question.prompt && highlightPrompt(fq.question.prompt, fq.question.highlight)}
        </QuestionCard>
      ))}
    </div>
  );

  switch (group.type) {
    case "mcq":
    case "vocab-inline":
      return plainQuestions;

    case "passage-mcq":
      return (
        <PassageLayout
          passage={group.stimulus && <StimulusView stimulus={group.stimulus} mode={mode} />}
          questions={plainQuestions}
        />
      );

    case "cloze": {
      const gaps = new Map(
        flatQuestions.map((fq) => [
          fq.question.n,
          { fq, answer: answers[fq.question.id], onSelect: (optId: string) => onAnswer(fq.question.id, optId) },
        ]),
      );
      return group.stimulus ? (
        <div ref={(el) => registerRef(flatQuestions[0]?.question.id, el)} id={`question-${flatQuestions[0]?.question.n}`} className="scroll-mt-24">
          <StimulusView stimulus={group.stimulus} mode={mode} gaps={gaps} />
        </div>
      ) : null;
    }

    case "heading-match": {
      if (!group.stimulus) return null;
      return (
        <div className="flex flex-col gap-4">
          {group.stimulus.blocks.map((block, i) => {
            const fq = flatQuestions[i];
            if (!fq) return null;
            const reveal = shouldRevealFeedback(mode, answers[fq.question.id]);
            const correct = answers[fq.question.id] === fq.question.answerId;
            return (
              <div
                key={i}
                ref={(el) => registerRef(fq.question.id, el)}
                id={`question-${fq.question.n}`}
                className="scroll-mt-24 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <p className="mb-2">
                  {block.label && <span className="mr-2 font-bold text-slate-500 dark:text-slate-400">{block.label}.</span>}
                  {tokenizeStimulusText(block.text ?? "").map((t, j) =>
                    t.type === "bold" ? <strong key={j}>{t.value}</strong> : <Fragment key={j}>{t.type === "text" ? t.value : ""}</Fragment>,
                  )}
                </p>
                <SelectAnswer
                  fq={fq}
                  options={fq.options}
                  mode={mode}
                  answer={answers[fq.question.id]}
                  onSelect={(optId) => onAnswer(fq.question.id, optId)}
                  label={`Heading for paragraph ${block.label ?? i + 1}`}
                />
                {reveal && <ExplanationPanel fq={fq} correct={correct} />}
              </div>
            );
          })}
        </div>
      );
    }

    case "yes-no-ng":
      return (
        <PassageLayout
          passage={group.stimulus && <StimulusView stimulus={group.stimulus} mode={mode} />}
          questions={plainQuestions}
        />
      );

    default:
      return null;
  }
}
