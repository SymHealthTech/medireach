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
