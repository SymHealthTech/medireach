"use client";

import { forwardRef } from "react";
import { getTemplate } from "@/lib/prescription/templates";
import {
  Header,
  SignatureBlock,
  PAGE_STYLE,
  wrapText,
  INK,
  MUTED,
  type PrescriptionDoctorInfo,
} from "@/components/prescription/sheetParts";
import { renderCertificate, formatCertDate } from "@/lib/certificate/render";
import type { CertificateFields, CertificatePatient, CertificateType } from "@/lib/certificate/types";

/**
 * The single A4 medical-certificate sheet — used everywhere (live preview,
 * browser print, and the WhatsApp PDF raster), exactly like <PrescriptionSheet>.
 * It reuses the shared letterhead (Header) and signature block from
 * ./sheetParts, so a certificate carries the doctor's chosen prescription
 * template branding. Unlike a prescription there is no sponsor-pharmacy slot — a
 * certificate is a legal document, so the footer is kept clean (spec). The
 * registration number appears in BOTH the letterhead and the signature block
 * (legal requirement).
 *
 * Fully inline styles so the node serialises cleanly into the SVG <foreignObject>
 * raster and print iframe. A4 flex column: header top, signature/date bottom,
 * the body statement flex-growing between.
 */

export interface CertificateSheetData {
  templateId: string;
  doctor: PrescriptionDoctorInfo;
  type: CertificateType;
  fields: CertificateFields;
  patient: CertificatePatient;
  /** Certificate issue date as `yyyy-mm-dd`. */
  certificateDate: string;
  signatureDataUrl?: string | null;
}

export const CertificateSheet = forwardRef<HTMLDivElement, { data: CertificateSheetData }>(
  function CertificateSheet({ data }, ref) {
    const t = getTemplate(data.templateId);
    const { title, paragraphs } = renderCertificate(data.type, data.fields, data.patient);

    return (
      <div ref={ref} style={PAGE_STYLE}>
        {t.id === "amber-minimal" && (
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: t.accent }} />
        )}
        <Header id={t.id} accent={t.accent} d={data.doctor} />

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10mm 14mm 0", minHeight: 0 }}>
          {/* Centered title with an accent underline */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: INK }}>{title}</div>
            <div style={{ height: 3, width: "34mm", background: t.accent, margin: "3mm auto 0", borderRadius: 2 }} />
          </div>

          {/* Formal statement */}
          <div
            style={{
              marginTop: "12mm",
              display: "flex",
              flexDirection: "column",
              gap: "5mm",
              fontSize: 13.5,
              lineHeight: 1.8,
              textAlign: "justify",
              color: INK,
              ...wrapText,
            }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} style={{ margin: 0 }}>{p}</p>
            ))}
          </div>
        </div>

        {/* Footer — place/date line + signature block (no sponsor slot) */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ padding: "0 12mm", fontSize: 12, color: MUTED }}>
            <span style={{ fontWeight: 600, color: INK }}>Date:</span> {formatCertDate(data.certificateDate)}
            <span style={{ marginLeft: "10mm", fontWeight: 600, color: INK }}>Place:</span> ______________
          </div>
          <SignatureBlock
            signatureDataUrl={data.signatureDataUrl}
            doctorName={data.doctor.name}
            registrationNumber={data.doctor.registrationNumber}
          />
        </div>
      </div>
    );
  },
);
