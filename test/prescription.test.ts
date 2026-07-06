import { describe, expect, it } from "vitest";
import { buildPrescriptionText } from "@/lib/prescription";

/**
 * The WhatsApp accompaniment text is deliberately short: clinic + doctor name
 * and a one-line MediReach note. Patient name, date, diagnosis and medicines
 * live in the attached PDF, never in the chat message (spec §7.5).
 */
describe("buildPrescriptionText", () => {
  it("includes the clinic and doctor name and a MediReach note", () => {
    const text = buildPrescriptionText({ name: "Asha Rao", clinicName: "Sunrise Clinic" });
    expect(text).toContain("Sunrise Clinic");
    expect(text).toContain("Dr. Asha Rao");
    expect(text).toContain("MediReach");
  });

  it("does not leak patient name, date or medicine details", () => {
    const text = buildPrescriptionText({ name: "Asha Rao", clinicName: "Sunrise Clinic" });
    expect(text).not.toMatch(/patient/i);
    expect(text).not.toMatch(/diagnosis/i);
    expect(text).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/); // no date
  });

  it("falls back gracefully when names are missing", () => {
    const text = buildPrescriptionText({ name: "", clinicName: "" });
    expect(text).toContain("*Clinic*");
    expect(text).not.toContain("Dr. ");
  });
});
