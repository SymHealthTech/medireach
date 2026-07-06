"use client";

import { apiPost } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";
import { buildPrescriptionText, type PrescriptionSender } from "@/lib/prescription";

/**
 * WhatsApp prescription delivery (spec §7.5). WhatsApp `wa.me` links can carry
 * only text, never a file — so instead of attaching the PDF we upload it to
 * Cloudinary (signed, authenticated) and drop a short-lived signed link into the
 * message. The chat opens DIRECTLY on the recipient's number (no contact
 * picker); the patient taps the link to view/download the PDF.
 */

/**
 * Normalise a raw phone number into the digits-only, country-coded form wa.me
 * expects (no "+"). Bare 10-digit Indian numbers get a 91 prefix so the chat
 * actually resolves to that contact; anything already carrying a country code is
 * left as-is. Returns "" when there is nothing usable.
 */
export function normalizeWhatsappNumber(raw: string | undefined | null): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) digits = `91${digits}`; // India default
  return digits;
}

function whatsappUrl(recipientDigits: string, text: string): string {
  return recipientDigits
    ? `https://wa.me/${recipientDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Upload the prescription PDF for a visit, build the message with the resulting
 * signed link, and open the WhatsApp chat straight on the recipient's number.
 *
 * `win` is an about:blank window the caller opened synchronously inside the
 * click handler; we navigate it once the (async) upload finishes, which keeps
 * the popup from being blocked. If the upload fails we still send the message,
 * just without the link. Returns whether the PDF link made it into the message.
 */
export async function sharePrescriptionPdf(opts: {
  pdf: Blob;
  visitId: string;
  sender: PrescriptionSender;
  recipientDigits: string;
  filename?: string;
  win?: Window | null;
}): Promise<{ linkIncluded: boolean }> {
  const { pdf, visitId, sender, recipientDigits, filename = "prescription.pdf", win } = opts;

  let pdfUrl: string | undefined;
  try {
    const file = new File([pdf], filename, { type: "application/pdf" });
    const { publicId } = await uploadSigned(file, "prescription");
    const res = await apiPost<{ url: string }>(`/api/visits/${visitId}/prescription-pdf`, { publicId });
    pdfUrl = res.url;
  } catch {
    // Best-effort: fall back to a message without the link.
  }

  const text = buildPrescriptionText(sender, pdfUrl);
  const url = whatsappUrl(recipientDigits, text);
  if (win && !win.closed) {
    win.location.href = url;
  } else {
    window.open(url, "_blank");
  }
  return { linkIncluded: !!pdfUrl };
}
