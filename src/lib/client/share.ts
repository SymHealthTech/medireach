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
 *
 * The caller shows an in-app "preparing…" overlay while the (async) upload runs,
 * then we open WhatsApp once the link is ready. We no longer pre-open a blank
 * browser tab as a loader — that surfaced as an ugly `about:blank` page and got
 * stuck if the doctor closed it.
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
 * Open the WhatsApp chat as reliably as possible after the async upload. We
 * prefer a new tab so the doctor keeps the app open, but browsers revoke the
 * popup allowance once the click gesture's transient activation expires (a few
 * seconds), so we fall back to navigating the current tab — which is never
 * blocked. Either way WhatsApp opens; on mobile the `wa.me` link hands off to
 * the WhatsApp app directly.
 */
function openWhatsapp(url: string): void {
  const tab = window.open(url, "_blank", "noopener");
  if (tab) return;
  window.location.href = url;
}

/**
 * Upload the prescription PDF for a visit, build the message with the resulting
 * signed link, and open the WhatsApp chat straight on the recipient's number.
 * The caller shows an in-app "preparing…" overlay while this runs. If the upload
 * fails we still open WhatsApp, just with a message that has no link.
 *
 * Returns whether the PDF link made it into the message.
 */
export async function sharePrescriptionPdf(opts: {
  pdf: Blob;
  visitId: string;
  sender: PrescriptionSender;
  recipientDigits: string;
  filename?: string;
}): Promise<{ linkIncluded: boolean }> {
  const { pdf, visitId, sender, recipientDigits, filename = "prescription.pdf" } = opts;

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
  openWhatsapp(whatsappUrl(recipientDigits, text));
  return { linkIncluded: !!pdfUrl };
}
