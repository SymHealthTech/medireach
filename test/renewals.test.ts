import { describe, expect, it } from "vitest";
import { addYears, computeRenewalStatus, firstRenewalDue, isPastGrace } from "@/lib/renewals";

const now = new Date("2026-11-17T06:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("renewals", () => {
  it("works out the status from the due date", () => {
    expect(computeRenewalStatus(undefined, now)).toBe("active");
    expect(computeRenewalStatus(days(31), now)).toBe("active");
    expect(computeRenewalStatus(days(30), now)).toBe("due");
    expect(computeRenewalStatus(days(0), now)).toBe("due");
    expect(computeRenewalStatus(days(-1), now)).toBe("overdue");
    expect(computeRenewalStatus(days(-90), now)).toBe("overdue"); // only the renewals job lapses a site
  });

  it("knows when the grace period is over", () => {
    expect(isPastGrace(days(-30), 30, now)).toBe(false);
    expect(isPastGrace(days(-31), 30, now)).toBe(true);
    expect(isPastGrace(undefined, 30, now)).toBe(false);
  });

  it("puts the first renewal one year after setup, including from 29 Feb", () => {
    expect(firstRenewalDue(new Date("2026-11-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-11-10");
    expect(addYears(new Date("2028-02-29T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2029-03-01");
  });
});
