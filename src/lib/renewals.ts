import { RENEWAL_DUE_SOON_DAYS, RENEWAL_REMINDER_DAYS, type PriceKey, type RenewalStatus } from "@/lib/constants";

/**
 * Yearly renewals (from year 2) for every product.
 *
 *   active   due date more than 30 days away (or not set yet)
 *   due      due within the next 30 days
 *   overdue  past the due date; the site stays live during the grace period
 *   lapsed   past due + grace days, set only by the daily renewals job (the
 *            page then shows "temporarily unavailable"; paying restores it)
 *
 * `grace` is in the spec's enum but has no separate meaning from `overdue`, so
 * it's never computed; it stays valid for data compatibility.
 */

const DAY = 86_400_000;

export function addYears(d: Date, years: number): Date {
  const out = new Date(d);
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}

/** Status from the due date. Never returns `lapsed`: only the renewals job lapses a site. */
export function computeRenewalStatus(due: Date | undefined | null, now: Date = new Date()): Exclude<RenewalStatus, "lapsed" | "grace"> {
  if (!due) return "active";
  const ms = due.getTime() - now.getTime();
  if (ms > RENEWAL_DUE_SOON_DAYS * DAY) return "active";
  if (ms >= 0) return "due";
  return "overdue";
}

/** True once the grace period after the due date is over (the job lapses these). */
export function isPastGrace(due: Date | undefined | null, graceDays: number, now: Date = new Date()): boolean {
  return Boolean(due && now.getTime() - due.getTime() > graceDays * DAY);
}

/** Default due date for a first setup payment: one year later. */
export function firstRenewalDue(setupPaidAt: Date): Date {
  return addYears(setupPaidAt, 1);
}

/** What a site is, for renewal pricing and labels. Add-on doctors renew at the doctor price. */
export type RenewalProduct = "doctor" | "clinic" | "hospital";

export const RENEWAL_PRODUCT_LABEL: Record<RenewalProduct, string> = {
  doctor: "doctor portfolio",
  clinic: "clinic website",
  hospital: "hospital website",
};

/** List renewal price from Settings for a product, normal or founding. */
export function listRenewalPrice(product: RenewalProduct, founding: boolean, prices: Record<PriceKey, number>): number {
  if (product === "hospital") return founding ? prices.foundingRenewalHospital : prices.renewalHospital;
  if (founding) return prices.foundingRenewal;
  return product === "clinic" ? prices.renewalClinic : prices.renewalDoctor;
}

/** Status to show: a lapsed site stays lapsed until paid; otherwise worked out live from the due date. */
export function displayRenewalStatus(stored: RenewalStatus | undefined, due: Date | undefined | null, now: Date = new Date()): RenewalStatus {
  return stored === "lapsed" ? "lapsed" : computeRenewalStatus(due, now);
}

// ---------------------------------------------------------------------------
// Reminder emails (30, 7 and 0 days before the due date)
// ---------------------------------------------------------------------------

const IST_OFFSET = 5.5 * 3600_000;

/** Calendar date in India, "YYYY-MM-DD". */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET).toISOString().slice(0, 10);
}

/** Whole calendar days (India time) from `now` to `due`; negative once the due date has passed. */
export function daysUntilDue(due: Date, now: Date = new Date()): number {
  return Math.round((Date.parse(istDay(due)) - Date.parse(istDay(now))) / DAY);
}

export type ReminderDay = (typeof RENEWAL_REMINDER_DAYS)[number];

export const reminderKey = (due: Date, days: ReminderDay) => `${istDay(due)}:${days}`;

/**
 * Which reminder (if any) the daily job should send now. It picks the one
 * that applies today: 30 days out → the 30-day email, 7 → the 7-day email, on
 * or after the due date → the due-date email. If the job missed some days,
 * only the current reminder goes out and the earlier ones are marked as done,
 * so nobody gets a stale "due in 30 days" email a week before the date.
 *
 * `sent` holds keys for this and earlier due dates; only this due date counts.
 */
export function reminderToSend(
  due: Date,
  sent: readonly string[],
  now: Date = new Date(),
): { days: ReminderDay; key: string; markSent: string[] } | null {
  const left = daysUntilDue(due, now);
  if (left > RENEWAL_REMINDER_DAYS[0]) return null;
  const days = [...RENEWAL_REMINDER_DAYS].reverse().find((t) => left <= t) ?? 0;
  const key = reminderKey(due, days);
  if (sent.includes(key)) return null;
  const markSent = RENEWAL_REMINDER_DAYS.filter((t) => t >= days).map((t) => reminderKey(due, t));
  return { days, key, markSent };
}

export const dateIN = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** Pre-written WhatsApp renewal reminder (copied by the admin, sent by hand). */
export function renewalReminderText(r: {
  name: string;
  product: RenewalProduct;
  due: Date;
  price: number;
  link?: string;
  now?: Date;
}): string {
  const past = r.due.getTime() < (r.now ?? new Date()).getTime();
  const what = `your ${RENEWAL_PRODUCT_LABEL[r.product]}${r.link ? ` (${r.link})` : ""}`;
  return [
    `Hello ${r.name}, this is MediReach.`,
    `The yearly renewal for ${what} ${past ? "was due" : "is due"} on ${dateIN(r.due)}: ₹${r.price.toLocaleString("en-IN")}.`,
    "You can pay by UPI or bank transfer; reply here and we'll send the details. Thank you.",
  ].join(" ");
}
