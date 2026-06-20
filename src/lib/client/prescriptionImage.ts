"use client";

import { getPreset } from "@/lib/prescription/presets";

/**
 * Renders the patient-facing prescription to a PNG image on a canvas (spec
 * §7.5, §8) so it can be shared as a file via the Web Share API or downloaded.
 * Dependency-free: draws directly to a 2D context with manual text wrapping, so
 * what's produced exactly matches the chosen template preset. Always uses the
 * plain-language patient text for medicines, never clinical shorthand.
 */
export interface PrescriptionImageContent {
  presetKey: string;
  logoPlacement: "left" | "center" | "right";
  clinicName: string;
  clinicAddress: string;
  doctorName: string;
  registrationNumber: string;
  degree: string;
  clinicTimings: string;
  patientName: string;
  patientMeta: string; // e.g. "Male · 32y"
  date: string;
  diagnosis?: string;
  medicines: string[]; // patient-facing lines
  footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
}

const W = 820;
const PAD = 40;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderPrescriptionImage(
  content: PrescriptionImageContent,
): Promise<Blob> {
  const preset = getPreset(content.presetKey);
  const scale = 2; // crisper output for WhatsApp
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  const tallHeight = 1600;
  canvas.height = tallHeight * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, tallHeight);

  let y = 0;

  // ---- Header ----
  const headerH = 110;
  if (preset.headerBg) {
    ctx.fillStyle = preset.headerBg;
    ctx.fillRect(0, 0, W, headerH);
  }
  const headerTextColor = preset.headerBg ? "#FFFFFF" : preset.accent;

  // Brand badge (simplified rounded square + dot)
  const badgeX = preset.headerAlign === "center" ? W / 2 - 130 : PAD;
  ctx.fillStyle = preset.headerBg ? "#FFFFFF" : preset.accent;
  roundRect(ctx, badgeX, 30, 36, 36, 8);
  ctx.fill();
  ctx.fillStyle = preset.headerBg ?? "#FFFFFF";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("M", badgeX + 9, 56);

  ctx.fillStyle = headerTextColor;
  ctx.textAlign = preset.headerAlign === "center" ? "center" : "left";
  const cx = preset.headerAlign === "center" ? W / 2 : PAD + 48;
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(content.clinicName || "Clinic", cx, 50);
  ctx.font = "14px sans-serif";
  if (content.clinicAddress) ctx.fillText(content.clinicAddress, cx, 72);
  ctx.fillText(
    `Dr. ${content.doctorName}${content.degree ? `, ${content.degree}` : ""}` +
      `${content.registrationNumber ? `  ·  Reg: ${content.registrationNumber}` : ""}`,
    cx,
    92,
  );

  ctx.textAlign = "left";
  y = headerH + 24;

  if (preset.showRule) {
    ctx.strokeStyle = preset.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 24;
  }

  // ---- Patient + date ----
  ctx.fillStyle = preset.ink;
  ctx.font = "16px sans-serif";
  ctx.fillText(`Patient: ${content.patientName}   ${content.patientMeta}`, PAD, y);
  ctx.textAlign = "right";
  ctx.fillText(`Date: ${content.date}`, W - PAD, y);
  ctx.textAlign = "left";
  y += 28;

  if (content.diagnosis) {
    ctx.font = "16px sans-serif";
    for (const line of wrap(ctx, `Diagnosis: ${content.diagnosis}`, W - 2 * PAD)) {
      ctx.fillText(line, PAD, y);
      y += 22;
    }
    y += 8;
  }

  // ---- Rx / medicines ----
  ctx.fillStyle = preset.accent;
  ctx.font = "bold 22px serif";
  ctx.fillText("Rx", PAD, y);
  y += 26;

  ctx.fillStyle = preset.ink;
  ctx.font = "16px sans-serif";
  if (content.medicines.length === 0) {
    ctx.fillText("—", PAD + 8, y);
    y += 24;
  } else {
    content.medicines.forEach((med, i) => {
      const lines = wrap(ctx, `${i + 1}.  ${med}`, W - 2 * PAD - 12);
      lines.forEach((line, li) => {
        ctx.fillText(li === 0 ? line : `     ${line}`, PAD + 8, y);
        y += 24;
      });
      y += 4;
    });
  }

  y += 20;
  if (content.clinicTimings) {
    ctx.fillStyle = "#5A6670";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Clinic timings: ${content.clinicTimings}`, PAD, y);
    y += 24;
  }

  // ---- Sponsor footer (ad slot) ----
  const f = content.footer;
  if (f && (f.storeName || f.storeAddress || f.storeContact)) {
    y += 10;
    ctx.fillStyle = "#F2F5F6";
    const footerTop = y;
    const footerLines = [f.storeName, f.storeAddress, f.storeContact].filter(Boolean) as string[];
    const footerH = 18 + footerLines.length * 20 + 14;
    roundRect(ctx, PAD, footerTop, W - 2 * PAD, footerH, 10);
    ctx.fill();
    ctx.fillStyle = "#5A6670";
    ctx.font = "12px sans-serif";
    ctx.fillText("In association with", PAD + 14, footerTop + 20);
    ctx.fillStyle = "#1F2933";
    ctx.font = "14px sans-serif";
    let fy = footerTop + 40;
    for (const line of footerLines) {
      ctx.fillText(line, PAD + 14, fy);
      fy += 20;
    }
    y = footerTop + footerH;
  }

  y += 24;

  // Crop to content height.
  const finalHeight = Math.min(y, tallHeight);
  const out = document.createElement("canvas");
  out.width = W * scale;
  out.height = finalHeight * scale;
  const octx = out.getContext("2d")!;
  octx.drawImage(canvas, 0, 0, W * scale, finalHeight * scale, 0, 0, W * scale, finalHeight * scale);

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not generate image."))), "image/png");
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
