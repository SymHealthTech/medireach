/** Visit days are India dates, "YYYY-MM-DD" (safe on server and client). */

const IST_MS = 5.5 * 3600_000;

export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);
}

/** "2026-11-27" minus n days. */
export function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** The last `n` days ending today, oldest first. */
export function lastDays(n: number, today = todayIST()): string[] {
  return Array.from({ length: n }, (_, i) => daysBefore(today, n - 1 - i));
}

/** "Thu, 27 Nov" (or "Today" / "Yesterday"). */
export function dayLabel(day: string, today = todayIST()): string {
  if (day === today) return "Today";
  if (day === daysBefore(today, 1)) return "Yesterday";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
