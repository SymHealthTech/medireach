import { describe, expect, it } from "vitest";
import { computeCycleCharge, computePerPatientTotal } from "@/lib/billing/charge";
import { computeInclusiveTax, isInterStateSupply } from "@/lib/billing/tax";
import { TAX } from "@/lib/constants";
import {
  cycleByNumber,
  currentCycleNumber,
  lastCompletedCycle,
  dayInCurrentCycle,
} from "@/lib/billing/cycle";

/**
 * Billing math edge cases (build-prompt: test the calculation in isolation
 * against 0, exactly 1,000, and 1,001 before wiring it into the cron). Charge =
 * greater of ₹299 or per-patient total; ₹1.5/patient ≤1000, ₹1/patient beyond.
 */
describe("computeCycleCharge (spec §11)", () => {
  it("charges the ₹299 floor for 0 patients", () => {
    expect(computeCycleCharge(0)).toBe(299);
  });

  it("keeps the floor below the ~200-patient crossover", () => {
    expect(computeCycleCharge(100)).toBe(299); // 100*1.5 = 150 < 299
    expect(computeCycleCharge(199)).toBe(299); // 298.5 < 299
  });

  it("per-patient overtakes the floor around 200 patients", () => {
    expect(computeCycleCharge(200)).toBe(300); // 200*1.5 = 300 > 299
    expect(computeCycleCharge(201)).toBe(301.5);
  });

  it("charges ₹1.5 each up to exactly 1,000", () => {
    expect(computePerPatientTotal(1000)).toBe(1500);
    expect(computeCycleCharge(1000)).toBe(1500);
  });

  it("charges ₹1 for each patient beyond 1,000", () => {
    expect(computePerPatientTotal(1001)).toBe(1501); // 1500 + 1
    expect(computePerPatientTotal(1500)).toBe(2000); // 1500 + 500
    expect(computeCycleCharge(1001)).toBe(1501);
  });

  it("never returns less than the floor and ignores negatives", () => {
    expect(computeCycleCharge(-5)).toBe(299);
  });
});

const round2 = (v: number) => Math.round(v * 100) / 100;

describe("computeInclusiveTax (GST, inclusive pricing)", () => {
  it("defaults to disabled — whole amount is taxable value, no tax", () => {
    expect(TAX.ENABLED).toBe(false); // guard: don't collect GST before registration
    const t = computeInclusiveTax(299);
    expect(t.enabled).toBe(false);
    expect(t.taxableValue).toBe(299);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(299);
  });

  it("back-computes 18% IGST from an inclusive total (inter-state)", () => {
    const t = computeInclusiveTax(299, { enabled: true, rate: 18, interState: true });
    expect(t.total).toBe(299); // inclusive: payable is unchanged
    expect(t.taxableValue).toBe(253.39); // 299 / 1.18
    expect(t.taxAmount).toBe(45.61);
    expect(t.igst).toBe(45.61);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(round2(t.taxableValue + t.taxAmount)).toBe(299);
  });

  it("splits into equal CGST + SGST intra-state", () => {
    const t = computeInclusiveTax(354, { enabled: true, rate: 18, interState: false });
    expect(t.igst).toBe(0);
    expect(t.cgst).toBe(t.sgst);
    expect(round2(t.cgst + t.sgst)).toBe(t.taxAmount);
  });

  it("determines inter- vs intra-state supply from the clinic state code", () => {
    expect(TAX.SELLER_STATE_CODE).toBe(""); // unset until registration
    // With no seller state configured, everything defaults to inter-state (IGST).
    expect(isInterStateSupply("27")).toBe(true);
    expect(isInterStateSupply("")).toBe(true);
    expect(isInterStateSupply(undefined)).toBe(true);
  });
});

describe("billing cycle math (spec §11) — dates never drift", () => {
  const start = new Date("2026-01-01T00:00:00Z");

  it("computes fixed 30-day boundaries from cycleStartDate", () => {
    const c1 = cycleByNumber(start, 1);
    expect(c1.periodStart.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(c1.periodEnd.toISOString()).toBe("2026-01-31T00:00:00.000Z"); // +30d
    expect(c1.reminderDate.toISOString()).toBe("2026-01-26T00:00:00.000Z"); // day 25
    expect(c1.graceEndDate.toISOString()).toBe("2026-02-10T00:00:00.000Z"); // day 40
  });

  it("cycle 3 starts exactly 60 days after signup regardless of payments", () => {
    const c3 = cycleByNumber(start, 3);
    expect(c3.periodStart.toISOString()).toBe("2026-03-02T00:00:00.000Z"); // +60d
  });

  it("identifies the current cycle number", () => {
    expect(currentCycleNumber(start, new Date("2026-01-01T00:00:00Z"))).toBe(1);
    expect(currentCycleNumber(start, new Date("2026-01-30T23:59:00Z"))).toBe(1);
    expect(currentCycleNumber(start, new Date("2026-01-31T00:00:00Z"))).toBe(2);
  });

  it("returns the last completed cycle for invoicing", () => {
    expect(lastCompletedCycle(start, new Date("2026-01-15T00:00:00Z"))).toBeNull();
    const closed = lastCompletedCycle(start, new Date("2026-02-01T00:00:00Z"));
    expect(closed?.cycleNumber).toBe(1);
  });

  it("computes the day within the current cycle", () => {
    expect(dayInCurrentCycle(start, new Date("2026-01-01T06:00:00Z"))).toBe(1);
    expect(dayInCurrentCycle(start, new Date("2026-01-25T06:00:00Z"))).toBe(25);
  });
});
