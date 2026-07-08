import { describe, expect, it } from "vitest";
import { sanitizeAmount, duesStatus, buildInitialDues } from "@/lib/dues/compute";

/**
 * Patient Dues money math is pure (no AI, no DB) — these tests pin the
 * fee/paid/due arithmetic and the derived paid/partial/unpaid status that the
 * post-prescription capture, settlement, and fee correction all rely on. This
 * feature is the clinic's own fee bookkeeping, separate from subscription billing.
 */
describe("sanitizeAmount", () => {
  it("clamps to non-negative whole rupees", () => {
    expect(sanitizeAmount(299.6)).toBe(300);
    expect(sanitizeAmount(-50)).toBe(0);
    expect(sanitizeAmount("abc")).toBe(0);
    expect(sanitizeAmount(Number.NaN)).toBe(0);
  });

  it("caps at the sane maximum", () => {
    expect(sanitizeAmount(99_999_999)).toBe(10_000_000);
  });
});

describe("duesStatus", () => {
  it("is paid when nothing is owed", () => {
    expect(duesStatus(300, 300)).toBe("paid");
    expect(duesStatus(300, 400)).toBe("paid"); // over-collected still settles
    expect(duesStatus(0, 0)).toBe("paid");     // no fee → nothing owed
  });
  it("is unpaid when nothing collected", () => {
    expect(duesStatus(300, 0)).toBe("unpaid");
  });
  it("is partial when some is collected", () => {
    expect(duesStatus(300, 100)).toBe("partial");
  });
});

describe("buildInitialDues", () => {
  const now = new Date("2026-07-08T10:00:00Z");

  it("paid-in-full records no outstanding due and one history entry", () => {
    const d = buildInitialDues(300, 300, now);
    expect(d).toMatchObject({ feeAmount: 300, amountPaid: 300, dueAmount: 0, status: "paid" });
    expect(d.payments).toHaveLength(1);
    expect(d.payments[0]).toMatchObject({ amount: 300, note: "At consultation" });
  });

  it("partial payment leaves the remainder as a due", () => {
    const d = buildInitialDues(300, 200, now);
    expect(d).toMatchObject({ feeAmount: 300, amountPaid: 200, dueAmount: 100, status: "partial" });
    expect(d.payments).toHaveLength(1);
  });

  it("skipping (0 paid) leaves the full fee as an unpaid due with no history", () => {
    const d = buildInitialDues(300, 0, now);
    expect(d).toMatchObject({ feeAmount: 300, amountPaid: 0, dueAmount: 300, status: "unpaid" });
    expect(d.payments).toHaveLength(0);
  });

  it("clamps an amount typed above the fee to the fee", () => {
    const d = buildInitialDues(300, 5000, now);
    expect(d).toMatchObject({ amountPaid: 300, dueAmount: 0, status: "paid" });
  });
});
