"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

interface RecentPatient {
  id: string;
  name: string;
  mobile: string;
}

/**
 * Recent patients (spec §5.2 / §9.1). Receptionist: last-7-days seen list, name
 * + mobile only, no drill-down — the sole edit allowed is a contact correction
 * (name/number) per the narrow §16.1 exception. Doctor: same list as an entry
 * point into the full Patient Records history (§9.1).
 */
export default function RecentPage() {
  const { me } = useMe();
  const router = useRouter();
  const [patients, setPatients] = useState<RecentPatient[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<{ patients: RecentPatient[] }>("/api/recent").catch(() => ({ patients: [] }));
    setPatients(data.patients);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isReceptionist = me?.role === "receptionist";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{isReceptionist ? "Recent patients" : "Patient records"}</h1>
        <p className="text-sm text-ink-muted">
          {isReceptionist
            ? "Seen in the last 7 days. You can correct a contact number only."
            : "Tap a patient to view their visit history."}
        </p>
      </div>

      {patients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          No recent patients.
        </p>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) =>
            editing === p.id && isReceptionist ? (
              <EditRow key={p.id} patient={p} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
            ) : (
              <li key={p.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface-raised p-4">
                <button
                  type="button"
                  disabled={isReceptionist}
                  onClick={() => !isReceptionist && router.push(`/app/records/${p.id}`)}
                  className={isReceptionist ? "text-left" : "text-left hover:text-brand"}
                >
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="text-sm text-ink-muted">{p.mobile}</p>
                </button>
                {isReceptionist && (
                  <button className="text-sm text-brand hover:underline" onClick={() => setEditing(p.id)}>
                    Edit contact
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function EditRow({
  patient,
  onCancel,
  onSaved,
}: {
  patient: RecentPatient;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(patient.name);
  const [mobile, setMobile] = useState(patient.mobile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // Reuse the contact-correction endpoint via PATCH.
      const res = await fetch(`/api/recent/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" inputMode="numeric" />
      {error && <p className="text-sm text-sos">{error}</p>}
      <div className="flex gap-2">
        <Button variant="brand" onClick={save} disabled={busy}>
          {busy ? "…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
