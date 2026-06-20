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
