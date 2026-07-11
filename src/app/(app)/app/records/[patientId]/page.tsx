"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/client/api";
import { sharePrescriptionPdf, normalizeWhatsappNumber, writePreparingDoc } from "@/lib/client/share";
import { PrescriptionSheet, type PrescriptionSheetData } from "@/components/prescription/PrescriptionSheet";
import { sheetToPdf, imageUrlToDataUrl } from "@/lib/client/prescriptionRaster";
import { cn } from "@/lib/cn";
import { isCertificatePurpose, isQuickServicePurpose, visitPurposeLabel } from "@/lib/constants";

/** A labelled clinical field — small uppercase label over the value; renders
 *  nothing when empty so a sparse (e.g. certificate-only) visit stays clean. */
function Field({ label, value }: { label: string; value?: string }) {
  if (!(value ?? "").trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink">{value}</p>
    </div>
  );
}

interface VisitMedicine {
  type?: string; name?: string; generic?: string; dose?: string; frequency?: string; timing?: string;
  clinicalText?: string; patientText?: string; dosage?: string;
}
interface Visit {
  _id: string;
  confirmedAt?: string;
  type: string;
  visitMode?: string;
  ho?: string;
  fh?: string;
  co?: string;
  notes?: string;
  provisionalDiagnosis?: string;
  diagnosis?: string;
  followUp?: string;
  adviceGeneral?: string;
  adviceLabTest?: string;
  procedure?: {
    nebuliserAgent?: string;
    injectionDetails?: string;
    woundSpec?: string;
    mechanismOfInjury?: string;
    dressingNotes?: string;
  };
  oe?: {
    bp?: string; weight?: string; height?: string; pulse?: string; temp?: string;
    rr?: string; pa?: string; cvs?: string; cns?: string; bsl?: string;
  };
  medicines: VisitMedicine[];
  fees?: number;
}
interface Patient {
  code?: string;
  name: string;
  ageYears?: number;
  gender?: string;
  mobile: string;
  allergicTo?: string;
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
  footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
  signatureUrl?: string;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isWithin3Days(confirmedAt?: string): boolean {
  if (!confirmedAt) return false;
  return Date.now() - new Date(confirmedAt).getTime() <= THREE_DAYS_MS;
}

/**
 * Patient Records view (spec §9.1) — the doctor's read view of a patient's
 * visit history (up to 1 year). Doctor-only at the API layer (§5.2).
 */
export default function RecordsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [tpl, setTpl] = useState<TplInfo | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [sendBusyId, setSendBusyId] = useState<string | null>(null);
  // Certificate issued per visit (certificate-only fast-path), keyed by visitId,
  // so a certificate-only record shows "Show certificate" instead of "Send Rx".
  const [certByVisit, setCertByVisit] = useState<Map<string, { id: string; hasPdf: boolean }>>(new Map());
  const [openingCertVisit, setOpeningCertVisit] = useState<string | null>(null);
  // Set to the sheet + share payload of the visit being sent; the effect below
  // rasterises the hidden sheet once React has rendered it.
  const [pendingShare, setPendingShare] = useState<{
    visitId: string; data: PrescriptionSheetData; sender: { name: string; clinicName: string };
    recipientDigits: string; filename: string;
  } | null>(null);
  // Outcome of the last share, keyed to the visit — drives the hint under its card.
  const [shareResult, setShareResult] = useState<{ id: string; kind: "link" | "nolink" | "cancelled" } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // WhatsApp popup opened synchronously on the Send click (survives the async upload).
  const shareWinRef = useRef<Window | null>(null);

  useEffect(() => {
    apiGet<{ patient: Patient; visits: Visit[] }>(`/api/patients/${patientId}/history`)
      .then((d) => {
        setPatient(d.patient);
        setVisits(d.visits);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    apiGet<{ template: TplInfo; clinic: ClinicInfo }>("/api/template")
      .then(async (d) => {
        setTpl(d.template);
        setClinic(d.clinic);
        if (d.template.signatureUrl) setSignatureDataUrl(await imageUrlToDataUrl(d.template.signatureUrl));
      })
      .catch(() => {});
    apiGet<{ certificates: { id: string; visitId: string | null; hasPdf: boolean }[] }>(
      `/api/certificates?patientId=${patientId}`,
    )
      .then((d) => {
        const m = new Map<string, { id: string; hasPdf: boolean }>();
        for (const c of d.certificates) if (c.visitId) m.set(c.visitId, { id: c.id, hasPdf: c.hasPdf });
        setCertByVisit(m);
      })
      .catch(() => {});
  }, [patientId]);

  /** Open the certificate PDF issued for a certificate-only visit. Opens the tab
   *  synchronously (inside the click) so the async signed-URL fetch isn't
   *  popup-blocked; falls back to the certificate generator when no PDF exists. */
  async function openCertificate(cert: { id: string; hasPdf: boolean }, visitId: string) {
    if (!cert.hasPdf) {
      router.push(`/app/records/${patientId}/certificate`);
      return;
    }
    const win = window.open("", "_blank");
    setOpeningCertVisit(visitId);
    try {
      const { url } = await apiGet<{ url: string }>(`/api/certificates/${cert.id}/pdf`);
      if (win && !win.closed) win.location.href = url;
      else window.open(url, "_blank");
    } catch {
      if (win && !win.closed) win.close();
    } finally {
      setOpeningCertVisit(null);
    }
  }

  useEffect(() => {
    if (!pendingShare) return;
    let cancelled = false;
    // Two frames: let the hidden sheet mount + decode the signature before raster.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        try {
          if (cancelled) return;
          if (!sheetRef.current) throw new Error("Sheet not ready.");
          const pdf = await sheetToPdf(sheetRef.current);
          const { linkIncluded, opened } = await sharePrescriptionPdf({
            pdf,
            visitId: pendingShare.visitId,
            sender: pendingShare.sender,
            recipientDigits: pendingShare.recipientDigits,
            filename: pendingShare.filename,
            win: shareWinRef.current,
          });
          if (!cancelled)
            setShareResult({
              id: pendingShare.visitId,
              kind: !opened ? "cancelled" : linkIncluded ? "link" : "nolink",
            });
        } catch {
          if (shareWinRef.current && !shareWinRef.current.closed) shareWinRef.current.close();
          if (!cancelled) setShareResult({ id: pendingShare.visitId, kind: "nolink" });
        } finally {
          shareWinRef.current = null;
          if (!cancelled) {
            setSendBusyId(null);
            setPendingShare(null);
          }
        }
      }),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [pendingShare]);

  async function handleSendPrescription(v: Visit) {
    // Reserve the WhatsApp popup now, inside the click gesture, so it survives
    // the async raster + upload that happens in the effect below, and paint a
    // branded "preparing…" screen so it isn't a bare blank tab meanwhile.
    shareWinRef.current = window.open("", "_blank");
    writePreparingDoc(shareWinRef.current);
    const c = clinic ?? { clinicName: "", clinicAddress: "", clinicTimings: "", doctorName: "", degree: "", registrationNumber: "" };
    const sender = { name: c.doctorName, clinicName: c.clinicName };

    const waTarget = c.defaultWhatsappTarget ?? "patient";
    const recipientRaw =
      waTarget === "clinic"       ? c.clinicWhatsapp :
      waTarget === "receptionist" ? c.receptionistWhatsapp :
      waTarget === "store"        ? c.storeWhatsapp :
      /* patient */                 patient?.mobile ?? "";
    const recipientDigits = normalizeWhatsappNumber(recipientRaw);
    const safeName = (patient?.name ?? "patient").trim().replace(/[^\w]+/g, "-").toLowerCase() || "patient";

    const data: PrescriptionSheetData = {
      templateId: tpl?.presetKey ?? "teal-classic",
      doctor: {
        name: c.doctorName,
        degree: c.degree,
        registrationNumber: c.registrationNumber,
        clinicName: c.clinicName,
        clinicAddress: c.clinicAddress,
        clinicMobile: c.clinicMobile,
        clinicTimings: c.clinicTimings,
        designation: tpl?.designation,
      },
      patient: { name: patient?.name ?? "Patient", ageYears: patient?.ageYears, gender: patient?.gender },
      date: v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
      oe: v.oe,
      medicines: v.medicines
        .filter((m) => (m.name ?? "").trim())
        .map((m) => ({ type: m.type, name: m.name!, generic: m.generic, dose: m.dose, frequency: m.frequency, timing: m.timing })),
      signatureDataUrl,
      sponsor: tpl?.footer ?? null,
    };

    setSendBusyId(v._id);
    setShareResult(null);
    setPendingShare({ visitId: v._id, data, sender, recipientDigits, filename: `prescription-${safeName}.pdf` });
  }

  if (loading) return <RecordsSkeleton onBack={() => router.back()} />;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="text-sm text-ink-muted hover:underline">
        ← Back
      </button>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>}

      {patient && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand/12 via-brand/[0.05] to-action/10 p-4 shadow-card ring-1 ring-line/60 dark:shadow-card-dark dark:ring-line/70">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-ink">{patient.name}</h1>
            {patient.code && (
              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                ID {patient.code}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {[patient.gender, patient.ageYears ? `${patient.ageYears}y` : null, patient.mobile]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {patient.allergicTo && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sos/10 px-2.5 py-0.5 text-xs font-medium text-sos">
              ⚠ Allergic to: {patient.allergicTo}
            </p>
          )}
        </div>
      )}

      {visits.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No past visits on record"
          description="Once this patient has a confirmed consultation, it will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {visits.map((v) => {
            const editable = isWithin3Days(v.confirmedAt);
            const isSendingThis = sendBusyId === v._id;
            const isCertOnly = isCertificatePurpose(v.visitMode);
            const cert = certByVisit.get(v._id);
            const isOpeningCert = openingCertVisit === v._id;
            // Match the queue's visit-type pills (QueueList): teal tint for
            // follow-up, amber tint for new.
            const typeStyle =
              v.type === "follow-up" ? "bg-brand/10 text-brand" : "bg-action/15 text-action";
            const oe = v.oe ?? {};
            const oeItems = ([
              ["BP", oe.bp], ["Pulse", oe.pulse], ["Temp", oe.temp], ["RR", oe.rr],
              ["Wt", oe.weight], ["Ht", oe.height], ["P/A", oe.pa], ["CVS", oe.cvs],
              ["CNS", oe.cns], ["BSL", oe.bsl],
            ] as [string, string | undefined][]).filter(
              (pair): pair is [string, string] => !!(pair[1] ?? "").trim(),
            );
            const procItems = v.procedure
              ? ([
                  ["Nebulising agent", v.procedure.nebuliserAgent],
                  ["Injection details", v.procedure.injectionDetails],
                  ["Wound specifications", v.procedure.woundSpec],
                  ["Mechanism of injury", v.procedure.mechanismOfInjury],
                  ["Dressing notes", v.procedure.dressingNotes],
                ] as [string, string | undefined][]).filter(
                  (pair): pair is [string, string] => !!(pair[1] ?? "").trim(),
                )
              : [];
            const hasBody =
              !!(v.co || v.ho || v.fh || v.notes || v.diagnosis || v.provisionalDiagnosis ||
                v.followUp || v.adviceGeneral || v.adviceLabTest) ||
              oeItems.length > 0 ||
              procItems.length > 0 ||
              v.medicines.length > 0 ||
              v.fees != null ||
              shareResult?.id === v._id;
            return (
              <li
                key={v._id}
                className="overflow-hidden rounded-2xl bg-surface-raised shadow-card ring-1 ring-line/60 dark:shadow-card-dark dark:ring-line/70"
              >
                {/* Header — faint tint separates the date/type from the white body */}
                <div className={cn("flex items-center justify-between gap-2 bg-brand/5 px-4 py-2.5", hasBody && "border-b border-line")}>
                  {/* Left: date + new/follow-up */}
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString("en-IN") : "—"}
                    </span>
                    {v.confirmedAt && (
                      <span className="shrink-0 text-xs text-ink-muted">
                        {new Date(v.confirmedAt).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", typeStyle)}>
                      {v.type === "follow-up" ? "Follow-up" : "New"}
                    </span>
                    {isQuickServicePurpose(v.visitMode) && (
                      <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        {isCertificatePurpose(v.visitMode) ? "📄 " : ""}{visitPurposeLabel(v.visitMode)}
                      </span>
                    )}
                  </div>
                  {/* Right: edit-or-locked + Send Rx / View certificate */}
                  <div className="flex shrink-0 items-center gap-2">
                    {editable ? (
                      <button
                        onClick={() => router.push(`/app/records/${patientId}/edit/${v._id}`)}
                        className="rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink hover:bg-line/30"
                      >
                        Edit
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">🔒 Locked</span>
                    )}
                    {isCertOnly ? (
                      <button
                        onClick={() => (cert ? openCertificate(cert, v._id) : router.push(`/app/records/${patientId}/certificate`))}
                        disabled={isOpeningCert}
                        className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg shadow-sm hover:bg-brand/90 disabled:opacity-50"
                      >
                        {isOpeningCert ? "Opening…" : "View certificate"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendPrescription(v)}
                        disabled={isSendingThis}
                        className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg shadow-sm hover:bg-brand/90 disabled:opacity-50"
                      >
                        {isSendingThis ? "Sending…" : "Send Rx"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Body — omitted entirely when the visit carries no clinical detail
                    (e.g. a certificate-only visit) so no empty box shows. */}
                {hasBody && (
                  <div className="space-y-3 px-4 py-3">
                    <Field label="Complaints" value={v.co} />
                    <Field label="History of present illness" value={v.ho} />
                    <Field label="Family history" value={v.fh} />
                    {oeItems.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">On examination</p>
                        <div className="flex flex-wrap gap-1.5">
                          {oeItems.map(([label, val]) => (
                            <span key={label} className="rounded-md bg-surface px-2 py-1 text-xs text-ink ring-1 ring-line/60">
                              <span className="text-ink-muted">{label}</span> {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {procItems.length > 0 && (
                      <div className="space-y-2">
                        {procItems.map(([label, val]) => (
                          <Field key={label} label={label} value={val} />
                        ))}
                      </div>
                    )}
                    <Field
                      label={v.diagnosis ? "Diagnosis" : "Provisional diagnosis"}
                      value={v.diagnosis || v.provisionalDiagnosis}
                    />
                    {v.medicines.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Medicines</p>
                        <ul className="space-y-1.5">
                          {v.medicines.map((m, i) => {
                            const nameLine =
                              (m.name ?? "").trim()
                                ? `${(m.type ?? "").trim() ? `${m.type} ` : ""}${m.name}`
                                : m.clinicalText || m.patientText || "Medicine";
                            const details = [m.generic, m.dose, m.frequency, m.timing]
                              .map((s) => (s ?? "").trim())
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <li
                                key={i}
                                className="rounded-lg border-l-2 border-brand/40 bg-surface px-3 py-2"
                              >
                                <span className="block text-sm font-medium text-ink">{nameLine}</span>
                                {details && <span className="mt-0.5 block text-xs text-ink-muted">{details}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <Field label="Advice" value={v.adviceGeneral} />
                    <Field label="Lab tests" value={v.adviceLabTest} />
                    <Field label="Follow-up" value={v.followUp} />
                    <Field label="Notes" value={v.notes} />
                    {v.fees != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                        Fees ₹{v.fees}
                      </span>
                    )}
                    {shareResult?.id === v._id && (
                      shareResult.kind === "link" ? (
                        <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand" role="status">
                          📄 Prescription link added to the WhatsApp message — the patient taps it to view or download the PDF.
                        </p>
                      ) : shareResult.kind === "cancelled" ? (
                        <p className="rounded-xl bg-line/40 px-3 py-2 text-sm text-ink-muted" role="status">
                          The WhatsApp tab was closed before the prescription was ready. Tap Send Rx again and keep the tab open.
                        </p>
                      ) : (
                        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="status">
                          ⚠️ Couldn&apos;t prepare the prescription link. Please tap Send Rx again.
                        </p>
                      )
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Off-screen A4 sheet — rasterised to the prescription PDF for the WhatsApp share. */}
      {pendingShare && (
        <div aria-hidden style={{ position: "fixed", left: 0, top: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          <PrescriptionSheet ref={sheetRef} data={pendingShare.data} />
        </div>
      )}
    </div>
  );
}

function RecordsSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-ink-muted hover:underline">← Back</button>
      <div className="flex items-center gap-4 rounded-2xl bg-surface-raised p-4 shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="overflow-hidden rounded-2xl bg-surface-raised shadow-card dark:shadow-card-dark dark:ring-1 dark:ring-line/70">
            <div className="flex items-center justify-between border-b border-line bg-brand/[0.04] px-4 py-2.5">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-14 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-2/3 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
