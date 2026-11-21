import { describe, expect, it } from "vitest";
import { INTAKE_SECTIONS, emptyIntakeData, intakeDataSchema, missingForSubmit, coordsFromMapsUrl } from "@/lib/intake/form";
import { siteHints } from "@/lib/intake/hints";
import { TIMING_PRESETS, parseTimingsText, timingsToText, type DayTimings } from "@/lib/timings";
import {
  conditionSuggestions,
  doctorServiceSuggestions,
  equipmentSuggestions,
  facilitySuggestions,
  fieldSuggestions,
  serviceSuggestions,
  themeKeyForSpecialty,
} from "@/lib/suggestions";

describe("timings picker text", () => {
  it("writes text the website-form reader reads back exactly (every preset)", () => {
    for (const p of TIMING_PRESETS) expect(parseTimingsText(timingsToText(p.timings))).toEqual(p.timings);
  });

  it("groups days, handles odd days and closed weeks", () => {
    const week: DayTimings[] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, slots: day === 1 || day === 3 ? [{ open: "17:00", close: "20:30" }] : day === 5 ? [{ open: "12:00", close: "14:00" }] : [] }));
    const text = timingsToText(week);
    expect(text).toBe("Mon, Wed: 5 pm – 8:30 pm\nTue, Thu, Sat–Sun: Closed\nFri: 12 pm – 2 pm");
    expect(parseTimingsText(text)).toEqual(week);
    expect(timingsToText([1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, slots: [] })))).toBe("");
  });
});

describe("suggestions", () => {
  it("offers services, facilities and equipment for every clinic type and hospitals", () => {
    for (const type of ["general-opd", "skin", "dental", "eye", "ent", "cardiology", "ayurveda", "homeopathy", "physiotherapy", "paediatrics", "gynaecology", "orthopaedics", "multispecialty", "diagnostic-centre", "other", ""]) {
      expect(serviceSuggestions("clinic", type).length, type).toBeGreaterThan(3);
      expect(equipmentSuggestions("clinic", type).length, type).toBeGreaterThan(1);
    }
    expect(serviceSuggestions("hospital", "")).toContain("Emergency and trauma care");
    expect(facilitySuggestions("hospital")).toContain("Ambulance");
    expect(facilitySuggestions("clinic")).toContain("Pharmacy");
    expect(serviceSuggestions("clinic", "skin")).not.toEqual(serviceSuggestions("clinic", "dental"));
  });

  it("follows the doctor's specialty", () => {
    expect(themeKeyForSpecialty("Consultant Dermatologist")).toBe("skin");
    expect(themeKeyForSpecialty("Orthodontist")).toBe("dental");
    expect(themeKeyForSpecialty("Paediatrician")).toBe("paediatrics");
    expect(themeKeyForSpecialty("General Physician")).toBe("general-opd");
    expect(conditionSuggestions("Dermatologist")).toContain("Acne");
    expect(doctorServiceSuggestions("Dentist").length).toBeGreaterThan(3);
    expect(fieldSuggestions("clinic", "services", { clinicType: "dental" })).toEqual(serviceSuggestions("clinic", "dental"));
  });

  it("every suggest key used by the website forms has a list", () => {
    for (const kind of ["doctor", "clinic", "hospital"] as const) {
      const fields = INTAKE_SECTIONS[kind].flatMap((s) => s.fields);
      for (const f of fields.filter((x) => x.suggest)) expect(fieldSuggestions(kind, f.suggest!, {}).length, `${kind}.${f.key}`).toBeGreaterThan(0);
    }
  });
});

describe("website forms match the editors", () => {
  it("uses the day-by-day timings picker everywhere timings are asked", () => {
    expect(INTAKE_SECTIONS.clinic.flatMap((s) => s.fields).find((f) => f.key === "timings")?.type).toBe("timings");
    expect(INTAKE_SECTIONS.hospital.flatMap((s) => s.fields).find((f) => f.key === "timings")?.type).toBe("timings");
    expect(INTAKE_SECTIONS.doctor.find((s) => s.key === "clinics")!.fields.find((f) => f.key === "timings")?.type).toBe("timings");
  });

  it("asks clinics about insurance and parking too, and timings stay required", () => {
    const data = intakeDataSchema("clinic").parse({ ...emptyIntakeData("clinic"), insurance: "Star Health", cashless: true, parkingNote: "Basement", timings: "Mon–Sat: 10 am – 1 pm" });
    expect(data).toMatchObject({ insurance: "Star Health", cashless: true, parkingNote: "Basement", timings: "Mon–Sat: 10 am – 1 pm" });
    expect(missingForSubmit("clinic", { ...data, timings: "" }).map((m) => m.key)).toContain("timings");
  });

  it("hands the editor every answer it can reuse", () => {
    const data = {
      ...emptyIntakeData("hospital"),
      name: "Sai Care",
      tagline: "10-bed hospital in Wakad",
      yearStarted: "2015",
      awards: "NABH – 2022",
      timings: "Mon–Sat: 9 am – 9 pm",
      services: "OPD\nICU care",
      insurance: "Star Health",
      websiteName: "saicare",
      departments: [{ name: "Orthopaedics", doctors: [{ name: "Dr. A Rao", designation: "Ortho", education: "MS", role: "consultant", roleOther: "", portfolioUrl: "https://practo.com/x", photo: { publicId: "p", url: "https://res.cloudinary.com/x/image/upload/p.jpg" } }] }],
    };
    const h = siteHints("MR-1", "hospital", data, "abc");
    expect(h).toMatchObject({ intakeId: "abc", tagline: "10-bed hospital in Wakad", yearStarted: "2015", awards: ["NABH – 2022"], services: ["OPD", "ICU care"], insurance: ["Star Health"], websiteName: "saicare", departments: ["Orthopaedics"] });
    expect(h.doctors[0]).toMatchObject({ name: "Dr. A Rao", role: "Consultant", profileUrl: "https://practo.com/x", department: "Orthopaedics", photo: { publicId: "p" } });
  });

  it("reads map pins from pasted Google Maps links", () => {
    expect(coordsFromMapsUrl("https://www.google.com/maps/place/X/@18.5074,73.8077,17z")).toEqual({ lat: "18.5074", lng: "73.8077" });
    expect(coordsFromMapsUrl("https://maps.google.com/?q=18.52,73.85")).toEqual({ lat: "18.52", lng: "73.85" });
    expect(coordsFromMapsUrl("https://maps.app.goo.gl/abc")).toBeNull();
  });
});
