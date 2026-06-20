import { BILLING } from "@/lib/constants";

/**
 * Rolling 30-day billing cycle math (spec §11). Anniversary billing anchored to
 * each doctor's fixed `cycleStartDate` (= signup/₹99 payment). Cycle boundaries
 * NEVER drift with payment timing — every value here is computed purely from
 * `cycleStartDate`, never recalculated around payment events. Late payment only
 * toggles the access-paused flag elsewhere; the dates stay fixed.
 *
 * Day model (Day 1 = signup):
 *   periodStart .......... Day 1 of the cycle
 *   reminderDate ......... Day 25 ("bill ready in 5 days")
 *   periodEnd / dueDate .. Day 30 (invoice generated; next cycle begins Day 31)
 *   graceEndDate ......... Day 40 (if unpaid → access pauses)
 */
const DAY_MS = 86_400_000;
const CYCLE_MS = BILLING.CYCLE_DAYS * DAY_MS;

export interface CycleInfo {
  cycleNumber: number; // 1-based
  periodStart: Date;
  periodEnd: Date; // exclusive end of the cycle window (Day 30 boundary)
  dueDate: Date; // == periodEnd
  reminderDate: Date; // Day 25
  graceEndDate: Date; // Day 40
}

export function cycleByNumber(cycleStartDate: Date, cycleNumber: number): CycleInfo {
  const start = new Date(cycleStartDate.getTime() + (cycleNumber - 1) * CYCLE_MS);
  const periodEnd = new Date(start.getTime() + CYCLE_MS);
  return {
    cycleNumber,
    periodStart: start,
    periodEnd,
    dueDate: periodEnd,
    reminderDate: new Date(start.getTime() + BILLING.REMINDER_DAY * DAY_MS),
    graceEndDate: new Date(start.getTime() + BILLING.GRACE_END_DAY * DAY_MS),
  };
}

/** 1-based number of the cycle containing `at` (>=1). */
export function currentCycleNumber(cycleStartDate: Date, at: Date = new Date()): number {
  const elapsed = at.getTime() - cycleStartDate.getTime();
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / CYCLE_MS) + 1;
}

export function currentCycle(cycleStartDate: Date, at: Date = new Date()): CycleInfo {
  return cycleByNumber(cycleStartDate, currentCycleNumber(cycleStartDate, at));
}

/**
 * The most recently *completed* cycle as of `at` (periodEnd <= at), or null if
 * the very first cycle hasn't closed yet. This is the cycle an invoice is
 * generated for at close.
 */
export function lastCompletedCycle(cycleStartDate: Date, at: Date = new Date()): CycleInfo | null {
  const current = currentCycleNumber(cycleStartDate, at);
  if (current <= 1) return null;
  return cycleByNumber(cycleStartDate, current - 1);
}

/** 1-based day within the current cycle (Day 1 = periodStart). */
export function dayInCurrentCycle(cycleStartDate: Date, at: Date = new Date()): number {
  const { periodStart } = currentCycle(cycleStartDate, at);
  return Math.floor((at.getTime() - periodStart.getTime()) / DAY_MS) + 1;
}
