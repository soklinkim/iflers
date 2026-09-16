import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GroupRenderer } from "../components/GroupRenderer";
import { Layout } from "../components/Layout";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { Timer } from "../components/Timer";
import { isExpired, submitAttempt, unansweredCount } from "../lib/attempts";
import { formatClock } from "../lib/format";
import { useAttempt, usePaper } from "../lib/hooks";
import { useRemainingTime, useThresholdWarnings } from "../lib/useRemainingTime";
import { attemptStore } from "../storage";
import type { Attempt, Group, Section } from "../lib/types";

interface GroupEntry {
  section: Section;
  group: Group;
}

export function AttemptPage() {
  const { id: paperId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { paper, flat } = usePaper(paperId);
  const attempt = useAttempt(attemptId);
  const navigate = useNavigate();

  const groupEntries: GroupEntry[] = useMemo(
    () => (paper ? paper.sections.flatMap((section) => section.groups.map((group) => ({ section, group }))) : []),
    [paper],
  );

  const [groupIndex, setGroupIndex] = useState(0);
  const [focusQuestionId, setFocusQuestionId] = useState<string | undefined>();
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const initialized = useRef(false);
  const refs = useRef(new Map<string, HTMLElement | null>());
  const submitting = useRef(false);

  // Only the questions this attempt actually includes (full paper, or the missed subset for a retake).
  const attemptFlat = useMemo(() => {
    if (!attempt) return [];
    const included = new Set(attempt.questionIds);
    return flat.filter((f) => included.has(f.question.id));
  }, [flat, attempt]);

  const attemptGroups = useMemo(
    () =>
      groupEntries
        .map((e) => ({ ...e, questions: attemptFlat.filter((f) => f.group.id === e.group.id) }))
        .filter((e) => e.questions.length > 0),
    [groupEntries, attemptFlat],
  );

  const remaining = useRemainingTime(attempt?.mode === "exam" ? attempt.expiresAt : undefined);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!attempt || !paper || submitting.current) return;
      submitting.current = true;
      const submitted = submitAttempt(attempt, flat, { autoSubmitted: auto });
      await attemptStore.saveAttempt(submitted);
      navigate(`/paper/${paper.id}/attempt/${attempt.id}/review`, { replace: true });
    },
    [attempt, paper, flat, navigate],
  );

  // Reopening the app after time expired must submit immediately, not let the student continue (README §6.2).
  useEffect(() => {
    if (attempt && attempt.status === "in-progress" && isExpired(attempt)) {
      doSubmit(true);
    }
  }, [attempt, doSubmit]);

  // Already submitted (e.g. a stale tab) — go straight to the review.
  useEffect(() => {
    if (attempt && attempt.status !== "in-progress" && paper) {
      navigate(`/paper/${paper.id}/attempt/${attempt.id}/review`, { replace: true });
    }
  }, [attempt, paper, navigate]);

  // Land on the first unanswered question once, rather than always the start.
  useEffect(() => {
    if (initialized.current || !attempt || attemptGroups.length === 0) return;
    initialized.current = true;
    const firstUnanswered = attemptFlat.find((f) => attempt.answers[f.question.id] == null);
    if (firstUnanswered) {
      const idx = attemptGroups.findIndex((g) => g.group.id === firstUnanswered.group.id);
      if (idx >= 0) setGroupIndex(idx);
    }
  }, [attempt, attemptGroups, attemptFlat]);

  const thresholds = useMemo(() => [10 * 60_000, 60_000], []);
  useThresholdWarnings(
    remaining,
    thresholds,
    useCallback((t: number) => {
      setWarning(`${formatClock(t)} remaining`);
      window.setTimeout(() => setWarning(null), 6000);
    }, []),
  );

  // Auto-submit the instant the wall clock reaches expiry.
  useEffect(() => {
    if (attempt?.mode === "exam" && attempt.status === "in-progress" && remaining <= 0) {
      doSubmit(true);
    }
  }, [remaining, attempt, doSubmit]);

  // Warn before losing an in-progress exam.
  useEffect(() => {
    if (attempt?.mode !== "exam" || attempt.status !== "in-progress") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attempt]);

  async function onAnswer(questionId: string, optionId: string) {
    if (!attempt) return;
    const next: Attempt = { ...attempt, answers: { ...attempt.answers, [questionId]: optionId } };
    await attemptStore.saveAttempt(next);
  }

  async function onToggleFlag(questionId: string) {
    if (!attempt) return;
    const flagged = attempt.flagged.includes(questionId)
      ? attempt.flagged.filter((id) => id !== questionId)
      : [...attempt.flagged, questionId];
    await attemptStore.saveAttempt({ ...attempt, flagged });
  }

  function jumpToQuestion(questionId: string) {
    const idx = attemptGroups.findIndex((g) => g.questions.some((f) => f.question.id === questionId));
    if (idx < 0) return;
    setGroupIndex(idx);
    setFocusQuestionId(questionId);
    setNavigatorOpen(false);
  }

  useEffect(() => {
    if (!focusQuestionId) return;
    const el = refs.current.get(focusQuestionId) ?? document.getElementById(`question-${focusQuestionId}`);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusQuestionId, groupIndex]);

  async function handleManualSubmit() {
    if (!attempt) return;
    if (attempt.mode === "exam") {
      const n = unansweredCount(attempt);
      const ok = window.confirm(
        n > 0
          ? `You have ${n} unanswered question${n === 1 ? "" : "s"}. Submit anyway?`
          : "Submit this exam attempt?",
      );
      if (!ok) return;
    }
    await doSubmit(false);
  }

  if (paper === undefined || attempt === undefined) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }
  if (paper === null || attempt === null) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">This attempt could not be found.</p>
        <Link to="/" className="text-indigo-600 dark:text-indigo-400">
          Back to papers
        </Link>
      </Layout>
    );
  }
  if (attempt.status !== "in-progress" || attemptGroups.length === 0) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }

  const current = attemptGroups[Math.min(groupIndex, attemptGroups.length - 1)];
  const isLast = groupIndex >= attemptGroups.length - 1;
  const isFirst = groupIndex === 0;

  return (
    <Layout hideNav>
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{paper.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {attempt.mode === "exam" ? "Exam mode" : "Study mode"}
              {attempt.parentAttemptId && " · retake"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {attempt.mode === "exam" && <Timer remainingMs={remaining} />}
            <button
              type="button"
              onClick={() => setNavigatorOpen((o) => !o)}
              className="tap-target rounded-lg border border-slate-300 px-3 text-sm font-medium dark:border-slate-700"
            >
              Questions
            </button>
          </div>
        </div>
        {warning && (
          <p role="alert" className="mt-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            ⏱ {warning}
          </p>
        )}
      </div>

      {navigatorOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <QuestionNavigator
            questions={attemptFlat}
            answers={attempt.answers}
            flagged={attempt.flagged}
            currentQuestionId={focusQuestionId}
            onJump={jumpToQuestion}
          />
        </div>
      )}

      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {current.section.title}
      </p>
      <p className="mb-3 text-sm italic text-slate-600 dark:text-slate-300">{current.group.instruction}</p>

      <div className="mb-2 flex flex-wrap gap-2">
        {current.questions.map((fq) => (
          <button
            key={fq.question.id}
            type="button"
            onClick={() => onToggleFlag(fq.question.id)}
            className={`tap-target rounded-full px-3 text-xs font-medium ${
              attempt.flagged.includes(fq.question.id)
                ? "bg-amber-400 text-amber-950"
                : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            {attempt.flagged.includes(fq.question.id) ? "🚩" : "⚑"} Flag Q{fq.question.n}
          </button>
        ))}
      </div>

      <GroupRenderer
        group={current.group}
        flatQuestions={current.questions}
        mode={attempt.mode}
        answers={attempt.answers}
        onAnswer={onAnswer}
        registerRef={(qid, el) => refs.current.set(qid, el)}
      />

      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => setGroupIndex((i) => Math.max(0, i - 1))}
          className="tap-target rounded-lg border border-slate-300 px-4 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleManualSubmit}
            className="tap-target rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
          >
            Finish attempt
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setGroupIndex((i) => Math.min(attemptGroups.length - 1, i + 1))}
            className="tap-target rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white"
          >
            Next →
          </button>
        )}
      </div>
    </Layout>
  );
}
