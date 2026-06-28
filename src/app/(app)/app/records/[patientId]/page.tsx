"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";
import { buildPrescriptionText } from "@/lib/prescription";
import { renderPrescriptionImage } from "@/lib/client/prescriptionImage";
import { sharePrescription } from "@/lib/client/share";

interface Visit {
  _id: string;
  confirmedAt?: string;
  type: string;
  co?: string;
  diagnosis?: string;
  provisionalDiagnosis?: string;
  medicines: { clinicalText?: string; patientText?: string; name?: string; dosage?: string; frequency?: string }[];
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
  clinicName: string; clinicAddress: string; clinicTimings: string;
  doctorName: string; degree: string; registrationNumber: string;
  defaultWhatsappTarget?: string;
  clinicWhatsapp?: string; receptionistWhatsapp?: string; storeWhatsapp?: string;
};
type TplInfo = {
  presetKey: string; logoPlacement: "left" | "center" | "right";
  footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
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
  const [sendBusyId, setSendBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ patient: Patient; visits: Visit[] }>(`/api/patients/${patientId}/history`)
      .then((d) => {
        setPatient(d.patient);
        setVisits(d.visits);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    apiGet<{ template: TplInfo; clinic: ClinicInfo }>("/api/template")
      .then((d) => { setTpl(d.template); setClinic(d.clinic); })
      .catch(() => {});
  }, [patientId]);

  async function handleSendPrescription(v: Visit) {
    const c = clinic ?? { clinicName: "", clinicAddress: "", clinicTimings: "", doctorName: "", degree: "", registrationNumber: "" };
    const meds = v.medicines.filter((m) => m.patientText);
    const text = buildPrescriptionText(
      { name: c.doctorName, registrationNumber: c.registrationNumber, clinicName: c.clinicName, clinicAddress: c.clinicAddress },
      patient ?? { name: "Patient" },
      { diagnosis: v.diagnosis, medicines: meds as { patientText: string }[], date: v.confirmedAt ? new Date(v.confirmedAt) : new Date() },
    );

    const waTarget = c.defaultWhatsappTarget ?? "patient";
    const recipientRaw =
      waTarget === "clinic"       ? c.clinicWhatsapp :
      waTarget === "receptionist" ? c.receptionistWhatsapp :
      waTarget === "store"        ? c.storeWhatsapp :
      /* patient */                 patient?.mobile ?? "";
    const recipientDigits = (recipientRaw ?? "").replace(/\D/g, "");
    const waUrl = recipientDigits
      ? `https://wa.me/${recipientDigits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    setSendBusyId(v._id);
    try {
      const image = await renderPrescriptionImage({
        presetKey: tpl?.presetKey ?? "classic",
        logoPlacement: tpl?.logoPlacement ?? "left",
        clinicName: c.clinicName || "Clinic",
        clinicAddress: c.clinicAddress,
        doctorName: c.doctorName,
        registrationNumber: c.registrationNumber,
        degree: c.degree,
        clinicTimings: c.clinicTimings,
        patientName: patient?.name ?? "Patient",
        patientMeta: `${patient?.gender ?? ""}${patient?.ageYears ? ` · ${patient.ageYears}y` : ""}`,
        date: v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
        diagnosis: v.diagnosis || undefined,
        medicines: meds.map((m) => m.patientText!),
        footer: tpl?.footer,
      });
      await sharePrescription(image, text);
    } catch {
      window.open(waUrl, "_blank");
    } finally {
      setSendBusyId(null);
    }
  }

  if (loading) return <RecordsSkeleton onBack={() => router.back()} />;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="text-sm text-ink-muted hover:underline">
        ← Back
      </button>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>}

      {patient && (
        <div>
          <h1 className="text-2xl font-bold text-ink">{patient.name}</h1>
          <p className="text-sm text-ink-muted">
            {patient.gender}
            {patient.ageYears ? ` · ${patient.ageYears}y` : ""} · {patient.mobile}
          </p>
          {patient.allergicTo && (
            <p className="mt-1 text-sm font-medium text-sos">Allergic to: {patient.allergicTo}</p>
          )}
        </div>
      )}

      {visits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          No past visits on record.
        </p>
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
              </Card>
            );
          })}
        </ul>
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
