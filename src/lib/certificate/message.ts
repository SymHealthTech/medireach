/**
 * Patient-facing WhatsApp accompaniment text for a medical certificate. Mirrors
 * buildPrescriptionText (src/lib/prescription.ts): wa.me links carry only text,
 * so the certificate itself lives in the linked PDF and this message is just the
 * short note that rides alongside it — clinic + doctor name, a tappable link to
 * the certificate PDF, and a "save it for your records" line.
 */

import type { PrescriptionSender } from "@/lib/prescription";

export function buildCertificateText(sender: PrescriptionSender, pdfUrl?: string): string {
  const clinic = sender.clinicName?.trim() || "Clinic";
  const lines: string[] = [];
  lines.push(`*${clinic}*`);
  if (sender.name?.trim()) lines.push(`Dr. ${sender.name.trim()}`);
  lines.push("");
  if (pdfUrl) {
    lines.push("Namaste 🙏 Please find your medical certificate here — tap the link below to view or download it (PDF):");
    lines.push(pdfUrl);
  } else {
    lines.push("Namaste 🙏 Your medical certificate is attached as a PDF — you can view or download it anytime.");
  }
  lines.push("");
  lines.push("Please save it for your records.");
  lines.push("");
  lines.push("Sent through MediReach.");
  return lines.join("\n");
}
