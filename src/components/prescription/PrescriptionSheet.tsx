"use client";

import { forwardRef } from "react";
import { getTemplate } from "@/lib/prescription/templates";
import {
  buildVitals,
  toRxMedicine,
  type RxMedicineInput,
  type VitalsInput,
} from "@/lib/prescription/render";
import {
  Header,
  SignatureBlock,
  PAGE_STYLE,
  wrapText,
  cap,
  joinDot,
  INK,
  MUTED,
  type PrescriptionDoctorInfo,
} from "@/components/prescription/sheetParts";

/**
 * The single A4 prescription sheet used everywhere (spec §8 redesign) — on-screen
 * preview, browser print, and the WhatsApp raster all render THIS component, so
 * what the doctor previews is exactly what prints and ships.
 *
 * All five templates share one clinical core (patient row, vitals, ℞ + medicines,
 * signature, "Powered by MediReach") built once below; only the header and the
 * sponsor-footer chrome differ per template, driven by the id switch. The header
 * and signature block live in ./sheetParts so the certificate sheet reuses the
 * identical letterhead. Styling is fully inline (no Tailwind/utility classes) so
 * the node serialises cleanly into the SVG <foreignObject> raster and the print
 * iframe.
 *
 * The page is a fixed-height A4 flex column: header pinned top, footer pinned
 * bottom, and the ℞ area flex-growing between them — so the footer stays at the
 * bottom of the sheet even with a single medicine.
 */

// Re-exported so existing importers keep resolving it from this module.
export type { PrescriptionDoctorInfo };

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
      <SignatureBlock signatureDataUrl={data.signatureDataUrl} doctorName={data.doctor.name} />

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
