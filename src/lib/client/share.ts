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
 * Paint a branded "preparing…" screen into the popup we open synchronously on the
 * Send click, so the doctor never stares at a bare about:blank tab while the PDF
 * rasterises and uploads. The tab redirects itself to WhatsApp the moment the
 * upload finishes (sharePrescriptionPdf navigates `win.location`).
 */
export function writePreparingDoc(win: Window | null): void {
  if (!win) return;
  try {
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Preparing prescription…</title>` +
        `<style>` +
        `*{box-sizing:border-box}` +
        `html,body{height:100%;margin:0}` +
        `body{display:flex;align-items:center;justify-content:center;` +
        `font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
        `background:#0f172a;color:#e2e8f0;text-align:center;padding:24px}` +
        `.box{max-width:320px}` +
        `.spin{width:38px;height:38px;margin:0 auto 18px;border:3px solid rgba(255,255,255,.18);` +
        `border-top-color:#25D366;border-radius:50%;animation:sp .8s linear infinite}` +
        `h1{font-size:17px;font-weight:600;margin:0 0 6px}` +
        `p{font-size:13px;line-height:1.5;color:#94a3b8;margin:0}` +
        `@keyframes sp{to{transform:rotate(360deg)}}` +
        `</style></head><body><div class="box">` +
        `<div class="spin"></div>` +
        `<h1>Preparing prescription…</h1>` +
        `<p>WhatsApp will open automatically in a moment. Please keep this tab open.</p>` +
        `</div></body></html>`,
    );
    win.document.close();
  } catch {
    // Cross-origin/blocked write — the tab will still redirect when ready.
  }
}

/**
 * Upload the prescription PDF for a visit, build the message with the resulting
 * signed link, and open the WhatsApp chat straight on the recipient's number.
 *
 * `win` is a window the caller opened synchronously inside the click handler
 * (showing a "preparing…" interstitial); we navigate it to WhatsApp once the
 * (async) upload finishes, which keeps the popup from being blocked. If the
 * upload fails we still send the message, just without the link.
 *
 * Returns whether the PDF link made it into the message and whether WhatsApp was
 * actually opened. If the caller's window was dismissed (closed) or blocked, we
 * deliberately do NOT spawn a fresh window — that surprises the user with a
 * stray WhatsApp-Web tab — and report `opened: false` so the caller can react.
 */
export async function sharePrescriptionPdf(opts: {
  pdf: Blob;
  visitId: string;
  sender: PrescriptionSender;
  recipientDigits: string;
  filename?: string;
  win?: Window | null;
}): Promise<{ linkIncluded: boolean; opened: boolean }> {
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
    return { linkIncluded: !!pdfUrl, opened: true };
  }
  // The pre-opened tab was dismissed or blocked. Opening a brand-new window here
  // would pop a stray WhatsApp-Web tab in the browser (bad UX and often blocked
  // outside the click gesture), so we just report that nothing opened.
  return { linkIncluded: !!pdfUrl, opened: false };
}
