import { describe, expect, it } from "vitest";
import { intakeDataSchema, withDefaults, type RepeatItem } from "@/lib/intake/form";
import { doctorHints } from "@/lib/intake/hints";
import { ROWS, rowsToText, textToRows } from "@/lib/intake/rows";

describe("website-form rows (qualifications, services, awards, memberships)", () => {
  it("writes text that reads back into the same rows", () => {
    const cases: Record<"qualifications" | "services" | "awards" | "memberships", Record<string, string>[]> = {
      qualifications: [
        { degree: "MBBS", specialization: "", institute: "BJ Medical College, Pune", year: "2008" },
        { degree: "MD", specialization: "Medicine", institute: "KEM Hospital", year: "2012" },
      ],
      services: [
        { name: "Diabetes care", description: "Check-ups and diet advice" },
        { name: "Vaccination", description: "" },
      ],
      awards: [{ title: "Best paper award", awardingBody: "Indian Medical Association", year: "2019" }],
      memberships: [{ name: "Indian Medical Association", since: "2010" }],
    };
    for (const [kind, rows] of Object.entries(cases) as [keyof typeof ROWS, Record<string, string>[]][]) {
      const text = rowsToText(ROWS[kind], rows);
      expect(textToRows(ROWS[kind], text)).toEqual(rows);
    }
    expect(rowsToText(ROWS.qualifications, cases.qualifications)).toBe("MBBS – BJ Medical College, Pune – 2008\nMD (Medicine) – KEM Hospital – 2012");
  });

  it("leaves empty rows out, and still shows one box for an empty answer", () => {
    expect(rowsToText(ROWS.services, [{ name: "", description: "" }, { name: "ECG", description: "" }])).toBe("ECG");
    expect(textToRows(ROWS.awards, "")).toEqual([{ title: "", awardingBody: "", year: "" }]);
  });

  it("reads older free-text answers", () => {
    expect(textToRows(ROWS.qualifications, "MBBS – BJ Medical College, Pune – 2008")[0]).toEqual({ degree: "MBBS", specialization: "", institute: "BJ Medical College, Pune", year: "2008" });
    expect(textToRows(ROWS.memberships, "Indian Medical Association – 2010")[0]).toEqual({ name: "Indian Medical Association", since: "2010" });
  });
});

describe("visiting consultant hospitals", () => {
  it("upgrades the older one-name-per-line answer into hospital entries", () => {
    const d = withDefaults("doctor", { visitingAt: "Ruby Hall Clinic, Pune\nJehangir Hospital" });
    expect((d.visiting as RepeatItem[]).map((v) => v.name)).toEqual(["Ruby Hall Clinic, Pune", "Jehangir Hospital"]);
    expect(d.visitingAt).toBeUndefined();
    const parsed = intakeDataSchema("doctor").parse({ visitingAt: "Ruby Hall Clinic" });
    expect((parsed.visiting as RepeatItem[])[0]?.name).toBe("Ruby Hall Clinic");
  });

  it("offers them to the admin Clinics step as visiting-consultant entries", () => {
    const h = doctorHints("MR-1", withDefaults("doctor", { visiting: [{ name: "Ruby Hall Clinic", area: "Sangamwadi", city: "Pune" }], systemOfMedicine: "other", systemOther: "Naturopathy" }));
    expect(h.clinics.find((c) => c.name === "Ruby Hall Clinic")).toMatchObject({ type: "visiting", area: "Sangamwadi" });
    expect(h.systemOther).toBe("Naturopathy");
  });
});

describe("clinic / hospital doctor degrees", () => {
  const def = ROWS.degrees;
  it("keeps the one-line site format and reads it back as rows", () => {
    const rows = textToRows(def, "MBBS, MD (Dermatology, Venereology), DNB");
    expect(rows).toEqual([
      { degree: "MBBS", specialization: "" },
      { degree: "MD", specialization: "Dermatology, Venereology" },
      { degree: "DNB", specialization: "" },
    ]);
    expect(rowsToText(def, rows)).toBe("MBBS, MD (Dermatology, Venereology), DNB");
  });
  it("drops empty rows and upgrades one-per-line text", () => {
    expect(rowsToText(def, [{ degree: "BAMS", specialization: "" }, { degree: "", specialization: "" }])).toBe("BAMS");
    expect(rowsToText(def, textToRows(def, "BAMS\nMD (Ayurveda)"))).toBe("BAMS, MD (Ayurveda)");
    expect(textToRows(def, "")).toEqual([{ degree: "", specialization: "" }]);
  });

  it("facilities, equipment and bed types (clinic and hospital forms)", () => {
    for (const kind of ["facilities", "equipment", "bedTypes"] as const) {
      const def = ROWS[kind];
      const rows = kind === "bedTypes" ? [{ type: "General ward", count: "6" }, { type: "ICU", count: "" }] : [{ name: "Lift", description: "To all floors" }, { name: "Parking", description: "" }];
      expect(textToRows(def, rowsToText(def, rows))).toEqual(rows);
    }
    expect(ROWS.bedTypes.parse("ICU 2")).toEqual({ type: "ICU", count: "2" });
    expect(ROWS.bedTypes.parse("Private room: 3 beds")).toEqual({ type: "Private room", count: "3" });
  });

  it("publications: title, journal, year and link", () => {
    const def = ROWS.publications;
    const rows = [{ title: "Thyroid in pregnancy", journal: "JAPI", year: "2020", url: "https://japi.org/x" }, { title: "A talk", journal: "", year: "", url: "" }];
    expect(textToRows(def, rowsToText(def, rows))).toEqual(rows);
    expect(def.parse("Paper – 2018 – www.x.org")).toEqual({ title: "Paper", journal: "", year: "2018", url: "www.x.org" });
  });
});
