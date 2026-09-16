import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnswerOptions } from "../components/AnswerOptions";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { Layout } from "../components/Layout";
import { SkillBreakdownChart } from "../components/SkillBreakdownChart";
import { createRetakeAttempt } from "../lib/attempts";
import { formatDate } from "../lib/format";
import { useAttempt, usePaper } from "../lib/hooks";
import { isCorrect, scoreAttempt } from "../lib/scoring";
import { attemptStore } from "../storage";
import type { Attempt, SkillTag } from "../lib/types";

export function ReviewPage() {
  const { id: paperId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { paper, flat } = usePaper(paperId);
  const attempt = useAttempt(attemptId);
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<SkillTag | null>(null);
  const [parent, setParent] = useState<Attempt | null>(null);

  useEffect(() => {
    if (attempt && attempt.status === "in-progress" && paper) {
      navigate(`/paper/${paper.id}/attempt/${attempt.id}`, { replace: true });
    }
  }, [attempt, paper, navigate]);

  useEffect(() => {
    setParent(null);
    if (attempt?.parentAttemptId) {
      attemptStore.getAttempt(attempt.parentAttemptId).then(setParent);
    }
  }, [attempt?.parentAttemptId]);

  const scored = useMemo(
    () => (paper && attempt ? scoreAttempt(paper, flat, attempt) : null),
    [paper, attempt, flat],
  );

  const included = useMemo(() => {
    if (!attempt) return [];
    const ids = new Set(attempt.questionIds);
    let list = flat.filter((f) => ids.has(f.question.id));
    if (selectedSkill) list = list.filter((f) => f.question.skills.includes(selectedSkill));
    return list;
  }, [flat, attempt, selectedSkill]);

  if (paper === undefined || attempt === undefined) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }
  if (paper === null || attempt === null || !scored) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">This attempt could not be found.</p>
        <Link to="/" className="text-indigo-600 dark:text-indigo-400">
          Back to papers
        </Link>
      </Layout>
    );
  }

  async function retake(mode: "study" | "exam") {
    if (!attempt || !paper || !scored) return;
    const durationMinutes =
      mode === "exam" ? Math.max(5, Math.round((scored.missedQuestionIds.length / paper.totalQuestions) * paper.durationMinutes)) : undefined;
    const next = createRetakeAttempt(attempt, scored.missedQuestionIds, mode, durationMinutes);
    await attemptStore.saveAttempt(next);
    navigate(`/paper/${paper.id}/attempt/${next.id}`);
  }

  const pct = scored.total > 0 ? Math.round((scored.correct / scored.total) * 100) : 0;
  const fixedCount = parent
    ? included.filter((f) => isCorrect(f, attempt.answers[f.question.id])).length
    : null;

  return (
    <Layout>
      <Link to={`/paper/${paper.id}`} className="text-sm text-indigo-600 dark:text-indigo-400">
        ← {paper.title}
      </Link>

      <h1 className="mt-2 text-2xl font-bold">
        {scored.correct}/{scored.total}{" "}
        <span className="text-lg font-normal text-slate-500 dark:text-slate-400">({pct}%)</span>
      </h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {formatDate(attempt.startedAt)} · {attempt.mode}
        {attempt.autoSubmitted && " · auto-submitted at time limit"}
        {attempt.parentAttemptId && " · retake"}
      </p>

      {parent && fixedCount !== null && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          You fixed {fixedCount} of {included.length} previously missed questions.
        </p>
      )}

      {!attempt.parentAttemptId && scored.missedQuestionIds.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => retake("study")}
            className="tap-target rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            Retake the {scored.missedQuestionIds.length} missed (study)
          </button>
          <button
            type="button"
            onClick={() => retake("exam")}
            className="tap-target rounded-lg border border-slate-300 px-4 text-sm font-medium dark:border-slate-700"
          >
            Retake, timed
          </button>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">By section</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {scored.sectionBreakdown.map((s) => (
            <li key={s.sectionId} className="flex justify-between">
              <span>{s.sectionTitle}</span>
              <span className="font-medium">
                {s.correct}/{s.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">By skill</h2>
        <SkillBreakdownChart
          entries={scored.skillBreakdown}
          onSelectSkill={(s) => setSelectedSkill((cur) => (cur === s ? null : s))}
          selectedSkill={selectedSkill}
        />
        {selectedSkill && (
          <button type="button" onClick={() => setSelectedSkill(null)} className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
            Clear filter
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Question by question</h2>
        <div className="flex flex-col gap-4">
          {included.map((fq) => {
            const answer = attempt.answers[fq.question.id] ?? null;
            const ok = isCorrect(fq, answer);
            return (
              <div key={fq.question.id} id={`question-${fq.question.n}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-2 font-medium">
                  <span className="mr-1.5 text-slate-500 dark:text-slate-400">{fq.question.n}.</span>
                  {fq.question.prompt ?? "(see passage)"}
                </p>
                <AnswerOptions fq={fq} options={fq.options} mode={attempt.mode} answer={answer} onSelect={() => {}} name={fq.question.id} readOnly />
                <ExplanationPanel fq={fq} correct={ok} />
              </div>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}
