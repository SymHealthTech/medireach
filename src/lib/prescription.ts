/**
 * Patient-facing WhatsApp accompaniment text (spec §7.5). This is only the short
 * chat message that rides alongside the prescription — the prescription itself
 * (patient name, date, diagnosis, medicines, doctor registration number per
 * Telemedicine Practice Guidelines §15.10) lives in the linked PDF, so it is
 * deliberately NOT repeated here. The message carries just the clinic and doctor
 * name, a tappable link to the prescription PDF, and a one-line MediReach note.
 */

export interface PrescriptionSender {
  /** Doctor's display name (without the "Dr." prefix). */
  name: string;
  /** Clinic / practice name. */
  clinicName: string;
}

export function buildPrescriptionText(sender: PrescriptionSender, pdfUrl?: string): string {
  const clinic = sender.clinicName?.trim() || "Clinic";
  const lines: string[] = [];
  lines.push(`*${clinic}*`);
  if (sender.name?.trim()) lines.push(`Dr. ${sender.name.trim()}`);
  lines.push("");
  if (pdfUrl) {
    lines.push("Namaste 🙏 Here is your prescription — tap the link below to view or download it (PDF):");
    lines.push(pdfUrl);
    lines.push("");
    lines.push("Please save this prescription for your records.");
  } else {
    lines.push("Namaste 🙏 Your prescription is attached as a PDF — you can view or download it anytime.");
    lines.push("");
    lines.push("Please save this prescription for your records.");
  }
  lines.push("");
  lines.push("Sent through MediReach.");
  return lines.join("\n");
}
