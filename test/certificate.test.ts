import { describe, expect, it } from "vitest";
import {
  renderCertificate,
  daysBetween,
  certificateTitle,
  objectPronoun,
  formatCertDate,
} from "@/lib/certificate/render";
import { buildCertificateText } from "@/lib/certificate/message";

/**
 * The certificate body is a pure template + entered fields — no AI. These tests
 * pin the professional wording, the auto-calculated leave days, the correct
 * he/she wording, and the short WhatsApp accompaniment text.
 */
describe("daysBetween", () => {
  it("counts inclusively (same day = 1 day)", () => {
    expect(daysBetween("2026-07-08", "2026-07-08")).toBe(1);
    expect(daysBetween("2026-07-08", "2026-07-10")).toBe(3);
  });

  it("returns 0 for missing or reversed ranges", () => {
    expect(daysBetween(undefined, "2026-07-10")).toBe(0);
    expect(daysBetween("2026-07-10", "2026-07-08")).toBe(0);
  });
});

describe("certificateTitle", () => {
  it("uses MEDICAL for sick leave and FITNESS otherwise", () => {
    expect(certificateTitle("unfit")).toBe("MEDICAL CERTIFICATE");
    expect(certificateTitle("fitness_resume")).toBe("FITNESS CERTIFICATE");
    expect(certificateTitle("fitness_job")).toBe("FITNESS CERTIFICATE");
  });
});

describe("renderCertificate — Type 1 (unfit)", () => {
  const patient = { name: "Asha Rao", ageYears: 34, gender: "female" };

  it("fills name, age/sex, diagnosis and the auto-calculated day count", () => {
    const { title, paragraphs } = renderCertificate(
      "unfit",
      { diagnosis: "acute viral fever", fromDate: "2026-07-08", toDate: "2026-07-10" },
      patient,
    );
    expect(title).toBe("MEDICAL CERTIFICATE");
    const body = paragraphs[0];
    expect(body).toContain("Asha Rao");
    expect(body).toContain("34 yrs / Female");
    expect(body).toContain("acute viral fever");
    expect(body).toContain("for 3 days");
    expect(body).toContain("08 Jul 2026");
    expect(body).toContain("10 Jul 2026");
  });

  it("uses the singular 'day' for a one-day leave and appends remarks", () => {
    const { paragraphs } = renderCertificate(
      "unfit",
      { diagnosis: "migraine", fromDate: "2026-07-08", toDate: "2026-07-08", remarks: "Review if not improved" },
      patient,
    );
    expect(paragraphs[0]).toContain("for 1 day");
    expect(paragraphs[1]).toBe("Remarks: Review if not improved");
  });
});

describe("renderCertificate — Type 2 (fitness to resume)", () => {
  it("states recovery and the resume date", () => {
    const { title, paragraphs } = renderCertificate(
      "fitness_resume",
      { illness: "typhoid fever", resumeDate: "2026-07-15" },
      { name: "Ravi Kumar", ageYears: 40, gender: "male" },
    );
    expect(title).toBe("FITNESS CERTIFICATE");
    expect(paragraphs[0]).toContain("who was suffering from typhoid fever");
    expect(paragraphs[0]).toContain("has now recovered and is medically fit to resume duty");
    expect(paragraphs[0]).toContain("15 Jul 2026");
  });
});

describe("renderCertificate — Type 3 (fitness for employment)", () => {
  it("uses him/her correctly and the job purpose", () => {
    const male = renderCertificate("fitness_job", { jobPurpose: "the post of Driver" }, { name: "Ravi Kumar", gender: "male" });
    expect(male.paragraphs[0]).toContain("found him to be medically fit to undertake the post of Driver");

    const female = renderCertificate("fitness_job", {}, { name: "Asha Rao", gender: "female" });
    expect(female.paragraphs[0]).toContain("found her to be medically fit to undertake employment");
  });

  it("falls back to him/her when sex is unknown", () => {
    expect(objectPronoun(undefined)).toBe("him/her");
    const unknown = renderCertificate("fitness_job", {}, { name: "Sam" });
    expect(unknown.paragraphs[0]).toContain("found him/her to be medically fit");
  });

  it("appends the examination summary as its own paragraph", () => {
    const { paragraphs } = renderCertificate(
      "fitness_job",
      { jobPurpose: "employment", examinationSummary: "Vitals within normal limits." },
      { name: "Asha Rao", gender: "female" },
    );
    expect(paragraphs[1]).toBe("Vitals within normal limits.");
  });
});

describe("formatCertDate", () => {
  it("formats yyyy-mm-dd without timezone drift", () => {
    expect(formatCertDate("2026-01-01")).toBe("01 Jan 2026");
  });
});

describe("buildCertificateText", () => {
  it("includes clinic, doctor, the PDF link and a save note", () => {
    const url = "https://res.cloudinary.com/demo/image/authenticated/s--sig--/cert.pdf";
    const text = buildCertificateText({ name: "Asha Rao", clinicName: "Sunrise Clinic" }, url);
    expect(text).toContain("Sunrise Clinic");
    expect(text).toContain("Dr. Asha Rao");
    expect(text).toContain(url);
    expect(text).toMatch(/medical certificate/i);
    expect(text).toMatch(/save it for your records/i);
    expect(text).toContain("MediReach");
  });

  it("falls back gracefully with no link and no names", () => {
    const text = buildCertificateText({ name: "", clinicName: "" });
    expect(text).toContain("*Clinic*");
    expect(text).not.toContain("Dr. ");
  });
});
