/**
 * Clinic timing helpers. Pure and isomorphic: the server renders the full
 * week, and the client computes "today" and "open now" in India time.
 */

export interface Slot {
  open: string; // "HH:mm"
  close: string;
}

export interface DayTimings {
  day: number; // 0 = Sunday
  slots: Slot[];
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Display order: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "14:30" → "2:30 pm". */
export function formatTime(hhmm: string): string {
  const mins = toMinutes(hhmm);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatSlots(slots: Slot[]): string {
  if (slots.length === 0) return "Closed";
  return slots.map((s) => `${formatTime(s.open)} – ${formatTime(s.close)}`).join(", ");
}

export function slotsForDay(timings: DayTimings[], day: number): Slot[] {
  return [...(timings.find((t) => t.day === day)?.slots ?? [])].sort(
    (a, b) => toMinutes(a.open) - toMinutes(b.open),
  );
}

/** Current day (0–6) and minutes since midnight in India time. */
export function nowInIndia(now: Date = new Date()): { day: number; minutes: number } {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return { day: ist.getUTCDay(), minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
}

export function isOpenAt(timings: DayTimings[], at: { day: number; minutes: number }): boolean {
  return slotsForDay(timings, at.day).some((s) => {
    const open = toMinutes(s.open);
    const close = toMinutes(s.close);
    return close > open ? at.minutes >= open && at.minutes < close : at.minutes >= open; // past-midnight slot
  });
}

export function hasAnyTimings(timings: DayTimings[]): boolean {
  return timings.some((t) => t.slots.length > 0);
}

/**
 * Human summary grouping identical days: "Mon–Sat: 10 am – 1 pm, 5 pm – 9 pm · Sun: Closed".
 */
export function weekSummary(timings: DayTimings[]): string {
  const groups: { days: number[]; text: string }[] = [];
  for (const day of WEEK_ORDER) {
    const text = formatSlots(slotsForDay(timings, day));
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.text === text) lastGroup.days.push(day);
    else groups.push({ days: [day], text });
  }
  return groups
    .map((g) => {
      const first = DAY_SHORT[g.days[0]!];
      const label = g.days.length === 1 ? first : `${first}–${DAY_SHORT[g.days.at(-1)!]}`;
      return `${label}: ${g.text}`;
    })
    .join(" · ");
}

/**
 * Compact summary of open days only, grouping days that share the same hours:
 * "Mon–Sat · 10 am – 1 pm, 6 pm – 9 pm" or "Mon, Wed, Fri · 5 pm – 8:30 pm".
 * Returns "" when closed all week; groups joined with " | ".
 */
export function openDaysSummary(timings: DayTimings[]): string {
  const byHours = new Map<string, number[]>();
  for (const day of WEEK_ORDER) {
    const slots = slotsForDay(timings, day);
    if (slots.length === 0) continue;
    const text = formatSlots(slots);
    byHours.set(text, [...(byHours.get(text) ?? []), day]);
  }
  const position = (d: number) => WEEK_ORDER.indexOf(d as (typeof WEEK_ORDER)[number]);
  const dayLabel = (days: number[]) => {
    const runs: number[][] = [];
    for (const d of days) {
      const last = runs.at(-1);
      if (last && position(d) === position(last.at(-1)!) + 1) last.push(d);
      else runs.push([d]);
    }
    return runs
      .map((r) => (r.length >= 3 ? `${DAY_SHORT[r[0]!]}–${DAY_SHORT[r.at(-1)!]}` : r.map((d) => DAY_SHORT[d]).join(", ")))
      .join(", ");
  };
  return [...byHours.entries()].map(([hours, days]) => `${dayLabel(days)} · ${hours}`).join(" | ");
}

/** schema.org OpeningHoursSpecification, grouping days that share a slot. */
export function openingHoursSpecification(timings: DayTimings[]) {
  const bySlot = new Map<string, number[]>();
  for (const t of timings) {
    for (const s of t.slots) {
      const key = `${s.open}-${s.close}`;
      bySlot.set(key, [...(bySlot.get(key) ?? []), t.day]);
    }
  }
  return [...bySlot.entries()].map(([key, days]) => {
    const [opens, closes] = key.split("-");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...new Set(days)].sort().map((d) => `https://schema.org/${SCHEMA_DAYS[d]}`),
      opens,
      closes,
    };
  });
}

// --- Timings typed as text (website forms) ---------------------------------

const DAY_RE = String.raw`(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?`;
const DAY_RANGE = String.raw`\b${DAY_RE}\s*(?:-|–|—|to|till|until)\s*${DAY_RE}`;
/** Monday-first position of a day (0 = Sunday → 6). */
const pos = (d: number) => (d + 6) % 7;
const dayOf = (w: string) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(w.slice(0, 3).toLowerCase());

function daysIn(seg: string): number[] | null {
  const s = seg.toLowerCase();
  if (/\b(daily|every\s*day|everyday|all\s*days|7\s*days|all\s*week)\b/.test(s)) return [1, 2, 3, 4, 5, 6, 0];
  const out = new Set<number>();
  if (/\bweekdays?\b/.test(s)) [1, 2, 3, 4, 5].forEach((d) => out.add(d));
  if (/\bweekends?\b/.test(s)) [6, 0].forEach((d) => out.add(d));
  const range = new RegExp(DAY_RANGE, "gi");
  let rest = s;
  for (const m of s.matchAll(range)) {
    const a = dayOf(m[1]!);
    const b = dayOf(m[2]!);
    for (let i = pos(a); ; i = (i + 1) % 7) {
      out.add((i + 1) % 7);
      if (i === pos(b)) break;
    }
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(new RegExp(String.raw`\b${DAY_RE}`, "gi"))) out.add(dayOf(m[1]!));
  return out.size ? [...out] : null;
}

const SUFFIX = String.raw`(a\.?m\.?|p\.?m\.?|noon)?`;
const TIME_RANGE = new RegExp(String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*${SUFFIX}\s*(?:-|–|—|to|till|until)\s*(\d{1,2})(?:[:.](\d{2}))?\s*${SUFFIX}`, "gi");

const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const isPm = (s?: string) => !!s && /^(p|noon)/i.test(s);
const isAm = (s?: string) => !!s && /^a/i.test(s);
/** 12-hour → 24-hour; 13+ is already 24-hour; a bare 12 is noon (clinic hours). */
const to24 = (h: number, pm: boolean) => (h >= 12 ? h : pm ? h + 12 : h);

/** "10 to 2 pm" → 10:00–14:00; "6 to 9 pm" → 18:00–21:00; "10–1" → 10:00–13:00; "evening 6-9" → 18:00–21:00. */
function slotsIn(seg: string): Slot[] {
  const s = seg.toLowerCase();
  const out: Slot[] = [];
  for (const m of s.matchAll(TIME_RANGE)) {
    const before = s.slice(Math.max(0, m.index! - 24), m.index);
    const morning = /morning/.test(before);
    const evening = /evening|night|afternoon/.test(before);
    const [h1, m1, s1, h2, m2, s2] = [Number(m[1]), Number(m[2] ?? 0), m[3], Number(m[4]), Number(m[5] ?? 0), m[6]];
    if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) continue;
    const pm1 = s1 ? isPm(s1) : s2 && isPm(s2) ? evening || (!morning && h1 <= h2 && h1 !== 12) : s2 && isAm(s2) ? false : evening || (!morning && h1 < 7);
    const pm2 = s2 ? isPm(s2) : pm1 || h2 <= h1 || (!morning && h2 < 7);
    const open = hhmm(to24(h1, pm1), m1);
    const close = hhmm(to24(h2, pm2), m2);
    if (open < close) out.push({ open, close });
  }
  return out;
}

/**
 * Timings typed in a website form ("Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm",
 * "Sunday closed", "Mon-Sat morning 10 to 2 pm\nevening 6 to 9 pm") as a week
 * of slots, Monday first. Lines without days use the days of the line before
 * (Monday to Saturday if none were named). Null when nothing could be read.
 */
export function parseTimingsText(text: string): DayTimings[] | null {
  const week = new Map<number, Slot[]>(WEEK_ORDER.map((d) => [d, []]));
  let current: number[] = [1, 2, 3, 4, 5, 6];
  let found = false;
  for (const seg of text.split(/\r?\n|;/).map((x) => x.trim()).filter(Boolean)) {
    const days = daysIn(seg);
    if (days) current = days;
    const withoutDays = seg.replace(new RegExp(DAY_RANGE, "gi"), " ");
    const slots = slotsIn(withoutDays);
    if (/\b(closed|holiday|off)\b/i.test(seg) && slots.length === 0) {
      for (const d of current) week.set(d, []);
      found = true;
      continue;
    }
    for (const d of current) week.set(d, [...week.get(d)!, ...slots]);
    if (slots.length) found = true;
  }
  if (!found) return null;
  return WEEK_ORDER.map((day) => {
    const seen = new Set<string>();
    const slots = week
      .get(day)!
      .filter((x) => !seen.has(`${x.open}-${x.close}`) && seen.add(`${x.open}-${x.close}`))
      .sort((a, b) => a.open.localeCompare(b.open));
    return { day, slots };
  });
}

/**
 * A week of slots as website-form text, one line per group of days with the
 * same hours: "Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm\nSun: Closed". Reads back
 * with `parseTimingsText`. "" when closed all week.
 */
export function timingsToText(timings: DayTimings[]): string {
  if (!hasAnyTimings(timings)) return "";
  const groups = new Map<string, number[]>();
  for (const day of WEEK_ORDER) {
    const text = formatSlots(slotsForDay(timings, day));
    groups.set(text, [...(groups.get(text) ?? []), day]);
  }
  const position = (d: number) => WEEK_ORDER.indexOf(d as (typeof WEEK_ORDER)[number]);
  const label = (days: number[]) => {
    const runs: number[][] = [];
    for (const d of days) {
      const last = runs.at(-1);
      if (last && position(d) === position(last.at(-1)!) + 1) last.push(d);
      else runs.push([d]);
    }
    return runs.map((r) => (r.length >= 2 ? `${DAY_SHORT[r[0]!]}–${DAY_SHORT[r.at(-1)!]}` : DAY_SHORT[r[0]!])).join(", ");
  };
  return [...groups.entries()].map(([hours, days]) => `${label(days)}: ${hours}`).join("\n");
}

const MON_SAT = [1, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];
const week = (days: number[], slots: Slot[], extra: Record<number, Slot[]> = {}): DayTimings[] =>
  WEEK_ORDER.map((day) => ({ day, slots: (extra[day] ?? (days.includes(day) ? slots : [])).map((s) => ({ ...s })) }));

/** One-tap starting points for weekly timings (both website forms and the admin editors). */
export const TIMING_PRESETS: { label: string; timings: DayTimings[] }[] = [
  { label: "Mon–Sat · 10–1 and 6–9", timings: week(MON_SAT, [{ open: "10:00", close: "13:00" }, { open: "18:00", close: "21:00" }]) },
  { label: "Mon–Sat · 9 am – 9 pm", timings: week(MON_SAT, [{ open: "09:00", close: "21:00" }]) },
  { label: "Mon–Sat · 10 am – 7 pm", timings: week(MON_SAT, [{ open: "10:00", close: "19:00" }]) },
  { label: "Mon–Fri · 9 am – 5 pm", timings: week(MON_FRI, [{ open: "09:00", close: "17:00" }]) },
  { label: "Evenings only · 6–9 pm", timings: week(MON_SAT, [{ open: "18:00", close: "21:00" }]) },
  {
    label: "Mon–Sat 10–1, 6–9 · Sun 10–1",
    timings: week(MON_SAT, [{ open: "10:00", close: "13:00" }, { open: "18:00", close: "21:00" }], { 0: [{ open: "10:00", close: "13:00" }] }),
  },
  { label: "All days · 8 am – 10 pm", timings: week([1, 2, 3, 4, 5, 6, 0], [{ open: "08:00", close: "22:00" }]) },
];
