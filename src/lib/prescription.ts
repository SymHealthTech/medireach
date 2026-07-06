/**
 * Patient-facing WhatsApp accompaniment text (spec §7.5). This is only the short
 * chat message that rides alongside the prescription — the prescription itself
 * (patient name, date, diagnosis, medicines, doctor registration number per
 * Telemedicine Practice Guidelines §15.10) travels as the attached PDF, so it is
 * deliberately NOT repeated here. The message carries just the clinic and doctor
 * name plus a one-line note about MediReach.
 */

export interface PrescriptionSender {
  /** Doctor's display name (without the "Dr." prefix). */
  name: string;
  /** Clinic / practice name. */
  clinicName: string;
}

export function buildPrescriptionText(sender: PrescriptionSender): string {
  const clinic = sender.clinicName?.trim() || "Clinic";
  const lines: string[] = [];
  lines.push(`*${clinic}*`);
  if (sender.name?.trim()) lines.push(`Dr. ${sender.name.trim()}`);
  lines.push("");
  lines.push("Namaste 🙏 Your prescription is attached as a PDF — you can view or download it anytime.");
  lines.push("");
  lines.push("Sent through MediReach.");
  return lines.join("\n");
}
