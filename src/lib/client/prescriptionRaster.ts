"use client";

/**
 * Client helpers that turn a rendered <PrescriptionSheet> DOM node into the two
 * delivery formats the app ships (spec §8): a crisp A4 PNG for the WhatsApp
 * share sheet, and a true-A4 browser print (which the OS print dialog can also
 * "Save as PDF"). The sheet is styled entirely with inline styles, so we can
 * serialise it into an SVG <foreignObject> and rasterise it with zero external
 * dependencies — and, because the signature is embedded as a data URL, the
 * canvas is never tainted.
 */

/** Fetch an (authenticated, signed) image URL and inline it as a data URL. */
export async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Rasterise a sheet element to a PNG blob at `scale`× its A4 layout size. The
 * node is cloned, wrapped in an SVG <foreignObject>, and drawn onto a canvas.
 */
export async function sheetToPng(el: HTMLElement, scale = 2): Promise<Blob> {
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  const serialized = new XMLSerializer().serializeToString(clone);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>` +
    `</foreignObject></svg>`;

  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  const img = new Image();
  img.width = width;
  img.height = height;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the prescription."));
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not generate image."))), "image/png"),
  );
}

/**
 * Print a sheet element at true A4 via a hidden iframe. `@page { size: A4 }`
 * plus zero margins makes the print dialog (and its "Save as PDF") emit a full
 * A4 sheet rather than a small slip.
 */
export function printSheet(el: HTMLElement): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  } as CSSStyleDeclaration);
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<style>@page{size:A4;margin:0}html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>` +
      `</head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  const run = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  // Give the iframe a tick to lay out (and decode any data-URL signature).
  setTimeout(run, 300);
}
