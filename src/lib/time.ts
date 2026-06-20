/**
 * Day-boundary helpers in IST (UTC+5:30). The clinic queue, daily report, and
 * "last 7 days" list are all day-scoped to the doctor's local day in India, not
 * UTC — otherwise the queue would roll over at 5:30am local time.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function startOfTodayIST(now: Date = new Date()): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

export function startOfDaysAgoIST(days: number, now: Date = new Date()): Date {
  return new Date(startOfTodayIST(now).getTime() - days * 86_400_000);
}

export function endOfTodayIST(now: Date = new Date()): Date {
  return new Date(startOfTodayIST(now).getTime() + 86_400_000);
}
