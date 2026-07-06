import { describe, expect, it } from "vitest";
import { doseGrid, doseQuantity, timingLine, toRxMedicine, buildVitals } from "@/lib/prescription/render";

/**
 * The dose-grid + vitals logic is the shared clinical core (spec §8). It must
 * render identically on Starter and Pro (pure local transform, no API), so it is
 * covered here once and reused by all five templates.
 */
describe("doseGrid", () => {
  it("expands the required frequencies with a whole-tablet dose", () => {
    expect(doseGrid("1", "TDS")).toBe("1 - 1 - 1");
    expect(doseGrid("1", "BD")).toBe("1 - 0 - 1");
    expect(doseGrid("1", "OD")).toBe("1 - 0 - 0");
    expect(doseGrid("1", "QID")).toBe("1 - 1 - 1 - 1");
    expect(doseGrid("1", "HS")).toBe("0 - 0 - 1");
  });

  it("handles half doses in the right positions", () => {
    expect(doseGrid("1/2", "TDS")).toBe("1/2 - 1/2 - 1/2");
    expect(doseGrid("1/2", "BD")).toBe("1/2 - 0 - 1/2");
  });

  it("uses tsf / ml units for syrups", () => {
    expect(doseGrid("1tsf", "BD")).toBe("1 tsf - 0 - 1 tsf");
    expect(doseGrid("5ml", "OD")).toBe("5 ml - 0 - 0");
  });

  it("is case-insensitive on frequency and defaults an empty dose to 1", () => {
    expect(doseGrid("", "bd")).toBe("1 - 0 - 1");
  });

  it("falls back to a single quantity cell for non-grid frequencies", () => {
    expect(doseGrid("1", "SOS")).toBe("1");
    expect(doseGrid("2", "Stat")).toBe("2");
  });
});

describe("doseQuantity", () => {
  it("normalises spoon and volume units", () => {
    expect(doseQuantity("2tsf")).toBe("2 tsf");
    expect(doseQuantity("10ml")).toBe("10 ml");
    expect(doseQuantity("1.5")).toBe("1.5");
  });
});

describe("timingLine", () => {
  it("lowercases explicit timing and adds duration when given", () => {
    expect(timingLine("Before food", "TDS")).toBe("before food");
    expect(timingLine("After food", "BD", "5 days")).toBe("after food · 5 days");
  });

  it("derives a phrase from SOS / Stat when no timing is set", () => {
    expect(timingLine("", "SOS")).toBe("when needed");
    expect(timingLine("", "Stat")).toBe("immediately");
  });

  it("is empty when there is nothing to say", () => {
    expect(timingLine("", "TDS")).toBe("");
  });
});

describe("toRxMedicine", () => {
  it("builds the label and salt from the structured fields", () => {
    expect(toRxMedicine({ type: "Tab", name: "Crocin", generic: "Paracetamol 500mg", dose: "1", frequency: "TDS", timing: "After food" })).toEqual({
      name: "Tab. Crocin",
      salt: "(Paracetamol 500mg)",
      grid: "1 - 1 - 1",
      timingLine: "after food",
    });
  });
});

describe("buildVitals", () => {
  it("renders only the vitals that are present", () => {
    expect(buildVitals({ bp: "120/80", weight: "62" })).toEqual([
      { label: "BP", value: "120/80 mmHg" },
      { label: "Wt", value: "62 kg" },
    ]);
  });

  it("returns nothing when no vitals exist", () => {
    expect(buildVitals({})).toEqual([]);
    expect(buildVitals(undefined)).toEqual([]);
  });
});
