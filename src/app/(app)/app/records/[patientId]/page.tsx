"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";

interface Visit {
  _id: string;
  confirmedAt?: string;
  type: string;
  co?: string;
  diagnosis?: string;
  provisionalDiagnosis?: string;
  medicines: { clinicalText: string }[];
  fees?: number;
}
interface Patient {
  name: string;
  ageYears?: number;
  gender?: string;
  mobile: string;
  allergicTo?: string;
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

  useEffect(() => {
    apiGet<{ patient: Patient; visits: Visit[] }>(`/api/patients/${patientId}/history`)
      .then((d) => {
        setPatient(d.patient);
        setVisits(d.visits);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [patientId]);

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
          {visits.map((v) => (
            <Card key={v._id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  {v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString("en-IN") : "—"}
                </span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{v.type}</span>
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
                    <li key={i}>{m.clinicalText}</li>
                  ))}
                </ul>
              )}
              {v.fees != null && <p className="text-sm text-ink-muted">Fees: ₹{v.fees}</p>}
            </Card>
          ))}
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
              <Skeleton className="h-5 w-16 rounded-full" />
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
