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

/** A4 layout size in CSS px at 96dpi (210mm × 297mm). */
const A4_W = Math.round((210 / 25.4) * 96); // 794
const A4_H = Math.round((297 / 25.4) * 96); // 1123

/** Fetch an (authenticated, signed) image URL and inline it as a data URL. */
export async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Mount a detached clone of the sheet at its natural, UNSCALED A4 size, off the
 * transform chain — so that a caller which is showing the sheet inside a
 * `transform: scale()` preview still rasterises/prints at true 210×297mm rather
 * than the shrunken on-screen size. Returns the clone plus a cleanup fn.
 */
function mountUnscaled(el: HTMLElement): { node: HTMLElement; cleanup: () => void } {
  const holder = document.createElement("div");
  Object.assign(holder.style, {
    position: "fixed",
    left: "0",
    top: "0",
    transform: "none",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
    background: "#fff",
  } as CSSStyleDeclaration);

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.width = "210mm";
  clone.style.height = "297mm";

  holder.appendChild(clone);
  document.body.appendChild(holder);
  return { node: clone, cleanup: () => holder.remove() };
}

/**
 * Rasterise a sheet element to a PNG blob at `scale`× A4. The node is cloned to
 * its natural size, serialised into an SVG <foreignObject>, and drawn onto a
 * canvas. Fixed A4 dimensions (not getBoundingClientRect) keep the output exact
 * even when the source is a scaled preview.
 */
export async function sheetToPng(el: HTMLElement, scale = 2): Promise<Blob> {
  const { node, cleanup } = mountUnscaled(el);
  try {
    const serialized = new XMLSerializer().serializeToString(node);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}">` +
      `<foreignObject x="0" y="0" width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${A4_W}px;height:${A4_H}px">${serialized}</div>` +
      `</foreignObject></svg>`;
    const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

    const img = new Image();
    img.width = A4_W;
    img.height = A4_H;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterise the prescription."));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = A4_W * scale;
    canvas.height = A4_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, A4_W, A4_H);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not generate image."))), "image/png"),
    );
  } finally {
    cleanup();
  }
}

/**
 * Print a sheet at true A4. We rasterise the sheet to a fixed A4 bitmap and
 * print THAT image sized to fill the page. Printing a fixed image (rather than
 * live flex layout) removes every source of the browser's shrink-to-fit — which
 * is what was insetting the full-bleed header bands and adding side margins — so
 * the sheet lands edge-to-edge on the page. The image matches the WhatsApp
 * output exactly. Falls back to DOM printing if rasterisation fails.
 */
export async function printSheet(el: HTMLElement): Promise<void> {
  let dataUrl: string;
  try {
    const blob = await sheetToPng(el, 3); // 3× ≈ 288dpi for crisp print text
    dataUrl = await blobToDataUrl(blob);
  } catch {
    printSheetDom(el);
    return;
  }

  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>` +
    `@page{size:210mm 297mm;margin:0}` +
    `html,body{margin:0;padding:0;background:#fff}` +
    `img{display:block;width:210mm;height:297mm}` +
    `</style></head><body><img src="${dataUrl}" alt="Prescription"></body></html>`;

  runPrintFrame(html);
}

/** DOM-print fallback: print the live sheet on a zero-margin A4 page. */
function printSheetDom(el: HTMLElement): void {
  const css =
    "@page{size:210mm 297mm;margin:0}" +
    "html,body{margin:0!important;padding:0!important;width:210mm;background:#fff}" +
    "*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}" +
    "#mr-print-root{width:210mm;height:297mm;overflow:hidden}" +
    "#mr-print-root>*{width:210mm!important;height:297mm!important;margin:0!important;transform:none!important}";
  runPrintFrame(
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>` +
      `<body><div id="mr-print-root">${el.outerHTML}</div></body></html>`,
  );
}

/** Load an HTML document into a hidden iframe (via srcdoc, which parses @page
 *  reliably) and fire the print dialog once its images have decoded. */
function runPrintFrame(html: string): void {
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

  iframe.onload = () => {
    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) return;
    const go = () => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }),
      ),
    ).then(() => setTimeout(go, 50));
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
