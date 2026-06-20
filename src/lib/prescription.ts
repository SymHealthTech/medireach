/**
 * Patient-facing prescription text builder (spec §7.5). Produces a plain-text
 * version suitable for the WhatsApp share sheet. The richer templated PDF/image
 * (4–5 designs + sponsor footer) is layered on in Phase 4 (§8); the patient
 * instructions here always use the plain-language `patientText` of each
 * medicine, never the clinical shorthand. Carries the doctor's registration
 * number per Telemedicine Practice Guidelines (§15.10).
 */

export interface PrescriptionDoctor {
  name: string;
  registrationNumber: string;
  clinicName: string;
  clinicAddress: string;
}

export interface PrescriptionPatient {
  name: string;
  ageYears?: number;
  gender?: string;
}

export interface PrescriptionMedicine {
  patientText: string;
}

export interface PrescriptionVisit {
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  date: Date;
}

export function buildPrescriptionText(
  doctor: PrescriptionDoctor,
  patient: PrescriptionPatient,
  visit: PrescriptionVisit,
): string {
  const lines: string[] = [];
  lines.push(`*${doctor.clinicName || "Clinic"}*`);
  if (doctor.clinicAddress) lines.push(doctor.clinicAddress);
  lines.push(`Dr. ${doctor.name}${doctor.registrationNumber ? ` · Reg: ${doctor.registrationNumber}` : ""}`);
  lines.push("");
  lines.push(
    `Patient: ${patient.name}${patient.ageYears ? `, ${patient.ageYears}y` : ""}` +
      `   Date: ${visit.date.toLocaleDateString("en-IN")}`,
  );
  if (visit.diagnosis) lines.push(`Diagnosis: ${visit.diagnosis}`);
  lines.push("");
  lines.push("*Medicines*");
  if (visit.medicines.length === 0) {
    lines.push("—");
  } else {
    visit.medicines.forEach((m, i) => lines.push(`${i + 1}. ${m.patientText}`));
  }
  lines.push("");
  lines.push("This prescription was issued via MediReach.");
  return lines.join("\n");
}
