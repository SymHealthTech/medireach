"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/client/api";
import { sharePrescriptionPdf, normalizeWhatsappNumber } from "@/lib/client/share";
import { PrescriptionSheet, type PrescriptionSheetData } from "@/components/prescription/PrescriptionSheet";
import { sheetToPdf, imageUrlToDataUrl } from "@/lib/client/prescriptionRaster";

interface VisitMedicine {
  type?: string; name?: string; generic?: string; dose?: string; frequency?: string; timing?: string;
  clinicalText?: string; patientText?: string; dosage?: string;
}
interface Visit {
  _id: string;
  confirmedAt?: string;
  type: string;
  co?: string;
  diagnosis?: string;
  provisionalDiagnosis?: string;
  oe?: { bp?: string; temp?: string; weight?: string; bsl?: string };
  medicines: VisitMedicine[];
  fees?: number;
}
interface Patient {
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
  // Set to the sheet + share payload of the visit being sent; the effect below
  // rasterises the hidden sheet once React has rendered it.
  const [pendingShare, setPendingShare] = useState<{
    visitId: string; data: PrescriptionSheetData; sender: { name: string; clinicName: string };
    recipientDigits: string; filename: string;
  } | null>(null);
  // Outcome of the last share, keyed to the visit — drives the hint under its card.
  const [shareResult, setShareResult] = useState<{ id: string; kind: "link" | "nolink" } | null>(null);
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
  }, [patientId]);

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
          const { linkIncluded } = await sharePrescriptionPdf({
            pdf,
            visitId: pendingShare.visitId,
            sender: pendingShare.sender,
            recipientDigits: pendingShare.recipientDigits,
            filename: pendingShare.filename,
            win: shareWinRef.current,
          });
          if (!cancelled) setShareResult({ id: pendingShare.visitId, kind: linkIncluded ? "link" : "nolink" });
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
    // the async raster + upload that happens in the effect below.
    shareWinRef.current = window.open("", "_blank");
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="border-l-4 border-brand pl-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{patient.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {patient.gender}
              {patient.ageYears ? ` · ${patient.ageYears}y` : ""} · {patient.mobile}
            </p>
            {patient.allergicTo && (
              <p className="mt-1 text-sm font-medium text-sos">Allergic to: {patient.allergicTo}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/app/records/${patientId}/certificate`)}
            className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-line/30"
          >
            📄 Medical Certificate
          </button>
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
            return (
              <Card key={v._id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    {v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString("en-IN") : "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{v.type}</span>
                    {editable && (
                      <button
                        onClick={() => router.push(`/app/records/${patientId}/edit/${v._id}`)}
                        className="rounded-lg border border-line px-2.5 py-0.5 text-xs font-medium text-ink hover:bg-line/30"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleSendPrescription(v)}
                      disabled={isSendingThis}
                      className="rounded-lg bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand hover:bg-brand/20 disabled:opacity-50"
                    >
                      {isSendingThis ? "Sending…" : "Send Rx"}
                    </button>
                  </div>
                </div>
                {v.co && <p className="text-sm text-ink"><span className="text-ink-muted">C/O:</span> {v.co}</p>}
                {(v.diagnosis || v.provisionalDiagnosis) && (
                  <p className="text-sm text-ink">
                    <span className="text-ink-muted">Diagnosis:</span> {v.diagnosis || v.provisionalDiagnosis}
                  </p>
                )}
                {v.medicines.length > 0 && (
                  <ul className="list-inside list-disc text-sm text-ink-muted">
                    {v.medicines.map((m, i) => (
                      <li key={i}>{m.clinicalText || m.patientText || m.name || ""}</li>
                    ))}
                  </ul>
                )}
                {v.fees != null && <p className="text-sm text-ink-muted">Fees: ₹{v.fees}</p>}
                {shareResult?.id === v._id && (
                  shareResult.kind === "link" ? (
                    <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand" role="status">
                      📄 Prescription link added to the WhatsApp message — the patient taps it to view or download the PDF.
                    </p>
                  ) : (
                    <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="status">
                      ⚠️ Couldn&apos;t prepare the prescription link. Please tap Send Rx again.
                    </p>
                  )
                )}
              </Card>
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
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </ul>
    </div>
  );
}
