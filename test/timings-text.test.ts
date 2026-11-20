import { describe, expect, it } from "vitest";
import { parseTimingsText } from "@/lib/timings";

/** Day → "10:00-14:00,18:00-21:00" (Monday first), for compact assertions. */
const week = (text: string) => {
  const r = parseTimingsText(text);
  return r ? Object.fromEntries(r.map((d) => [d.day, d.slots.map((s) => `${s.open}-${s.close}`).join(",")])) : null;
};

describe("timings typed in website forms", () => {
  it("reads morning and evening lines under one day range", () => {
    expect(week("Mon-Sat morning 10 to 2 pm \nevening 6 to 9 pm")).toEqual({
      1: "10:00-14:00,18:00-21:00",
      2: "10:00-14:00,18:00-21:00",
      3: "10:00-14:00,18:00-21:00",
      4: "10:00-14:00,18:00-21:00",
      5: "10:00-14:00,18:00-21:00",
      6: "10:00-14:00,18:00-21:00",
      0: "",
    });
  });

  it("reads the form's own example, with Sunday closed", () => {
    const w = week("Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm\nSunday: closed");
    expect(w![1]).toBe("10:00-13:00,18:00-21:00");
    expect(w![6]).toBe("10:00-13:00,18:00-21:00");
    expect(w![0]).toBe("");
  });

  it("guesses am/pm the way clinics write hours", () => {
    expect(week("Mon–Sat 10–1, 6–9")![3]).toBe("10:00-13:00,18:00-21:00");
    expect(week("Mon–Sat 10–7")![3]).toBe("10:00-19:00");
    expect(week("Daily 9:30 am - 12:30 pm")![0]).toBe("09:30-12:30");
    expect(week("Mon–Fri 9-17")![5]).toBe("09:00-17:00");
  });

  it("handles day lists, 'to' ranges and several segments", () => {
    const w = week("Mon, Wed, Fri 5 to 8 pm");
    expect([w![1], w![2], w![3], w![5]]).toEqual(["17:00-20:00", "", "17:00-20:00", "17:00-20:00"]);
    const v = week("Tuesday to Saturday 11-2; Sunday 10-12");
    expect([v![1], v![2], v![6], v![0]]).toEqual(["", "11:00-14:00", "11:00-14:00", "10:00-12:00"]);
  });

  it("returns null when there are no hours to read", () => {
    expect(parseTimingsText("By appointment")).toBeNull();
    expect(parseTimingsText("")).toBeNull();
  });
});
