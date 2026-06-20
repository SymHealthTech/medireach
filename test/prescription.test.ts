import { describe, expect, it } from "vitest";
import { buildPrescriptionText } from "@/lib/prescription";

/**
 * The WhatsApp prescription text must always use plain-language patient text
 * (never clinical shorthand) and carry the doctor's registration number
 * (spec §7.5, §15.10).
 */
describe("buildPrescriptionText", () => {
  const doctor = {
    name: "Asha Rao",
    registrationNumber: "MH-12345",
    clinicName: "Sunrise Clinic",
    clinicAddress: "MG Road, Pune",
  };
  const patient = { name: "Aarav", ageYears: 32, gender: "male" };

  it("includes clinic, doctor reg number, patient, and patient-facing medicine text", () => {
    const text = buildPrescriptionText(doctor, patient, {
      diagnosis: "Viral fever",
      medicines: [{ patientText: "Paracetamol 500mg — Take 3 times a day after food" }],
      date: new Date("2026-06-18T10:00:00Z"),
    });
    expect(text).toContain("Sunrise Clinic");
    expect(text).toContain("Reg: MH-12345");
    expect(text).toContain("Aarav");
    expect(text).toContain("Viral fever");
    expect(text).toContain("3 times a day after food");
  });

  it("handles a prescription with no medicines gracefully", () => {
    const text = buildPrescriptionText(doctor, patient, { medicines: [], date: new Date() });
    expect(text).toContain("*Medicines*");
    expect(text).toContain("—");
  });
});
