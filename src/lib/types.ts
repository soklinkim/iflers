export const SKILLS = {
  "verb-tense": "Verb tenses",
  "articles": "Articles (a/an/the)",
  "subject-verb-agreement": "Subject-verb agreement",
  "word-order": "Word order",
  "prepositions": "Prepositions",
  "conditionals": "Conditionals",
  "inversion": "Inversion",
  "comparatives": "Comparatives",
  "modals": "Modal verbs",
  "collocation": "Collocation",
  "idiom": "Idioms",
  "word-formation": "Word formation",
  "vocabulary-in-context": "Vocabulary in context",
  "skimming": "Skimming for main idea",
  "scanning": "Scanning for detail",
  "inference": "Inference",
  "text-organisation": "Text organisation",
  "determiners": "Determiners",
  "quantifiers": "Quantifiers",
  "question-tags": "Question tags",
  "pronouns": "Pronoun case",
  "gerund-infinitive": "Gerunds and infinitives",
  "passive-voice": "Passive voice",
  "participle-clauses": "Participle clauses",
  "relative-clauses": "Relative clauses",
  "parallel-structure": "Parallel structure",
  "embedded-questions": "Embedded questions",
  "causatives": "Causative verbs",
  "adverb-position": "Adverb position",
  "conjunctions": "Conjunctions",
  "synonyms": "Synonyms",
  "phrasal-verbs": "Phrasal verbs",
  "subjunctive": "Subjunctive mood",
  "paraphrase": "Paraphrasing",
} as const;

export type SkillTag = keyof typeof SKILLS;

// ---------------------------------------------------------------------------
// Content model (papers, sections, groups, questions)
// ---------------------------------------------------------------------------

export type PaperId = string; // "ifl-2017-a"
export type QuestionId = string; // "ifl-2017-a-q88"

export type PaperStatus = "cleared" | "pending";

export interface Paper {
  id: PaperId;
  title: string; // display name
  year: number;
  version?: string; // "A" — some papers have multiple versions
  source: string; // provenance, shown in UI
  /** Publication gate — papers without cleared permission must not ship publicly. */
  status: PaperStatus;
  totalQuestions: number; // expected to equal flattened question count
  durationMinutes: number; // 90
  sections: Section[];
}

export interface Section {
  id: string; // "grammar" | "vocabulary" | "reading"
  title: string; // "Section I: Grammar"
  groups: Group[];
}

/**
 * A Group is a run of questions that share context.
 * A group of one standalone MCQ is normal — do not special-case it.
 */
export interface Group {
  id: string;
  type: GroupType;
  instruction: string; // the italic rubric printed above the questions
  stimulus?: Stimulus; // passage shared by all questions in the group
  sharedOptions?: Option[]; // e.g. the list of headings
  optionsExceedItems?: boolean; // more headings than paragraphs
  optionUseOnce?: boolean; // each heading used at most once
  questions: Question[];
}

export type GroupType =
  | "mcq" // standalone sentence-completion
  | "cloze" // numbered gaps inside a shared passage
  | "vocab-inline" // sentence with an underlined span
  | "passage-mcq" // questions about a shared reading passage
  | "heading-match" // match paragraphs to a shared list of headings
  | "yes-no-ng"; // statement vs. passage

export interface Stimulus {
  title?: string;
  /** Ordered blocks. Cloze gaps are marked inline as {{35}}. */
  blocks: StimulusBlock[];
}

export interface StimulusBlock {
  label?: string; // "A", "B" — for heading-match paragraphs
  kind: "paragraph" | "subheading" | "image";
  /** May contain {{n}} gap markers and **bold** spans. Absent for "image" blocks. */
  text?: string;
  /** Only for kind: "image" — path under /public, e.g. "/papers/ifl-2018-b-q74-83.png". */
  src?: string;
  /** Only for kind: "image" — accessible description of the graphic. */
  alt?: string;
}

export interface Question {
  id: QuestionId;
  n: number; // printed number, 1..100
  prompt?: string; // absent for cloze (the gap is in the stimulus)
  /** For vocab-inline: character range in prompt to underline. */
  highlight?: { start: number; end: number };
  /** Absent when the group supplies sharedOptions. */
  options?: Option[];
  answerId: string;
  explanation?: string; // OPTIONAL — app degrades gracefully
  skills: SkillTag[];
}

export interface Option {
  id: string; // "A" | "B" | "i" | "xvii" | "yes" | "ng"
  text: string;
}

/** A question flattened out of its group/section, with the context needed to render and score it. */
export interface FlatQuestion {
  question: Question;
  group: Group;
  section: Section;
  /** Resolved options for this question — its own, or the group's sharedOptions. */
  options: Option[];
}

// ---------------------------------------------------------------------------
// Attempt records
// ---------------------------------------------------------------------------

export type Mode = "study" | "exam";

export interface Attempt {
  id: string; // uuid
  paperId: PaperId;
  mode: Mode;
  /** Set when this is a retake of missed questions from another attempt. */
  parentAttemptId?: string;
  /** Questions included. Full attempt = every id; retake = the missed subset. */
  questionIds: QuestionId[];
  startedAt: number; // epoch ms
  expiresAt?: number; // startedAt + duration, exam mode only
  submittedAt?: number;
  autoSubmitted: boolean;
  status: "in-progress" | "submitted" | "abandoned";
  answers: Record<QuestionId, string | null>;
  flagged: QuestionId[];
  score?: { correct: number; total: number };
}

export interface SkillBreakdownEntry {
  skill: SkillTag;
  correct: number;
  total: number;
  missed: number;
}

export interface SectionBreakdownEntry {
  sectionId: string;
  sectionTitle: string;
  correct: number;
  total: number;
}
