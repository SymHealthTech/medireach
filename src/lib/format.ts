/** Display formatters (isomorphic). Dates are shown in India time. */

const TZ = "Asia/Kolkata";

export function formatINR(amount: number | null | undefined): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** "2 hours ago" style, for activity feeds and autosave. */
export function timeAgo(d: Date | string, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

/** yyyy-mm-dd in India time (for <input type="date">). */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const ist = new Date(new Date(d).getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

/** Start of the month (India time) `monthsAgo` months back, as a UTC Date. */
export function startOfMonthIST(monthsAgo = 0, now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth() - monthsAgo;
  return new Date(Date.UTC(y, m, 1) - 5.5 * 3600 * 1000);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short", timeZone: TZ });
}
