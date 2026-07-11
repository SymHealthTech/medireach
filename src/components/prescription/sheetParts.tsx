"use client";

import type { CSSProperties } from "react";
import { doctorDisplayName } from "@/lib/doctorName";

/**
 * Shared A4 sheet building blocks — the doctor letterhead (per-template header
 * chrome), the signature/byline block, the page frame, and the colour palette.
 *
 * Extracted from <PrescriptionSheet> so the Medical Certificate sheet renders
 * the EXACT same letterhead and signature branding as the doctor's chosen
 * prescription template (spec: "reuse the doctor's currently-selected
 * prescription template's header style so the certificate matches their
 * prescription branding"). Both sheets import from here, so the header can never
 * drift between a prescription and a certificate. Styling is fully inline (no
 * utility classes) so the node serialises cleanly into the SVG <foreignObject>
 * raster and the print iframe.
 */

export const INK = "#1F2933";
export const MUTED = "#7A828A";
export const FAINT = "#C8CDD2";

export const PAGE_STYLE: CSSProperties = {
  width: "210mm",
  height: "297mm",
  boxSizing: "border-box",
  background: "#fff",
  color: INK,
  fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

export const wrapText: CSSProperties = { overflowWrap: "break-word", wordBreak: "break-word" };

export interface PrescriptionDoctorInfo {
  name: string;
  degree?: string;
  registrationNumber?: string;
  designation?: string;
  clinicName: string;
  clinicAddress?: string;
  clinicMobile?: string;
  clinicTimings?: string;
}

export function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function joinDot(parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

export function joinComma(parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(", ");
}

// ── Per-template header chrome ────────────────────────────────────────────────

function DoctorLines({ d, regColor, designationColor }: { d: PrescriptionDoctorInfo; regColor: string; designationColor: string }) {
  const line2 = joinDot([d.degree, d.registrationNumber && `Reg. No. ${d.registrationNumber}`]);
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, ...wrapText }}>{d.name}</div>
      {line2 && <div style={{ fontSize: 11, color: regColor, marginTop: 3, ...wrapText }}>{line2}</div>}
      {d.designation && <div style={{ fontSize: 12, color: designationColor, marginTop: 3, ...wrapText }}>{d.designation}</div>}
    </>
  );
}

function ClinicLines({ d, color }: { d: PrescriptionDoctorInfo; color: string }) {
  return (
    <div style={{ textAlign: "right", minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, ...wrapText }}>{d.clinicName}</div>
      {d.clinicAddress && <div style={{ fontSize: 11, color, marginTop: 3, ...wrapText }}>{d.clinicAddress}</div>}
      {d.clinicMobile && <div style={{ fontSize: 11, color, marginTop: 1, ...wrapText }}>{d.clinicMobile}</div>}
      {d.clinicTimings && <div style={{ fontSize: 11, color, marginTop: 1, ...wrapText }}>{d.clinicTimings}</div>}
    </div>
  );
}

/** The doctor letterhead, styled per template id — identical across the
 *  prescription and certificate sheets. */
export function Header({ id, accent, d }: { id: string; accent: string; d: PrescriptionDoctorInfo }) {
  const pad = "8mm 12mm";

  // Banded (white-on-colour) headers: Classic Teal + Deep Teal & Gold.
  if (id === "teal-classic" || id === "teal-gold") {
    const gold = "#C9A227";
    const lightTeal = id === "teal-gold" ? "#8FD4C8" : "rgba(255,255,255,0.82)";
    return (
      <>
        <header style={{ background: accent, color: "#fff", padding: pad, display: "flex", justifyContent: "space-between", gap: "8mm" }}>
          <div style={{ minWidth: 0 }}>
            <DoctorLines d={d} regColor={lightTeal} designationColor={id === "teal-gold" ? gold : "#fff"} />
          </div>
          <ClinicLines d={d} color={lightTeal} />
        </header>
        {id === "teal-gold" && <div style={{ height: 3, background: gold }} />}
      </>
    );
  }

  // Centered slate header on a soft band.
  if (id === "slate-centered") {
    const line2 = joinDot([d.degree, d.registrationNumber && `Reg. No. ${d.registrationNumber}`, d.designation]);
    const line3 = joinDot([joinComma([d.clinicName, d.clinicAddress]), d.clinicMobile, d.clinicTimings]);
    return (
      <header style={{ background: "#F5F8FC", borderBottom: `3px solid ${accent}`, padding: pad, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1A365D", ...wrapText }}>{d.name}</div>
        {line2 && <div style={{ fontSize: 12, color: "#4A5568", marginTop: 3, ...wrapText }}>{line2}</div>}
        {line3 && <div style={{ fontSize: 12, color: "#4A5568", marginTop: 2, ...wrapText }}>{line3}</div>}
      </header>
    );
  }

  // Plain white headers with an accent rule (Minimal Amber, Modern Amber).
  const borderBottom = id === "amber-minimal" ? `2px solid ${accent}` : `3px solid ${accent}`;
  return (
    <header style={{ padding: "8mm 12mm 5mm", borderBottom, display: "flex", justifyContent: "space-between", gap: "8mm" }}>
      <div style={{ minWidth: 0 }}>
        <DoctorLines d={d} regColor={MUTED} designationColor={MUTED} />
      </div>
      <ClinicLines d={d} color={MUTED} />
    </header>
  );
}

// ── Signature + byline block ──────────────────────────────────────────────────

/**
 * The bottom-right signature block — optional signature image, a rule, the
 * doctor's printed name, and (for certificates) the registration number, which
 * is a legal requirement on a certificate. "Powered by MediReach" sits small and
 * light on the left. Shared verbatim with the prescription footer so branding is
 * consistent; the prescription omits `registrationNumber` (it already appears in
 * its header) to keep its existing output identical.
 */
export function SignatureBlock({
  signatureDataUrl,
  doctorName,
  registrationNumber,
}: {
  signatureDataUrl?: string | null;
  doctorName: string;
  registrationNumber?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "6mm", padding: "6mm 12mm 4mm" }}>
      <div style={{ fontSize: 10, color: FAINT }}>Powered by MediReach</div>
      <div style={{ textAlign: "right", minWidth: "45mm" }}>
        {signatureDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={signatureDataUrl} alt="Signature" style={{ maxHeight: "16mm", maxWidth: "55mm", objectFit: "contain", display: "block", marginLeft: "auto" }} />
        )}
        <div style={{ borderTop: "1px solid #9AA1A8", width: "50mm", marginLeft: "auto", marginTop: signatureDataUrl ? "2mm" : "11mm" }} />
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: "1.5mm", color: INK }}>{doctorDisplayName(doctorName)}</div>
        {registrationNumber && (
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: "0.5mm" }}>Reg. No. {registrationNumber}</div>
        )}
      </div>
    </div>
  );
}
