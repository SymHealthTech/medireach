import { BANNED_PATTERNS, DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";

/**
 * NMC compliance scanner. Pure and isomorphic, so the dashboard can highlight
 * offending phrases live while the server re-runs the same check before
 * publishing (never trust the client).
 */

export interface PhraseMatch {
  /** The banned phrase (or pattern label) that matched. */
  phrase: string;
  /** The exact text found, for highlighting. */
  match: string;
  index: number;
  length: number;
}

export interface ComplianceIssue {
  /** Dotted path of the field, e.g. "fullBio" or "awards.0.title". */
  field: string;
  phrase: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a whole-word matcher for a phrase. `\b` doesn't work for phrases that
 * start/end with symbols ("#1", "100%"), so we use Unicode letter/number
 * lookarounds instead. Runs of whitespace in the phrase match any whitespace.
 */
function phraseRegExp(phrase: string): RegExp {
  const body = phrase
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

const compiled = new Map<string, RegExp>();
function getPhraseRegExp(phrase: string): RegExp {
  let re = compiled.get(phrase);
  if (!re) {
    re = phraseRegExp(phrase);
    compiled.set(phrase, re);
  }
  re.lastIndex = 0;
  return re;
}

/** Every banned phrase / pattern occurrence in `text`, in reading order. */
export function scanText(
  text: string | null | undefined,
  phrases: readonly string[] = DEFAULT_BANNED_PHRASES,
): PhraseMatch[] {
  if (!text) return [];
  const matches: PhraseMatch[] = [];

  for (const phrase of phrases) {
    if (!phrase.trim()) continue;
    for (const m of text.matchAll(getPhraseRegExp(phrase.toLowerCase()))) {
      matches.push({ phrase, match: m[0], index: m.index, length: m[0].length });
    }
  }
  for (const { label, pattern } of BANNED_PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      matches.push({ phrase: label, match: m[0], index: m.index, length: m[0].length });
    }
  }

  // Drop matches contained inside a longer one ("guarantee" inside
  // "cure guaranteed" is reported once, as the longer phrase).
  matches.sort((a, b) => a.index - b.index || b.length - a.length);
  const result: PhraseMatch[] = [];
  let coveredUntil = -1;
  for (const m of matches) {
    if (m.index + m.length <= coveredUntil) continue;
    result.push(m);
    coveredUntil = Math.max(coveredUntil, m.index + m.length);
  }
  return result;
}

/** Strip HTML tags so rich-text fields are scanned as plain text. */
export function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}

/**
 * Scan a flat map of `field path → text` and return one issue per distinct
 * (field, phrase) pair — the shape stored in `DoctorProfile.compliance.issues`.
 */
export function scanFields(
  fields: Record<string, string | null | undefined>,
  phrases: readonly string[] = DEFAULT_BANNED_PHRASES,
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const [field, value] of Object.entries(fields)) {
    const seen = new Set<string>();
    for (const m of scanText(value, phrases)) {
      const key = m.match.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({ field, phrase: m.match });
    }
  }
  return issues;
}
