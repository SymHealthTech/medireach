"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoader } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPost } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";
import { normalizeWhatsappNumber } from "@/lib/client/share";
import { imageUrlToDataUrl, sheetToPdf, printSheet } from "@/lib/client/prescriptionRaster";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import type { CertificateSheetData } from "@/components/certificate/CertificateSheet";
import { CERTIFICATE_TYPE_META, type CertificateType, type CertificateFields } from "@/lib/certificate/types";
import { daysBetween } from "@/lib/certificate/render";
import { buildCertificateText } from "@/lib/certificate/message";
import { cn } from "@/lib/cn";

interface Patient {
  name: string;
  ageYears?: number;
  gender?: string;
  mobile?: string;
}
type ClinicInfo = {
  clinicName: string; clinicAddress: string; clinicTimings: string; clinicMobile?: string;
  doctorName: string; degree: string; registrationNumber: string;
  defaultWhatsappTarget?: string;
  clinicWhatsapp?: string; receptionistWhatsapp?: string; storeWhatsapp?: string;
};
type TplInfo = {
  presetKey: string;
  designation?: string;
  signatureUrl?: string;
};

/** Today's date as `yyyy-mm-dd` for the native date inputs. */
function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Medical Certificate generator (spec: Medical Certificates feature). Doctor-only
 * (the API enforces this too, §5.2). Tied to a patient via the route param, so
 * name/age/sex auto-fill from the record. Reuses the prescription infrastructure
 * throughout — the shared A4 letterhead/signature sheet, the PDF raster, the
 * signed Cloudinary upload, and the WhatsApp share — rather than a parallel
 * pipeline. No AI/speech call anywhere, so it works on Starter and Pro alike.
 */
export default function CertificatePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  // Present when launched from a certificate-only queue entry: issuing the
  // certificate completes that visit.
  const visitId = useSearchParams().get("visitId");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [tpl, setTpl] = useState<TplInfo | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<CertificateType>("unfit");
  const [fields, setFields] = useState<CertificateFields>({});
  const [certificateDate, setCertificateDate] = useState<string>(todayISO());

  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);
  const [shareHint, setShareHint] = useState<"link" | "nolink" | null>(null);
  const [completed, setCompleted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Dedupe the saved record across repeated actions on the same form state, so
  // Download-then-Share doesn't create two records. Keyed on the form content.
  const issuedRef = useRef<{ key: string; certificateId: string } | null>(null);

  useEffect(() => {
    apiGet<{ patient: Patient }>(`/api/patients/${patientId}/history`)
      .then((d) => setPatient(d.patient))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    apiGet<{ template: TplInfo; clinic: ClinicInfo }>("/api/template")
      .then(async (d) => {
        setTpl(d.template);
        setClinic(d.clinic);
        if (d.template.signatureUrl) setSignatureDataUrl(await imageUrlToDataUrl(d.template.signatureUrl));
      })
      .catch(() => {});
  }, [patientId]);

  function setF<K extends keyof CertificateFields>(k: K, v: CertificateFields[K]) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  const leaveDays = useMemo(() => daysBetween(fields.fromDate, fields.toDate), [fields.fromDate, fields.toDate]);

  const sheetData: CertificateSheetData | null = useMemo(() => {
    if (!clinic) return null;
    return {
      templateId: tpl?.presetKey ?? "teal-classic",
      doctor: {
        name: clinic.doctorName || "Your Name",
        degree: clinic.degree,
        registrationNumber: clinic.registrationNumber,
        clinicName: clinic.clinicName || "Your Clinic",
        clinicAddress: clinic.clinicAddress,
        clinicMobile: clinic.clinicMobile,
        clinicTimings: clinic.clinicTimings,
        designation: tpl?.designation,
      },
      type,
      fields,
      patient: { name: patient?.name ?? "Patient", ageYears: patient?.ageYears, gender: patient?.gender },
      certificateDate,
      signatureDataUrl,
    };
  }, [clinic, tpl, type, fields, patient, certificateDate, signatureDataUrl]);

  /** Build the certificate POST body from the current form (only the fields
   *  relevant to the chosen type). Carries visitId so the certificate-only
   *  queue visit is completed on issue. */
  function buildCreateBody() {
    const base = { patientId, type, certificateDate, ...(visitId ? { visitId } : {}) };
    if (type === "unfit") {
      return { ...base, diagnosis: fields.diagnosis, fromDate: fields.fromDate, toDate: fields.toDate, remarks: fields.remarks };
    }
    if (type === "fitness_resume") {
      return { ...base, illness: fields.illness, resumeDate: fields.resumeDate, remarks: fields.remarks };
    }
    return { ...base, jobPurpose: fields.jobPurpose, examinationSummary: fields.examinationSummary };
  }

  const safeName = () => (patient?.name ?? "patient").trim().replace(/[^\w]+/g, "-").toLowerCase() || "patient";

  /**
   * Persist the issued certificate: save the record (once per unique form
   * state), raster the A4 sheet to a PDF, upload it (signed, authenticated),
   * attach it, and return the signed link + the PDF blob. Issuing also completes
   * the certificate-only visit (server-side, via visitId). Returns null on
   * failure so callers can degrade gracefully.
   */
  async function persistIssued(): Promise<{ url: string; pdf: Blob } | null> {
    if (!sheetRef.current) return null;
    const key = JSON.stringify({ type, fields, certificateDate });
    let certificateId = issuedRef.current?.key === key ? issuedRef.current.certificateId : null;
    if (!certificateId) {
      const res = await apiPost<{ certificateId: string }>("/api/certificates", buildCreateBody());
      certificateId = res.certificateId;
      issuedRef.current = { key, certificateId };
    }
    const pdf = await sheetToPdf(sheetRef.current);
    const file = new File([pdf], `certificate-${safeName()}.pdf`, { type: "application/pdf" });
    const { publicId } = await uploadSigned(file, "certificate");
    const { url } = await apiPost<{ url: string }>(`/api/certificates/${certificateId}/pdf`, { publicId });
    if (visitId) setCompleted(true);
    return { url, pdf };
  }

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setBusy("pdf");
    setError(null);
    try {
      // Persist the record (so it's retrievable later) and get the PDF blob; fall
      // back to a purely local raster if the network save fails.
      let pdf: Blob;
      try {
        const issued = await persistIssued();
        pdf = issued?.pdf ?? (await sheetToPdf(sheetRef.current));
      } catch {
        pdf = await sheetToPdf(sheetRef.current);
      }
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${safeName()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function shareWhatsApp() {
    // Reserve the WhatsApp popup synchronously inside the click gesture so the
    // browser doesn't block it after the (async) create + upload.
    const win = window.open("", "_blank");
    const c = clinic;
    const sender = { name: c?.doctorName ?? "", clinicName: c?.clinicName ?? "" };

    const waTarget = c?.defaultWhatsappTarget ?? "patient";
    const recipientRaw =
      waTarget === "clinic"       ? c?.clinicWhatsapp :
      waTarget === "receptionist" ? c?.receptionistWhatsapp :
      waTarget === "store"        ? c?.storeWhatsapp :
      /* patient */                 patient?.mobile ?? "";
    const recipientDigits = normalizeWhatsappNumber(recipientRaw);

    setBusy("share");
    setShareHint(null);
    setError(null);
    let pdfUrl: string | undefined;
    try {
      const issued = await persistIssued();
      pdfUrl = issued?.url;
    } catch {
      // Best-effort: still open the chat, just without the link.
    }

    const text = buildCertificateText(sender, pdfUrl);
    const url = recipientDigits
      ? `https://wa.me/${recipientDigits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (win && !win.closed) win.location.href = url;
    else window.open(url, "_blank");

    setShareHint(pdfUrl ? "link" : "nolink");
    setBusy(null);
  }

  if (loading || !sheetData) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Certificate"
        subtitle={patient ? `For ${patient.name}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
            <Button variant="outline" onClick={() => { if (sheetRef.current) void printSheet(sheetRef.current); }}>
              Print
            </Button>
          </div>
        }
      />

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {visitId && (
        completed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
            <p className="text-sm font-semibold text-success">✓ Certificate issued — this visit is complete.</p>
            <Button variant="brand" size="sm" onClick={() => router.push("/app/queue")}>Back to queue</Button>
          </div>
        ) : (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">
            Certificate-only visit — issue the certificate below and this queue entry is marked complete.
          </p>
        )
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-5">
          {/* Type picker */}
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Certificate type</p>
            <div className="space-y-2">
              {CERTIFICATE_TYPE_META.map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setType(m.type)}
                  className={cn(
                    "block w-full rounded-xl border p-3 text-left",
                    type === m.type ? "border-brand ring-2 ring-brand" : "border-line",
                  )}
                >
                  <span className="block font-medium text-ink">{m.label}</span>
                  <span className="block text-xs text-ink-muted">{m.blurb}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Type-specific fields */}
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-ink">Details</p>

            {/* Auto-filled patient row (read-only) */}
            <div className="rounded-xl border border-line bg-surface-raised px-3 py-2 text-xs text-ink-muted">
              <span className="font-semibold text-ink-subtle">Patient:</span> {patient?.name ?? "—"}
              {patient?.ageYears != null && <> · {patient.ageYears} yrs</>}
              {patient?.gender && <> · {patient.gender}</>}
              <span className="ml-1">(auto-filled from record)</span>
            </div>

            {type === "unfit" && (
              <>
                <Field label="Diagnosis / reason for unfitness">
                  <Input
                    placeholder="e.g. Acute viral fever"
                    value={fields.diagnosis ?? ""}
                    onChange={(e) => setF("diagnosis", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rest / leave from">
                    <Input type="date" value={fields.fromDate ?? ""} onChange={(e) => setF("fromDate", e.target.value)} />
                  </Field>
                  <Field label="Rest / leave to">
                    <Input type="date" value={fields.toDate ?? ""} onChange={(e) => setF("toDate", e.target.value)} />
                  </Field>
                </div>
                <p className="text-xs text-ink-muted">
                  Total: <span className="font-semibold text-ink">{leaveDays}</span> day{leaveDays === 1 ? "" : "s"}{" "}
                  <span className="text-ink-muted">(auto-calculated)</span>
                </p>
                <Field label="Remarks (optional)">
                  <Input value={fields.remarks ?? ""} onChange={(e) => setF("remarks", e.target.value)} />
                </Field>
              </>
            )}

            {type === "fitness_resume" && (
              <>
                <Field label="Prior illness / reason recovered from">
                  <Input
                    placeholder="e.g. Typhoid fever"
                    value={fields.illness ?? ""}
                    onChange={(e) => setF("illness", e.target.value)}
                  />
                </Field>
                <Field label="Fit to resume duty from">
                  <Input type="date" value={fields.resumeDate ?? ""} onChange={(e) => setF("resumeDate", e.target.value)} />
                </Field>
                <Field label="Remarks (optional)">
                  <Input value={fields.remarks ?? ""} onChange={(e) => setF("remarks", e.target.value)} />
                </Field>
              </>
            )}

            {type === "fitness_job" && (
              <>
                <Field label="Purpose / job or employer (optional)">
                  <Input
                    placeholder="e.g. for the post of Driver / for employment purposes"
                    value={fields.jobPurpose ?? ""}
                    onChange={(e) => setF("jobPurpose", e.target.value)}
                  />
                </Field>
                <Field label="Examination summary (optional)">
                  <Input
                    placeholder="e.g. Vitals within normal limits; no significant findings"
                    value={fields.examinationSummary ?? ""}
                    onChange={(e) => setF("examinationSummary", e.target.value)}
                  />
                </Field>
              </>
            )}

            <Field label="Certificate date">
              <Input type="date" value={certificateDate} onChange={(e) => setCertificateDate(e.target.value)} />
            </Field>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button variant="brand" size="lg" className="w-full" onClick={shareWhatsApp} disabled={busy !== null}>
              {busy === "share" ? "Preparing…" : "Send on WhatsApp"}
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={downloadPdf} disabled={busy !== null}>
              {busy === "pdf" ? "Generating…" : "Download PDF"}
            </Button>
            {shareHint === "link" && (
              <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand" role="status">
                📄 Certificate link added to the WhatsApp message — the patient taps it to view or download the PDF.
              </p>
            )}
            {shareHint === "nolink" && (
              <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="status">
                ⚠️ Couldn&apos;t add the certificate link — the message opened without it. Please tap Send again.
              </p>
            )}
          </div>
        </div>

        {/* Live A4 preview */}
        <div className="lg:sticky lg:top-[57px] lg:py-6">
          <p className="mb-2 text-sm font-semibold text-ink">
            Preview <span className="ml-1 text-xs font-normal text-ink-muted">(A4 paper size)</span>
          </p>
          <CertificatePreview data={sheetData} sheetRef={sheetRef} />
          <p className="mt-2 text-center text-xs text-ink-muted">This is exactly what prints and ships on WhatsApp.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</label>
      {children}
    </div>
  );
}
