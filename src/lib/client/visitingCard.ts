"use client";

import QRCode from "qrcode";
import type { PublicCardData } from "@/lib/visiting-card";
import { doctorDisplayName } from "@/lib/doctorName";

/**
 * Client helpers for the visiting-card share features: QR-code generation and a
 * printable, branded card image — both built entirely in the browser with the
 * lightweight `qrcode` package plus the native canvas (no heavy deps).
 */

/** A high-resolution QR PNG data URL encoding the public card URL. */
export function qrDataUrl(url: string, size = 640): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: { dark: "#0E7C7B", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

/** Trigger a browser download of a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface ShareImageOpts {
  url: string;
  name: string;
  degree: string;
  designation: string;
  clinicName: string;
  tagline: string;
}

/**
 * Compose a clean, printable card image (teal header, doctor identity, QR, and
 * MediReach footer) so a doctor can send a picture rather than a link. Returns a
 * PNG Blob.
 */
export async function buildShareCardImage(opts: ShareImageOpts): Promise<Blob> {
  const W = 720;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Teal header band
  const grad = ctx.createLinearGradient(0, 0, W, 220);
  grad.addColorStop(0, "#0E7C7B");
  grad.addColorStop(1, "#0B6160");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 220);

  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText("Digital Visiting Card", W / 2, 130);

  // Identity
  const displayName = doctorDisplayName(opts.name);
  let y = 310;
  ctx.fillStyle = "#1F2933";
  ctx.font = "700 40px Inter, system-ui, sans-serif";
  ctx.fillText(displayName, W / 2, y);
  y += 40;

  if (opts.degree) {
    ctx.fillStyle = "#0E7C7B";
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    ctx.fillText(opts.degree, W / 2, y);
    y += 34;
  }
  if (opts.designation) {
    ctx.fillStyle = "#4B5563";
    ctx.font = "600 22px Inter, system-ui, sans-serif";
    ctx.fillText(opts.designation, W / 2, y);
    y += 32;
  }
  if (opts.clinicName) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "400 22px Inter, system-ui, sans-serif";
    ctx.fillText(opts.clinicName, W / 2, y);
    y += 32;
  }

  // QR
  const qr = await qrDataUrl(opts.url, 420);
  const img = await loadImage(qr);
  const qrSize = 380;
  const qrX = (W - qrSize) / 2;
  const qrY = Math.max(y + 20, 450);
  // Soft framed background behind the QR
  ctx.fillStyle = "#F7F9FA";
  roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 20);
  ctx.fill();
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#1F2933";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText("Scan to view my visiting card", W / 2, qrY + qrSize + 70);

  // Footer
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "500 20px Inter, system-ui, sans-serif";
  ctx.fillText("Powered by MediReach", W / 2, H - 48);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render image."))), "image/png"),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load QR image."));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── Full digital visiting-card image ──────────────────────────────────────── */

const FONT = "Inter, system-ui, sans-serif";
const CARD_W = 680;

/** Load an image with CORS enabled; resolves null on any failure so a missing or
 *  non-CORS asset falls back gracefully (and never taints the canvas). */
function loadCorsImage(src: string | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draw an image cropped "object-cover" style into a target rectangle. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw: number, sh: number, sx: number, sy: number;
  if (ir > r) {
    sh = img.height;
    sw = sh * r;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / r;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Render the complete visiting card (banner, photo, identity, action buttons,
 * clinic info and services) to a PNG Blob — a faithful snapshot of the public
 * page, built purely on canvas so it needs no extra dependencies. Runs a measure
 * pass to size the canvas, then a draw pass.
 */
export async function buildFullCardImage(data: PublicCardData): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts optional */
    }
  }

  const [cover, profile] = await Promise.all([
    loadCorsImage(data.coverPhotoUrl),
    loadCorsImage(data.profilePhotoUrl),
  ]);

  const displayName = doctorDisplayName(data.name);
  const initials =
    data.name
      .replace(/^dr\.?\s*/i, "")
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  const W = CARD_W;
  const pad = 44;
  const bannerH = 200;
  const profileR = 58;
  const ring = 6;
  const cx = W / 2;
  const cy = bannerH;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");

  // ── layout(): advances a y cursor through every element; draws only when
  //    `draw` is true. Returns the total content height.
  function layout(draw: boolean): number {
    let y = 0;

    // Banner
    if (draw) {
      if (cover) {
        drawCover(ctx!, cover, 0, 0, W, bannerH);
      } else {
        const g = ctx!.createLinearGradient(0, 0, W, bannerH);
        g.addColorStop(0, "#0E7C7B");
        g.addColorStop(0.5, "#12938F");
        g.addColorStop(1, "#0B6160");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, bannerH);
      }
      // Profile photo (white ring + circular crop)
      ctx!.fillStyle = "#FFFFFF";
      ctx!.beginPath();
      ctx!.arc(cx, cy, profileR + ring, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, profileR, 0, Math.PI * 2);
      ctx!.clip();
      if (profile) {
        drawCover(ctx!, profile, cx - profileR, cy - profileR, profileR * 2, profileR * 2);
      } else {
        ctx!.fillStyle = "#E6F2F1";
        ctx!.fillRect(cx - profileR, cy - profileR, profileR * 2, profileR * 2);
        ctx!.fillStyle = "#0E7C7B";
        ctx!.font = `700 40px ${FONT}`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(initials, cx, cy + 2);
      }
      ctx!.restore();
    }

    // Identity
    y = cy + profileR + ring + 34;
    ctx!.textAlign = "center";
    ctx!.textBaseline = "alphabetic";

    ctx!.font = `700 34px ${FONT}`;
    if (draw) {
      ctx!.fillStyle = "#1F2933";
      ctx!.fillText(displayName, cx, y);
    }
    y += 30;

    if (data.degree) {
      ctx!.font = `600 20px ${FONT}`;
      if (draw) {
        ctx!.fillStyle = "#0E7C7B";
        ctx!.fillText(data.degree, cx, y);
      }
      y += 28;
    }
    if (data.registrationNumber) {
      ctx!.font = `500 15px ${FONT}`;
      if (draw) {
        ctx!.fillStyle = "#94A3B8";
        ctx!.fillText(`Reg. No. ${data.registrationNumber}`, cx, y);
      }
      y += 22;
    }
    if (data.designation) {
      ctx!.font = `600 18px ${FONT}`;
      if (draw) {
        ctx!.fillStyle = "#475569";
        ctx!.fillText(data.designation, cx, y);
      }
      y += 26;
    }
    if (data.tagline) {
      ctx!.font = `400 17px ${FONT}`;
      const lines = wrapLines(ctx!, data.tagline, W - 2 * pad - 20);
      if (draw) ctx!.fillStyle = "#64748B";
      y += 6;
      for (const ln of lines) {
        if (draw) ctx!.fillText(ln, cx, y);
        y += 24;
      }
    }

    // Action buttons
    y += 24;
    const bx = pad;
    const bw = W - 2 * pad;
    const bh = 52;
    const gap = 12;

    const drawPill = (
      x: number,
      py: number,
      w: number,
      fill: string | null,
      strokeColor: string | null,
      textColor: string,
      text: string,
    ) => {
      roundRect(ctx!, x, py, w, bh, 14);
      if (fill) {
        ctx!.fillStyle = fill;
        ctx!.fill();
      }
      if (strokeColor) {
        ctx!.strokeStyle = strokeColor;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }
      ctx!.fillStyle = textColor;
      ctx!.font = `600 17px ${FONT}`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(text, x + w / 2, py + bh / 2 + 1);
      ctx!.textBaseline = "alphabetic";
    };

    if (data.callNumber) {
      if (draw) drawPill(bx, y, bw, "#F2994A", null, "#FFFFFF", "Call");
      y += bh + gap;
    }
    const bottom: { text: string; fill: string | null; stroke: string | null; color: string }[] = [];
    if (data.whatsappNumber)
      bottom.push({ text: "WhatsApp", fill: "#25D366", stroke: null, color: "#FFFFFF" });
    if (data.mapsLink)
      bottom.push({ text: "Get Directions", fill: "#FFFFFF", stroke: "#0E7C7B", color: "#0E7C7B" });
    const [b0, b1] = bottom;
    if (b0 && b1) {
      const hw = (bw - gap) / 2;
      if (draw) {
        drawPill(bx, y, hw, b0.fill, b0.stroke, b0.color, b0.text);
        drawPill(bx + hw + gap, y, hw, b1.fill, b1.stroke, b1.color, b1.text);
      }
      y += bh + gap;
    } else if (b0) {
      if (draw) drawPill(bx, y, bw, b0.fill, b0.stroke, b0.color, b0.text);
      y += bh + gap;
    }

    // Info section (clinic, timings, languages) — left aligned with a teal marker
    const ix = pad + 20;
    const iw = W - pad - ix;
    const hasInfo = data.clinicName || data.clinicTimings || data.languages.length > 0;
    if (hasInfo) {
      y += 16;
      if (draw) {
        ctx!.strokeStyle = "#EEF2F4";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(pad, y);
        ctx!.lineTo(W - pad, y);
        ctx!.stroke();
      }
      y += 30;
      ctx!.textAlign = "left";

      const marker = (my: number) => {
        if (!draw) return;
        ctx!.fillStyle = "#0E7C7B";
        ctx!.beginPath();
        ctx!.arc(pad + 4, my - 5, 3.5, 0, Math.PI * 2);
        ctx!.fill();
      };

      if (data.clinicName) {
        marker(y);
        ctx!.font = `600 17px ${FONT}`;
        if (draw) {
          ctx!.fillStyle = "#1F2933";
          ctx!.fillText(data.clinicName, ix, y);
        }
        y += 24;
        if (data.clinicAddress) {
          ctx!.font = `400 15px ${FONT}`;
          const lines = wrapLines(ctx!, data.clinicAddress, iw);
          if (draw) ctx!.fillStyle = "#64748B";
          for (const ln of lines) {
            if (draw) ctx!.fillText(ln, ix, y);
            y += 21;
          }
        }
        y += 16;
      }
      if (data.clinicTimings) {
        marker(y);
        ctx!.font = `400 15px ${FONT}`;
        if (draw) {
          ctx!.fillStyle = "#475569";
          ctx!.fillText(data.clinicTimings, ix, y);
        }
        y += 30;
      }
      if (data.languages.length > 0) {
        marker(y);
        ctx!.font = `400 15px ${FONT}`;
        if (draw) {
          ctx!.fillStyle = "#475569";
          ctx!.fillText(data.languages.join(", "), ix, y);
        }
        y += 30;
      }
    }

    // Services chips
    if (data.services.length > 0) {
      y += 6;
      ctx!.textAlign = "left";
      ctx!.font = `600 12px ${FONT}`;
      if (draw) {
        ctx!.fillStyle = "#94A3B8";
        ctx!.fillText("SERVICES", pad, y);
      }
      y += 22;
      const chipH = 32;
      const chipPadX = 14;
      const chipGap = 8;
      let cxp = pad;
      ctx!.font = `500 14px ${FONT}`;
      for (const s of data.services) {
        const wtxt = ctx!.measureText(s).width;
        const chipW = wtxt + chipPadX * 2;
        if (cxp + chipW > W - pad && cxp > pad) {
          cxp = pad;
          y += chipH + chipGap;
        }
        if (draw) {
          roundRect(ctx!, cxp, y, chipW, chipH, chipH / 2);
          ctx!.fillStyle = "rgba(14,124,123,0.10)";
          ctx!.fill();
          ctx!.fillStyle = "#0B6160";
          ctx!.textBaseline = "middle";
          ctx!.fillText(s, cxp + chipPadX, y + chipH / 2 + 1);
          ctx!.textBaseline = "alphabetic";
        }
        cxp += chipW + chipGap;
      }
      y += chipH;
    }

    // Footer
    y += 34;
    if (draw) {
      ctx!.strokeStyle = "#EEF2F4";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(pad, y - 24);
      ctx!.lineTo(W - pad, y - 24);
      ctx!.stroke();

      ctx!.font = `500 15px ${FONT}`;
      const w1 = ctx!.measureText("Powered by ").width;
      const w2 = ctx!.measureText("MediReach").width;
      const startX = cx - (w1 + w2) / 2;
      ctx!.textAlign = "left";
      ctx!.fillStyle = "#94A3B8";
      ctx!.fillText("Powered by ", startX, y);
      ctx!.fillStyle = "#0E7C7B";
      ctx!.fillText("MediReach", startX + w1, y);
    }
    y += 28;

    return y;
  }

  // Measure, then draw at 2× for a crisp export.
  const height = Math.ceil(layout(false));
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, height);
  layout(true);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not render the card image."))),
      "image/png",
    ),
  );
}
