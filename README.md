# IFLers
# Exam Practice Web App — Development Requirements

**Version:** 0.1 (draft)
**Last updated:** 5 September 2026
**Status:** pre-development

---

## 1. Purpose

A free, offline-capable web app where students practise past English exam papers under two modes: an untimed study mode with immediate explanations, and a timed exam mode that mirrors real test conditions and tracks improvement across attempts.

**Primary user:** a Cambodian student preparing for a university English entrance test, on a mid-range Android phone, often on limited mobile data.

**Design consequences of that user:**
- Mobile-first, not desktop-first. Phone is the primary device, not a fallback.
- Must work offline after first load.
- Payload budget matters. Every megabyte is real money to the user.
- No account required to start practising.

---

## 2. Goals and non-goals

### v1 goals
- Host multiple papers, each attemptable in study or exam mode
- Study mode: per-question feedback with an explanation for wrong answers
- Exam mode: 90-minute timer, auto-submit, results withheld until submission
- Attempt history per paper with score progression
- Review any past attempt question-by-question
- Retake only the questions missed in a chosen attempt
- Per-skill breakdown so students know *what* to fix, not just their score
- Works offline; installable to home screen

### Explicit non-goals for v1
- User accounts, login, cross-device sync
- Teacher dashboards or class management
- Leaderboards or social features
- A CMS or admin UI for authoring questions (papers are JSON files in the repo)
- Server-side anything

Deferring accounts is deliberate. It removes the backend, the privacy obligations, the password reset flow, and the hosting cost all at once. Section 11 covers how to leave the door open.

---

## 3. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Build tool | Vite | |
| Framework | React 18 + TypeScript | Strict mode on |
| Styling | Tailwind CSS | |
| Routing | React Router | |
| Local storage | Dexie.js (IndexedDB) | localStorage too small for many attempts × 100 answers |
| Offline / install | vite-plugin-pwa (Workbox) | |
| Hosting | Cloudflare Pages | Unlimited bandwidth, no commercial-use clause |
| Testing | Vitest + React Testing Library | Timer and scoring logic especially |

**Deliberately excluded:** no state management library (React state plus Dexie live queries is sufficient), no UI component library (Tailwind directly keeps the bundle small), no analytics in v1.

### Budgets
- Initial JS bundle: under 200 KB gzipped
- One paper's JSON: under 150 KB
- Time to interactive on a 3G connection: under 5 seconds

---

## 4. Data model

This is the part to get right before writing UI code. Five different question shapes appear in a single paper, and a naive `{question, options, answer}` model breaks on three of them.

### 4.1 Content types

```ts
type PaperId = string;        // "ifl-2017-a"
type QuestionId = string;     // "ifl-2017-a-q88"
type SkillTag = string;       // "articles" | "verb-tense" | "skimming" | ...

interface Paper {
  id: PaperId;
  title: string;              // display name
  year: number;
  version?: string;           // "A" — some papers have multiple versions
  source: string;             // provenance, shown in UI
  totalQuestions: number;     // expected to equal flattened question count
  durationMinutes: number;    // 90
  sections: Section[];
}

interface Section {
  id: string;                 // "grammar" | "vocabulary" | "reading"
  title: string;              // "Section I: Grammar"
  groups: Group[];
}

/**
 * A Group is a run of questions that share context.
 * A group of one standalone MCQ is normal — do not special-case it.
 */
interface Group {
  id: string;
  type: GroupType;
  instruction: string;        // the italic rubric printed above the questions
  stimulus?: Stimulus;        // passage shared by all questions in the group
  sharedOptions?: Option[];   // e.g. the list of headings
  optionsExceedItems?: boolean;   // more headings than paragraphs
  optionUseOnce?: boolean;        // each heading used at most once
  questions: Question[];
}

type GroupType =
  | "mcq"            // standalone sentence-completion
  | "cloze"          // numbered gaps inside a shared passage
  | "vocab-inline"   // sentence with an underlined span
  | "passage-mcq"    // questions about a shared reading passage
  | "heading-match"  // match paragraphs to a shared list of headings
  | "yes-no-ng";     // statement vs. passage

interface Stimulus {
  title?: string;
  /** Ordered blocks. Cloze gaps are marked inline as {{35}}. */
  blocks: StimulusBlock[];
}

interface StimulusBlock {
  label?: string;             // "A", "B" — for heading-match paragraphs
  kind: "paragraph" | "subheading";
  text: string;               // may contain {{n}} gap markers and **bold** spans
}

interface Question {
  id: QuestionId;
  n: number;                  // printed number, 1..100
  prompt?: string;            // absent for cloze (the gap is in the stimulus)
  /** For vocab-inline: character range in prompt to underline. */
  highlight?: { start: number; end: number };
  /** Absent when the group supplies sharedOptions. */
  options?: Option[];
  answerId: string;
  explanation?: string;       // OPTIONAL — app degrades gracefully
  skills: SkillTag[];
}

interface Option {
  id: string;                 // "A" | "B" | "i" | "xvii" | "yes" | "ng"
  text: string;
}
```

**Notes on the design**

- `explanation` is optional on purpose. 100 explanations per paper is the real cost of this project. Ship without them and backfill; the UI must never break on a missing one.
- `skills` drives the most valuable feature in the app (§6.4). Do not make it optional.
- `{{n}}` markers inside stimulus text let the cloze renderer drop an inline select at the right position rather than listing gaps separately.
- Bold spans matter — some reading questions ask about a specific bolded word, so the renderer must preserve emphasis.

### 4.2 Attempt records

```ts
type Mode = "study" | "exam";

interface Attempt {
  id: string;                 // uuid
  paperId: PaperId;
  mode: Mode;
  /** Set when this is a retake of missed questions from another attempt. */
  parentAttemptId?: string;
  /** Questions included. Full attempt = every id; retake = the missed subset. */
  questionIds: QuestionId[];
  startedAt: number;          // epoch ms
  expiresAt?: number;         // startedAt + duration, exam mode only
  submittedAt?: number;
  autoSubmitted: boolean;
  status: "in-progress" | "submitted" | "abandoned";
  answers: Record<QuestionId, string | null>;
  flagged: QuestionId[];
  score?: { correct: number; total: number };
}
```

**`parentAttemptId` is important.** A retake covering 35 missed questions must not appear in the score chart as an attempt scoring 30/35. Charts plot full attempts only; retakes render as children of their parent.

### 4.3 Dexie schema

```ts
db.version(1).stores({
  attempts: "id, paperId, startedAt, status, parentAttemptId",
  settings: "key",
});
```

Papers are static JSON shipped with the app, not stored in Dexie.

---

## 5. Content pipeline

Papers live as JSON in `/src/content/papers/`, one file per paper, loaded dynamically so students only download the paper they open.

**Required: a validation script** (`npm run validate:content`) that fails the build on:
- `totalQuestions` not matching the flattened count
- duplicate or non-sequential question numbers
- `answerId` not present in the question's options or the group's `sharedOptions`
- a question with no `skills`
- a `{{n}}` marker with no matching question, or vice versa
- `optionUseOnce` groups where the answer key reuses an option

Content bugs are the most likely defect in this app and the most damaging — a wrong answer key teaches students something false. Catch it at build time.

Maintain a **skill taxonomy** file listing every valid `SkillTag` with a display name, and have the validator reject unknown tags. Around 20–30 tags is the right granularity: `verb-tense`, `articles`, `word-order`, `prepositions`, `conditionals`, `inversion`, `collocation`, `idiom`, `skimming`, `inference`, `vocabulary-in-context`, and so on.

---

## 6. Functional requirements

### 6.1 Study mode

- No timer, no time pressure of any kind displayed
- Student selects an answer → immediate correct/incorrect indication
- On incorrect: reveal the explanation and the correct option, keep the student's wrong choice visible so they can see the contrast
- On correct: brief confirmation; explanation available but collapsed
- Free navigation between questions in any order
- Progress persists — closing the tab mid-paper and returning resumes where they left off
- Study attempts are recorded but excluded from the exam score chart

### 6.2 Exam mode

- 90-minute timer (from `paper.durationMinutes`)
- **Timer must be wall-clock based.** Store `expiresAt` at start and compute remaining time from `Date.now()` on every tick. A `setInterval` counter that assumes it fires once per second will drift badly when the phone locks or the browser throttles a background tab.
- On reopening the app with an in-progress exam attempt: if `Date.now() > expiresAt`, submit it immediately as `autoSubmitted` rather than letting the student continue
- No feedback of any kind before submission
- Auto-submit at expiry, grading unanswered questions as incorrect
- Warn at 10 minutes and 1 minute remaining
- Confirm before manual early submission, showing the unanswered count
- Warn before unloading the page mid-exam (`beforeunload`)

### 6.3 Results and history

On submission: score, per-section breakdown, per-skill breakdown, and a full question-by-question review with explanations.

Per paper, a history view showing every full attempt with date, score, mode, and whether it was auto-submitted. A line chart of score over attempts — this is the motivating artefact, so it should be the first thing on the screen.

Opening a past attempt shows the frozen review of that attempt: what was chosen, what was correct, and why.

### 6.4 Skill breakdown

Rather than "you scored 65/100", show which skills lost the most marks, ranked, with counts. This is the single feature that most changes what a student does next, and it costs only the `skills` tagging already in the schema.

On the review screen, allow filtering to one skill so a student can work through every article question they got wrong in sequence.

### 6.5 Retake missed questions

From any submitted attempt, "Retake the N questions I missed" creates a new attempt with `parentAttemptId` set and `questionIds` limited to the missed subset.

- Retakes use study-mode feedback by default; offer a timed option scaled to question count
- Results shown as improvement against the parent ("you fixed 22 of 35")
- Retakes never appear as standalone points on the score chart

### 6.6 Question navigator

A grid of question numbers 1–100 showing answered, unanswered, and flagged states, with a flag toggle on each question. Essential for a 100-question paper on a phone — scrolling through 100 questions to find the three you skipped is the most likely source of lost marks that have nothing to do with English.

### 6.7 Data export and import

Without accounts, clearing browser data wipes everything. Provide:
- **Export:** download all attempts as a JSON file
- **Import:** restore from that file, merging rather than replacing

Roughly ten lines of code; saves a student who switches phones from losing a year of progress.

---

## 7. Screens

| Route | Screen | Notes |
|---|---|---|
| `/` | Paper list | Each paper shows best score and attempt count |
| `/paper/:id` | Paper detail | Mode choice, history chart, attempt list |
| `/paper/:id/attempt/:attemptId` | Question view | Both modes; mode changes behaviour, not layout |
| `/paper/:id/attempt/:attemptId/review` | Review | Question-by-question with explanations |
| `/paper/:id/history` | Attempt history | Chart plus list |
| `/settings` | Settings | Export, import, clear data, about |

---

## 8. UI requirements

- **Mobile-first.** Design at 360 px wide, then scale up.
- **Reading passages need a sticky panel or a tab toggle** on narrow screens. Scrolling between a 400-word passage and its questions is the worst part of doing this on a phone.
- **Heading-match uses dropdowns, not drag-and-drop.** Drag-and-drop on a small touchscreen is genuinely miserable and fails for anyone with motor difficulties.
- Tap targets at least 44 px.
- Timer stays visible while scrolling in exam mode, without dominating the screen.
- Support system dark mode.
- Khmer UI labels alongside English where it aids comprehension; exam content stays in English.

---

## 9. Non-functional requirements

**Offline:** after first visit, the full app shell and any opened paper work with no connection. Service worker precaches the shell; papers cache on first open.

**Accessibility:** keyboard navigable, correct roles on radio groups, visible focus states, WCAG AA contrast. Do not use colour alone to signal correct/incorrect — pair it with an icon and text.

**Performance:** no layout shift when the timer ticks; question navigation under 100 ms.

**Privacy:** no third-party scripts, no tracking, no personal data collected. State this plainly on the settings page. If analytics is ever added, use a cookieless, self-hosted or privacy-first option and say so.

**Browser support:** Chrome and Firefox on Android, Safari on iOS, current versions and one back.

---

## 10. Content licensing

The app's code and the practice content are separate concerns, and the second one gates public launch.

- Papers produced by a government ministry sit on much firmer ground than a private institution's entrance test.
- A paper may contain third-party material (reading passages sourced from commercial publications) that the issuing institution cannot license to you even if it wants to.
- Written permission should be obtained before any paper is published on a public URL.
- **Requirement:** each `Paper` carries a `source` field, and the UI displays provenance. Papers without cleared permission must not ship in the public build.

Suggested mechanism: a `status: "cleared" | "pending"` field on `Paper`, with the build excluding anything not cleared. Lets you develop against real content without risking an accidental deploy.

---

## 11. Future-proofing for accounts

Put all persistence behind one module — `src/storage/index.ts` — exporting an interface, with a Dexie implementation behind it. Nothing else in the app imports Dexie directly.

```ts
interface AttemptStore {
  listAttempts(paperId: PaperId): Promise<Attempt[]>;
  getAttempt(id: string): Promise<Attempt | null>;
  saveAttempt(a: Attempt): Promise<void>;
  deleteAttempt(id: string): Promise<void>;
  exportAll(): Promise<string>;
  importAll(json: string): Promise<void>;
}
```

Adding cloud sync later becomes one new implementation of this interface, not a rewrite.

---

## 12. Build order

**Phase 1 — content foundation**
Schema, one paper converted to JSON, the validation script. No UI. Do not skip ahead; every later phase depends on the schema being right.

**Phase 2 — study mode**
Question renderers for all six group types, immediate feedback, progress persistence.

**Phase 3 — exam mode**
Timer, auto-submit, expiry-on-reopen, submission flow, results screen.

**Phase 4 — history and retakes**
Attempt list, score chart, review view, skill breakdown, retake-missed.

**Phase 5 — polish**
PWA, offline caching, export/import, dark mode, accessibility pass.

**Phase 6 — content scale**
Additional papers, explanation backfill, skill tag review.

A useful checkpoint: after Phase 2, give it to three students and watch them use it on their own phones without helping. Most of the assumptions worth correcting will surface in that session.

---

## 13. Testing priorities

Highest value first:

1. **Scoring correctness** — every group type, including unanswered and partially answered attempts
2. **Timer behaviour** — expiry while backgrounded, expiry while closed, clock changes, resumption
3. **Content validation** — the script itself needs tests
4. **Retake subsetting** — the missed set is correct and the parent link holds
5. **Export/import round-trip** — data survives intact

---

## 14. Open decisions

- Should study mode allow retrying a question after seeing it was wrong, or lock the answer once submitted?
- Should the score chart show study attempts in a lighter colour, or omit them entirely?
- Is one paper split across multiple sessions worth supporting in exam mode, or does that defeat the purpose?
- How to handle papers with multiple versions (A/B) — separate `Paper` entries, or one paper with a version selector?
- Khmer translations for explanations: valuable, but doubles the authoring cost. Decide before writing 100 of them in English.

---

## 15. Known risks

| Risk | Mitigation |
|---|---|
| Explanation authoring stalls the project | Optional field, ship without, backfill over time |
| Wrong answer key teaches something false | Build-time validation, plus a "report a problem" link on each question |
| Content permission not granted | Build with government-issued papers or original questions; the app is independent of any one source |
| Traffic spike before exam season | Cloudflare Pages has no bandwidth cap; PWA caching keeps repeat load near zero |
| Student loses history clearing browser data | Export/import, plus a prompt to export after every third attempt |