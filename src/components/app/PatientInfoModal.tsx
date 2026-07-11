"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface PatientInfoValues {
  name: string;
  gender: string;
  ageYears: string;
  mobile: string;
  emergencyContact: string;
  address: string;
}

/**
 * Edit a patient's demographics in a modal — the same "Patient Info" affordance
 * the consult page uses, so every visit screen (consult, procedures) edits
 * patient details the same way. Saves via PATCH /api/patients/:id and reports
 * the saved values back so the caller's header stays in sync.
 */
export function PatientInfoModal({
  open,
  onClose,
  patientId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  initial: PatientInfoValues;
  onSaved: (values: PatientInfoValues) => void;
}) {
  const [local, setLocal] = useState<PatientInfoValues>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setLocal(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.name || undefined,
          gender: (local.gender as "male" | "female" | "other") || undefined,
          ageYears: local.ageYears ? Number(local.ageYears) : undefined,
          mobile: local.mobile || undefined,
          emergencyContact: local.emergencyContact || undefined,
          address: local.address || undefined,
        }),
      });
      onSaved(local);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-surface p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Patient Information</p>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FL htmlFor="pi-name">Full Name</FL>
              <Input id="pi-name" value={local.name} onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <FL htmlFor="pi-gender">Gender</FL>
              <select
                id="pi-gender"
                value={local.gender}
                onChange={(e) => setLocal((p) => ({ ...p, gender: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">– select –</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <FL htmlFor="pi-age">Age (years)</FL>
              <Input id="pi-age" inputMode="numeric" value={local.ageYears} onChange={(e) => setLocal((p) => ({ ...p, ageYears: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div>
              <FL htmlFor="pi-mobile">Mobile</FL>
              <Input id="pi-mobile" inputMode="numeric" value={local.mobile} onChange={(e) => setLocal((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div>
              <FL htmlFor="pi-emergency">Emergency Contact</FL>
              <Input id="pi-emergency" inputMode="numeric" value={local.emergencyContact} onChange={(e) => setLocal((p) => ({ ...p, emergencyContact: e.target.value.replace(/\D/g, "") }))} />
            </div>
            <div>
              <FL htmlFor="pi-address">Address</FL>
              <Input id="pi-address" value={local.address} onChange={(e) => setLocal((p) => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FL({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </label>
  );
}
