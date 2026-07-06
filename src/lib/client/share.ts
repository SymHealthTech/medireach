"use client";

/**
 * WhatsApp delivery via the device's native share sheet (spec §7.5) — no
 * WhatsApp Business API needed for v1. Prefers sharing the prescription image
 * as a file; falls back to text-only share, and finally to a wa.me link +
 * image download so the doctor can still attach it manually.
 */
export async function sharePrescription(
  image: Blob,
  text: string,
  filename = "prescription.png",
): Promise<void> {
  const file = new File([image], filename, { type: "image/png" });

  // Best path: share the image file directly to WhatsApp / any target.
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: "Prescription" });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user dismissed
      // otherwise fall through to fallbacks
    }
  }

  // Text-only share if file share is unavailable.
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text, title: "Prescription" });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  // Last resort: download the image and open WhatsApp with the text.
  downloadBlob(image, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

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

/**
 * Deliver the prescription PDF via WhatsApp, opening the chat DIRECTLY on the
 * recipient's number (no "send to" contact picker). WhatsApp links can't attach
 * a file, so we download the PDF first — the doctor taps 📎 once to attach it,
 * and the patient can then view/download it from the chat. When no recipient
 * number is known we fall back to a generic WhatsApp compose window.
 */
export function deliverPrescriptionPdf(
  pdf: Blob,
  text: string,
  recipientDigits: string,
  filename = "prescription.pdf",
): void {
  downloadBlob(pdf, filename);
  const url = recipientDigits
    ? `https://wa.me/${recipientDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
