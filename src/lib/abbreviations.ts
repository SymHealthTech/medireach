/**
 * Local dosing-abbreviation dictionary (Change 5 — zero-cost, both tiers).
 *
 * This is a PURE local lookup: it turns a doctor's typed clinical shorthand into
 * patient-friendly plain language with NO API call of any kind (no Claude, no
 * speech-to-text). It is therefore safe on Starter, where paid APIs are blocked,
 * and is also used on Pro for consistency.
 *
 * Edit these tables to change how shorthand expands — this file is the single
 * source of truth for frequency/timing/type expansion used by the medicine
 * editor and the `expandAbbreviations` helper. (Doctors additionally keep their
 * own personal shortcut dictionary in the CustomKeyword collection — spec §9.5 —
 * which is likewise a local DB lookup, never an API call.)
 */

/** Dosing frequency → patient-facing phrase. Keys are matched case-insensitively. */
export const FREQUENCY_EXPANSIONS: Record<string, string> = {
  od: "once a day",
  bd: "twice a day",
  bid: "twice a day",
  tds: "3 times a day",
  tid: "3 times a day",
  qid: "4 times a day",
  qds: "4 times a day",
  hs: "at bedtime",
  sos: "when needed",
  stat: "immediately",
  weekly: "once a week",
  fortnightly: "once in 2 weeks",
};

/** Timing / food-relation shorthand → patient-facing phrase. */
export const TIMING_EXPANSIONS: Record<string, string> = {
  ac: "before food",
  pc: "after food",
  hs: "at bedtime",
  bbf: "before breakfast",
  om: "in the morning",
  on: "at night",
};

/** Dosage-form shorthand → patient-facing noun. */
export const FORM_EXPANSIONS: Record<string, string> = {
  tab: "tablet",
  cap: "capsule",
  syr: "syrup",
  susp: "suspension",
  inj: "injection",
  drops: "drop",
  gel: "application of gel",
  cream: "application of cream",
  oint: "application of ointment",
  inhaler: "puff",
  patch: "patch",
  sachet: "sachet",
  spray: "spray",
  powder: "sachet of powder",
  loz: "lozenge",
  supp: "suppository",
};

/** All tables merged, for whole-word token expansion of free-typed text. */
const ALL_EXPANSIONS: Record<string, string> = {
  ...FORM_EXPANSIONS,
  ...TIMING_EXPANSIONS,
  ...FREQUENCY_EXPANSIONS,
};

/** Look up a single abbreviation (case-insensitive), or undefined if unknown. */
export function expandFrequency(token: string): string | undefined {
  return FREQUENCY_EXPANSIONS[token.trim().toLowerCase()];
}

export function expandTiming(token: string): string | undefined {
  return TIMING_EXPANSIONS[token.trim().toLowerCase()];
}

/**
 * Expand every recognised dosing abbreviation appearing as a whole word in a
 * free-typed string into plain patient language, leaving everything else
 * untouched. Punctuation-trailing tokens (e.g. "tds,") are handled. Pure and
 * synchronous — never calls an API. This is what produces a Starter
 * prescription's patient-facing instruction text.
 */
export function expandAbbreviations(text: string): string {
  if (!text) return text;
  return text.replace(/[A-Za-z]+/g, (word) => {
    const hit = ALL_EXPANSIONS[word.toLowerCase()];
    return hit ?? word;
  });
}
