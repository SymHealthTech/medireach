import { describe, expect, it } from "vitest";
import { startOfTodayIST, startOfDaysAgoIST, endOfTodayIST } from "@/lib/time";

/**
 * The queue/report day boundary must be the clinic's local IST day, not UTC —
 * otherwise the queue would roll over at 5:30am local time (spec §3.2/§9.4).
 */
describe("IST day boundaries", () => {
  it("treats just-after-IST-midnight as the start of today", () => {
    // 2026-06-18 00:10 IST == 2026-06-17 18:40 UTC.
    const now = new Date("2026-06-17T18:40:00Z");
    const start = startOfTodayIST(now);
    // Start of IST day = 2026-06-17 18:30 UTC.
    expect(start.toISOString()).toBe("2026-06-17T18:30:00.000Z");
  });

  it("late-evening IST still maps to the same IST day", () => {
    // 2026-06-18 23:00 IST == 2026-06-18 17:30 UTC.
    const now = new Date("2026-06-18T17:30:00Z");
    expect(startOfTodayIST(now).toISOString()).toBe("2026-06-17T18:30:00.000Z");
  });

  it("spans exactly 24h between start and end of today", () => {
    const now = new Date("2026-06-18T12:00:00Z");
    expect(endOfTodayIST(now).getTime() - startOfTodayIST(now).getTime()).toBe(86_400_000);
  });

  it("computes N days ago correctly", () => {
    const now = new Date("2026-06-18T12:00:00Z");
    const diff = startOfTodayIST(now).getTime() - startOfDaysAgoIST(7, now).getTime();
    expect(diff).toBe(7 * 86_400_000);
  });
});
