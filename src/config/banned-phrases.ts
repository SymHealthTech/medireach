/**
 * NMC Guidelines on Ethical Advertising (6 Oct 2026): superlatives, guarantees
 * and outcome claims are not allowed in any doctor-facing free text.
 *
 * THIS IS THE ONE PLACE TO EDIT THE DEFAULT LIST. Admins can override it at
 * runtime from Settings (`Setting.bannedPhrases`); the scanner falls back to
 * these defaults when no override is saved.
 *
 * Matching is case-insensitive, whole-word (so "best" does not flag "bestow"),
 * and tolerant of extra spaces ("no.  1"). Hindi/Marathi transliterations can
 * be appended here later ("sabse accha", "sarvottam", …).
 */
export const DEFAULT_BANNED_PHRASES: readonly string[] = [
  "best",
  "no.1",
  "no. 1",
  "no 1",
  "number one",
  "number 1",
  "#1",
  "top doctor",
  "top-rated",
  "top rated",
  "guaranteed",
  "guarantee",
  "100%",
  "miracle",
  "permanent cure",
  "cure guaranteed",
  "guaranteed cure",
  "most trusted",
  "most experienced",
  "leading",
  "renowned",
  "world class",
  "world-class",
  "expert in curing",
];

/**
 * Outcome / volume claims that a fixed phrase list can't express, e.g.
 * "treated 10,000 patients", "99% success", "5000+ surgeries".
 * `label` is what the dashboard shows as the offending phrase type.
 */
export const BANNED_PATTERNS: readonly { label: string; pattern: RegExp }[] = [
  {
    label: "patient count",
    pattern:
      /\b(?:treated|served|helped|cured|operated(?:\s+on)?|seen|performed)\s+(?:over\s+|more\s+than\s+|above\s+)?\d[\d,]*\+?\s*(?:k\s+)?(?:patients|people|cases|surgeries|operations|procedures|deliveries)\b/giu,
  },
  {
    label: "count claim",
    pattern: /\b\d[\d,]*\+\s*(?:happy\s+)?(?:patients|surgeries|operations|procedures|deliveries|cases)\b/giu,
  },
  {
    label: "success rate",
    pattern: /\b\d{1,3}(?:\.\d+)?\s*%\s*(?:success|cure|recovery|results?|satisfaction)\b/giu,
  },
];
