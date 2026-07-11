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

/** Rough mobile (phone/tablet) detection from the UA — enough to decide whether
 *  the native WhatsApp app is the right target vs. WhatsApp Web on a laptop. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|iemobile|blackberry|opera mini|mobile/i.test(navigator.userAgent);
}

/**
 * Open a WhatsApp chat on the recipient's number with the message prefilled,
 * routed the best way for the device:
 *
 * - Mobile: the native `whatsapp://send` scheme, so the chat opens DIRECTLY in
 *   the installed app with no "Continue to Chat" landing page. Navigating the
 *   current tab hands off to the app without visibly leaving our page.
 * - Desktop/laptop: WhatsApp Web (`web.whatsapp.com/send`), because the phone
 *   very likely has no WhatsApp desktop app and `whatsapp://` would silently do
 *   nothing. We try a new tab first (keeps MediReach open) and fall back to
 *   same-tab navigation if the browser blocked the popup after the async upload.
 *
 * `recipientDigits` must be digits-only with the country code (no "+").
 */
function openWhatsapp(recipientDigits: string, text: string): void {
  const t = encodeURIComponent(text);
  if (isMobileDevice()) {
    window.location.href = recipientDigits
      ? `whatsapp://send?phone=${recipientDigits}&text=${t}`
      : `whatsapp://send?text=${t}`;
    return;
  }
  const webUrl = recipientDigits
    ? `https://web.whatsapp.com/send?phone=${recipientDigits}&text=${t}`
    : `https://web.whatsapp.com/send?text=${t}`;
  const tab = window.open(webUrl, "_blank", "noopener");
  if (!tab) window.location.href = webUrl;
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
  openWhatsapp(recipientDigits, text);
  return { linkIncluded: !!pdfUrl };
}
