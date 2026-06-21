"use client";

import { getPreset } from "@/lib/prescription/presets";

/**
 * Renders the patient-facing prescription as an A5-proportioned PNG (148×210 mm
 * ratio, W=820 H=1163 @2×). At ~280 DPI on A5 paper 1 logical pixel ≈ 0.5 pt,
 * so all font sizes are calibrated to look correct when printed.
 */
export interface PrescriptionImageContent {
  presetKey: string;
  logoPlacement: "left" | "center" | "right";
  logoStyle?: "caduceus" | "plus";
  clinicName: string;
  clinicAddress: string;
  doctorName: string;
  registrationNumber: string;
  degree: string;
  designation?: string;
  services?: string[];
  clinicTimings: string;
  patientName: string;
  patientMeta: string; // e.g. "Male · 32y"
  date: string;
  diagnosis?: string;
  medicines: string[]; // patient-facing lines
  footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
}

const W = 820;
const H_A5 = Math.round(W * 210 / 148); // 1163
const PAD = 48;

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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export async function renderPrescriptionImage(
  content: PrescriptionImageContent,
): Promise<Blob> {
  const preset = getPreset(content.presetKey);
  const scale = 2; // @2× for crisp WhatsApp / print output
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H_A5 * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H_A5);

  // ── Header ─────────────────────────────────────────────────────────────────
  const HEADER_H = 176;
  const isThreeColumn = preset.headerLayout === "three-column";
  const isCenter = !isThreeColumn && preset.headerAlign === "center";

  if (preset.headerBg) {
    ctx.fillStyle = preset.headerBg;
    ctx.fillRect(0, 0, W, HEADER_H);
    const shadowGrad = ctx.createLinearGradient(0, HEADER_H - 20, 0, HEADER_H);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0.10)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, HEADER_H - 20, W, 20);
  } else {
    ctx.fillStyle = preset.accent;
    ctx.fillRect(0, 0, 5, HEADER_H + 28);
  }

  const BADGE = 60;

  if (isThreeColumn) {
    // ── THREE-COLUMN HEADER: clinic left | logo center | doctor right ─────────
    const BADGE_X3 = Math.round(W / 2 - BADGE / 2);
    const BADGE_Y3 = Math.round((HEADER_H - BADGE) / 2);
    const COL_LEFT_MAX = BADGE_X3 - PAD - 36; // max width before badge
    const COL_RIGHT = W - PAD;

    // Center — logo badge
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    roundRect(ctx, BADGE_X3, BADGE_Y3, BADGE, BADGE, 14);
    ctx.fill();
    if (content.logoStyle === "plus") {
      drawMedicalCross(ctx, BADGE_X3 + 11, BADGE_Y3 + 11, BADGE - 22, preset.accent);
    } else {
      drawCaduceus(ctx, BADGE_X3 + 9, BADGE_Y3 + 7, BADGE - 16, preset.accent);
    }

    // Left — clinic name + address
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 27px sans-serif";
    const cnLines = wrap(ctx, content.clinicName || "Clinic", COL_LEFT_MAX);
    let lY = 38;
    ctx.fillText(cnLines[0]!, PAD, lY);
    lY += 28;
    if (cnLines[1]) {
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(cnLines[1], PAD, lY);
      lY += 24;
    }

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    const addrLines = wrap(ctx, content.clinicAddress || "", COL_LEFT_MAX);
    lY += 6;
    for (const line of addrLines.slice(0, 3)) {
      ctx.fillText(line, PAD, lY);
      lY += 20;
    }

    // Right — doctor details
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 21px sans-serif";
    let rY = 36;
    ctx.fillText(content.doctorName, COL_RIGHT, rY);
    rY += 23;

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.87)";
    if (content.degree) {
      ctx.fillText(content.degree, COL_RIGHT, rY);
      rY += 19;
    }
    if (content.registrationNumber) {
      ctx.fillText(`Reg. No: ${content.registrationNumber}`, COL_RIGHT, rY);
      rY += 19;
    }
    if (content.designation) {
      ctx.fillText(content.designation, COL_RIGHT, rY);
      rY += 19;
    }
    if (content.clinicTimings) {
      ctx.fillText(content.clinicTimings, COL_RIGHT, rY);
    }

    // Services bar — bottom of header band, separated by |
    if (content.services && content.services.length > 0) {
      const servicesText = content.services.join("  |  ");
      ctx.textAlign = "center";
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.fillText(servicesText, W / 2, HEADER_H - 12);
      ctx.textAlign = "left";
    }
  } else {
    // ── LEGACY BADGE + TEXT LAYOUTS (left / center) ───────────────────────────
    const BADGE_Y = 30;
    const badgeX = PAD + (preset.headerBg ? 0 : 14);
    const badgeBg = preset.headerBg ? "rgba(255,255,255,0.93)" : preset.accent;
    const iconColor = preset.headerBg ? preset.accent : "#FFFFFF";

    ctx.fillStyle = badgeBg;
    roundRect(ctx, badgeX, BADGE_Y, BADGE, BADGE, 14);
    ctx.fill();
    if (content.logoStyle === "plus") {
      drawMedicalCross(ctx, badgeX + 11, BADGE_Y + 11, BADGE - 22, iconColor);
    } else {
      drawCaduceus(ctx, badgeX + 9, BADGE_Y + 7, BADGE - 16, iconColor);
    }

    const pColor = preset.headerBg ? "#FFFFFF" : preset.accent;
    const sColor = preset.headerBg ? "rgba(255,255,255,0.82)" : "#6B7280";

    if (isCenter) {
      ctx.textAlign = "center";
      const tx = W / 2;

      ctx.fillStyle = pColor;
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(content.clinicName || "Clinic", tx, BADGE_Y + 28);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = sColor;
      if (content.clinicAddress) ctx.fillText(content.clinicAddress, tx, BADGE_Y + 52);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = pColor;
      ctx.fillText(
        `${content.doctorName}${content.degree ? `  ·  ${content.degree}` : ""}`,
        tx, BADGE_Y + 76,
      );

      ctx.font = "14px sans-serif";
      ctx.fillStyle = sColor;
      const meta = [
        content.registrationNumber ? `Reg: ${content.registrationNumber}` : "",
        content.designation || "",
        content.clinicTimings ? `Timings: ${content.clinicTimings}` : "",
      ].filter(Boolean).join("   ·   ");
      if (meta) ctx.fillText(meta, tx, BADGE_Y + 98);

      if (content.services && content.services.length > 0) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = preset.headerBg ? "rgba(255,255,255,0.70)" : hexToRgba(preset.accent, 0.65);
        ctx.fillText(content.services.join("  |  "), tx, HEADER_H - 12);
      }
    } else {
      ctx.textAlign = "left";
      const tx = badgeX + BADGE + 18;

      ctx.fillStyle = pColor;
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(content.clinicName || "Clinic", tx, BADGE_Y + 30);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = sColor;
      if (content.clinicAddress) ctx.fillText(content.clinicAddress, tx, BADGE_Y + 54);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = pColor;
      ctx.fillText(
        `${content.doctorName}${content.degree ? `  ·  ${content.degree}` : ""}`,
        tx, BADGE_Y + 78,
      );

      ctx.font = "14px sans-serif";
      ctx.fillStyle = sColor;
      let leftY = BADGE_Y + 98;
      if (content.registrationNumber) { ctx.fillText(`Reg. No: ${content.registrationNumber}`, tx, leftY); leftY += 18; }
      if (content.designation) ctx.fillText(content.designation, tx, leftY);

      if (content.clinicTimings) {
        ctx.textAlign = "right";
        ctx.fillText(content.clinicTimings, W - PAD, BADGE_Y + 54);
        ctx.textAlign = "left";
      }

      if (content.services && content.services.length > 0) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = preset.headerBg ? "rgba(255,255,255,0.70)" : hexToRgba(preset.accent, 0.65);
        ctx.textAlign = "center";
        ctx.fillText(content.services.join("  |  "), W / 2, HEADER_H - 12);
        ctx.textAlign = "left";
      }
    }
  }

  ctx.textAlign = "left";
  let y = HEADER_H + 14;

  // Rule for non-band presets
  if (preset.showRule && !preset.headerBg) {
    ctx.strokeStyle = preset.accent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 14;
  }
  y += 16;

  // ── Patient section — 50 / 50 split ────────────────────────────────────────
  // Left 50 %: patient name
  // Right 50 %: age+gender (left) and date (right) on the same line
  const BOX_H = 94;
  const BPAD = 18;
  const splitX = PAD + Math.floor((W - 2 * PAD) / 2); // exact 50 %

  ctx.fillStyle = "#F6F8FA";
  roundRect(ctx, PAD, y, W - 2 * PAD, BOX_H, 12);
  ctx.fill();

  // Vertical divider at midpoint
  ctx.strokeStyle = "#DDE3EA";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(splitX, y + 10);
  ctx.lineTo(splitX, y + BOX_H - 10);
  ctx.stroke();

  // Left — patient name
  ctx.font = "bold 12px sans-serif"; // ≈ 6 pt label
  ctx.fillStyle = "#9CA3AF";
  ctx.textAlign = "left";
  ctx.fillText("PATIENT NAME", PAD + BPAD, y + 24);
  ctx.font = "bold 23px sans-serif"; // ≈ 11.5 pt value
  ctx.fillStyle = preset.ink;
  ctx.fillText(content.patientName, PAD + BPAD, y + 60);

  // Right — age/gender (left-aligned) | date (right-aligned) on same row
  ctx.font = "bold 12px sans-serif"; // ≈ 6 pt labels
  ctx.fillStyle = "#9CA3AF";
  ctx.textAlign = "left";
  ctx.fillText("AGE / GENDER", splitX + BPAD, y + 24);
  ctx.textAlign = "right";
  ctx.fillText("DATE", W - PAD - BPAD, y + 24);

  ctx.font = "bold 19px sans-serif"; // ≈ 9.5 pt values
  ctx.fillStyle = preset.ink;
  ctx.textAlign = "left";
  ctx.fillText(content.patientMeta, splitX + BPAD, y + 60);
  ctx.textAlign = "right";
  ctx.fillText(content.date, W - PAD - BPAD, y + 60);

  ctx.textAlign = "left";
  y += BOX_H + 28; // tight gap — keeps Rx visually close

  // ── Rx heading — sits high, generous space BELOW before medicines ───────────
  ctx.fillStyle = preset.accent;
  ctx.font = "bold 42px serif"; // ≈ 21 pt — prominent Rx symbol
  ctx.fillText("Rx", PAD, y + 36);

  ctx.strokeStyle = hexToRgba(preset.accent, 0.30);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(PAD + 52, y + 18);
  ctx.lineTo(W - PAD, y + 18);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 72; // ← large gap between Rx line and first medicine

  // ── Medicines ──────────────────────────────────────────────────────────────
  if (content.medicines.length === 0) {
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "italic 17px sans-serif";
    ctx.fillText("No medicines prescribed", PAD + 14, y);
    y += 30;
  } else {
    content.medicines.forEach((med, i) => {
      // Numbered circle
      ctx.fillStyle = preset.accent;
      ctx.beginPath();
      ctx.arc(PAD + 14, y + 14, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), PAD + 14, y + 19);
      ctx.textAlign = "left";

      // Medicine name — bold, prominent
      ctx.font = "bold 20px sans-serif"; // ≈ 10 pt
      ctx.fillStyle = preset.ink;
      const mLines = wrap(ctx, med, W - 2 * PAD - 38);
      ctx.fillText(mLines[0] ?? med, PAD + 36, y + 18);
      y += 34;

      for (let li = 1; li < mLines.length; li++) {
        ctx.font = "18px sans-serif"; // ≈ 9 pt continuation
        ctx.fillStyle = "#5A6670";
        ctx.fillText(mLines[li]!, PAD + 36, y + 4);
        y += 24;
      }

      if (i < content.medicines.length - 1) {
        ctx.strokeStyle = "#EEF1F4";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(PAD + 36, y + 8);
        ctx.lineTo(W - PAD, y + 8);
        ctx.stroke();
        y += 18;
      } else {
        y += 10;
      }
    });
  }

  // ── Sponsor footer — always pinned to bottom of A5 page ────────────────────
  const f = content.footer;
  const hasSponsor = !!(f && (f.storeName || f.storeAddress || f.storeContact));
  const FOOTER_H = 124;
  const FOOTER_Y = H_A5 - FOOTER_H;
  const SIG_Y = FOOTER_Y - 80;

  // Doctor's signature strip
  ctx.strokeStyle = "#D1D5DB";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(W - PAD - 220, SIG_Y);
  ctx.lineTo(W - PAD, SIG_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "bold 12px sans-serif"; // ≈ 6 pt
  ctx.fillStyle = "#9CA3AF";
  ctx.textAlign = "right";
  ctx.fillText("DOCTOR'S SIGNATURE", W - PAD, SIG_Y + 18);
  ctx.font = "14px sans-serif"; // ≈ 7 pt
  ctx.fillStyle = "#6B7280";
  ctx.fillText(content.doctorName, W - PAD, SIG_Y + 38);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#CBD5E1";
  ctx.textAlign = "center";
  ctx.fillText("Issued via MediReach", W / 2, SIG_Y + 38);
  ctx.textAlign = "left";

  // ── Footer band ─────────────────────────────────────────────────────────────
  if (hasSponsor && f) {
    ctx.fillStyle = "#F0F4F8";
    ctx.fillRect(0, FOOTER_Y, W, FOOTER_H);

    ctx.fillStyle = preset.accent;
    ctx.fillRect(0, FOOTER_Y, W, 3);

    // "MEDICINES AVAILABLE AT" pill badge
    const PILL_LABEL = "MEDICINES AVAILABLE AT";
    ctx.font = "bold 11px sans-serif";
    const pillW = ctx.measureText(PILL_LABEL).width + 24;
    ctx.fillStyle = preset.accent;
    roundRect(ctx, PAD, FOOTER_Y + 14, pillW, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(PILL_LABEL, PAD + pillW / 2, FOOTER_Y + 29);
    ctx.textAlign = "left";

    // Store name
    ctx.fillStyle = preset.ink;
    ctx.font = "bold 22px sans-serif"; // ≈ 11 pt
    ctx.fillText(f.storeName ?? "", PAD, FOOTER_Y + 58);

    // Address and tel on separate lines
    ctx.font = "15px sans-serif"; // ≈ 7.5 pt
    ctx.fillStyle = "#6B7280";
    let fy = FOOTER_Y + 80;
    if (f.storeAddress) { ctx.fillText(f.storeAddress, PAD, fy); fy += 20; }
    if (f.storeContact) { ctx.fillText(`Tel: ${f.storeContact}`, PAD, fy); }

    // Decorative Rx circle on the right
    const RCX = W - PAD - 34;
    const RCY = FOOTER_Y + FOOTER_H / 2 + 4;
    ctx.fillStyle = hexToRgba(preset.accent, 0.13);
    ctx.beginPath();
    ctx.arc(RCX, RCY, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexToRgba(preset.accent, 0.9);
    ctx.font = "bold 28px serif"; // ≈ 14 pt
    ctx.textAlign = "center";
    ctx.fillText("Rx", RCX, RCY + 10);
    ctx.textAlign = "left";
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not generate image."))),
      "image/png",
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Caduceus: staff with two interweaving snake bezier curves and wing ellipses
function drawCaduceus(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  size: number,
  color: string,
) {
  const cx = bx + size / 2;
  const top = by + size * 0.08;
  const bot = by + size * 0.92;
  const mid = by + size * 0.52;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, bot);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, bot);
  ctx.bezierCurveTo(bx + size * 0.08, by + size * 0.72, bx + size * 0.92, by + size * 0.56, cx, mid);
  ctx.bezierCurveTo(bx + size * 0.08, by + size * 0.38, bx + size * 0.9, by + size * 0.18, cx, top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, bot);
  ctx.bezierCurveTo(bx + size * 0.92, by + size * 0.72, bx + size * 0.08, by + size * 0.56, cx, mid);
  ctx.bezierCurveTo(bx + size * 0.92, by + size * 0.38, bx + size * 0.1, by + size * 0.18, cx, top);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.27, top + size * 0.12, size * 0.23, size * 0.09, -Math.PI / 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.27, top + size * 0.12, size * 0.23, size * 0.09, Math.PI / 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Medical cross / plus sign
function drawMedicalCross(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  size: number,
  color: string,
) {
  const pad = size * 0.22;
  const thick = size * 0.34;
  ctx.fillStyle = color;
  ctx.fillRect(bx + pad, by + (size - thick) / 2, size - 2 * pad, thick);
  ctx.fillRect(bx + (size - thick) / 2, by + pad, thick, size - 2 * pad);
}
