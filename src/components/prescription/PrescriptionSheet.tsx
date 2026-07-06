"use client";

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { getTemplate } from "@/lib/prescription/templates";
import {
  buildVitals,
  toRxMedicine,
  type RxMedicineInput,
  type VitalsInput,
} from "@/lib/prescription/render";

/**
 * The single A4 prescription sheet used everywhere (spec §8 redesign) — on-screen
 * preview, browser print, and the WhatsApp raster all render THIS component, so
 * what the doctor previews is exactly what prints and ships.
 *
 * All five templates share one clinical core (patient row, vitals, ℞ + medicines,
 * signature, "Powered by MediReach") built once below; only the header and the
 * sponsor-footer chrome differ per template, driven by the id switch. Styling is
 * fully inline (no Tailwind/utility classes) so the node serialises cleanly into
 * the SVG <foreignObject> raster and the print iframe.
 *
 * The page is a fixed-height A4 flex column: header pinned top, footer pinned
 * bottom, and the ℞ area flex-growing between them — so the footer stays at the
 * bottom of the sheet even with a single medicine.
 */

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

export interface PrescriptionSheetData {
  templateId: string;
  doctor: PrescriptionDoctorInfo;
  patient: { name: string; ageYears?: number; gender?: string };
  date: string;
  oe?: VitalsInput;
  medicines: RxMedicineInput[];
  signatureDataUrl?: string | null;
  sponsor?: { storeName?: string; storeAddress?: string; storeContact?: string } | null;
}

const INK = "#1F2933";
const MUTED = "#7A828A";
const FAINT = "#C8CDD2";

const PAGE_STYLE: CSSProperties = {
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

const wrapText: CSSProperties = { overflowWrap: "break-word", wordBreak: "break-word" };

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function joinDot(parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(" · ");
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

function Header({ id, accent, d }: { id: string; accent: string; d: PrescriptionDoctorInfo }) {
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

function joinComma(parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(", ");
}

// ── Clinical core (identical in all five) ─────────────────────────────────────

function ClinicalCore({ data, accent, vitalsBg }: { data: PrescriptionSheetData; accent: string; vitalsBg?: string }) {
  const { patient, date, oe, medicines } = data;
  const vitals = buildVitals(oe);
  const rx = medicines.filter((m) => m.name?.trim()).map(toRxMedicine);
  const ageGender = joinDot([patient.ageYears != null ? `${patient.ageYears} yrs` : "", patient.gender ? cap(patient.gender) : ""]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "6mm 12mm 0", minHeight: 0 }}>
      {/* Patient row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6mm" }}>
        <div style={{ ...wrapText }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#000000" }}>{patient.name}</span>
          {ageGender && <span style={{ fontSize: 12, fontWeight: 400, color: MUTED, marginLeft: 8 }}>{ageGender}</span>}
        </div>
        <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>{date}</div>
      </div>

      {/* Vitals row — only present values; nothing renders if empty */}
      {vitals.length > 0 && (
        <div
          style={{
            marginTop: "3mm",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5mm 6mm",
            fontSize: 11,
            color: "#5A6670",
            background: vitalsBg ?? "transparent",
            padding: vitalsBg ? "2.5mm 3mm" : 0,
            borderRadius: vitalsBg ? 4 : 0,
          }}
        >
          {vitals.map((v) => (
            <span key={v.label}>
              <span style={{ fontWeight: 600, color: "#3A424A" }}>{v.label}:</span> {v.value}
            </span>
          ))}
        </div>
      )}

      {/* ℞ + medicines */}
      <div style={{ marginTop: "6mm", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: accent, lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif" }}>℞</div>
        <div style={{ marginTop: "4mm", display: "flex", flexDirection: "column", gap: "3.5mm" }}>
          {rx.length === 0 ? (
            <div style={{ fontSize: 12, fontStyle: "italic", color: MUTED }}>No medicines prescribed.</div>
          ) : (
            rx.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "6mm", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, ...wrapText }}>
                    {i + 1}. {m.name}
                  </div>
                  {m.salt && <div style={{ fontSize: 11, fontStyle: "italic", color: MUTED, marginTop: 1, ...wrapText }}>{m.salt}</div>}
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {m.grid && <div style={{ fontSize: 13, fontWeight: 600, color: INK, letterSpacing: 0.3 }}>{m.grid}</div>}
                  {m.timingLine && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{m.timingLine}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Footer (signature + byline + sponsor chrome) ──────────────────────────────

function Footer({ id, data, accent, pharmacyColor, sponsorBg }: {
  id: string;
  data: PrescriptionSheetData;
  accent: string;
  pharmacyColor: string;
  sponsorBg: string | null;
}) {
  const sp = data.sponsor;
  const hasSponsor = !!(sp && (sp.storeName || sp.storeAddress || sp.storeContact));
  const onDark = id === "teal-gold";
  const sponsorText = onDark ? "rgba(255,255,255,0.78)" : MUTED;

  const sponsorBorder =
    id === "amber-minimal" ? `2px solid ${accent}` :
    id === "amber-underline" ? "1px solid #E5E9ED" :
    "none";

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Signature (right) + Powered by MediReach (left) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "6mm", padding: "6mm 12mm 4mm" }}>
        <div style={{ fontSize: 10, color: FAINT }}>Powered by MediReach</div>
        <div style={{ textAlign: "right", minWidth: "45mm" }}>
          {data.signatureDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={data.signatureDataUrl} alt="Signature" style={{ maxHeight: "16mm", maxWidth: "55mm", objectFit: "contain", display: "block", marginLeft: "auto" }} />
          )}
          <div style={{ borderTop: "1px solid #9AA1A8", width: "50mm", marginLeft: "auto", marginTop: data.signatureDataUrl ? "2mm" : "11mm" }} />
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: "1.5mm", color: INK }}>Dr. {data.doctor.name}</div>
        </div>
      </div>

      {/* Sponsor pharmacy footer — only when a sponsor is set */}
      {hasSponsor && (
        <div
          style={{
            background: sponsorBg ?? "#fff",
            borderTop: sponsorBorder,
            padding: "4mm 12mm",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "6mm",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: pharmacyColor, ...wrapText }}>{sp!.storeName}</div>
          <div style={{ textAlign: "right", fontSize: 10.5, color: sponsorText, ...wrapText }}>
            {sp!.storeAddress && <div>{sp!.storeAddress}</div>}
            {sp!.storeContact && <div>{sp!.storeContact}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export const PrescriptionSheet = forwardRef<HTMLDivElement, { data: PrescriptionSheetData }>(
  function PrescriptionSheet({ data }, ref) {
    const t = getTemplate(data.templateId);
    return (
      <div ref={ref} style={PAGE_STYLE}>
        {t.id === "amber-minimal" && (
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: t.accent }} />
        )}
        <Header id={t.id} accent={t.accent} d={data.doctor} />
        <ClinicalCore data={data} accent={t.accent} vitalsBg={t.vitalsBg} />
        <Footer id={t.id} data={data} accent={t.accent} pharmacyColor={t.pharmacyColor} sponsorBg={t.sponsorBg} />
      </div>
    );
  },
);
