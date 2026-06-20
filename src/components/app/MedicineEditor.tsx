"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { MedicineSource } from "@/lib/constants";

export interface MedicineRow {
  name: string;
  dosage: string;
  frequency: string;
  source: MedicineSource;
  clinicalText: string;
  patientText: string;
}

export function emptyMedicine(): MedicineRow {
  return { name: "", dosage: "", frequency: "", source: "pharmacy", clinicalText: "", patientText: "" };
}

/**
 * Editable medicines list (spec §7.3). Each row keeps both representations: the
 * doctor's clinical line (shorthand retained) and the patient-facing plain text
 * — both editable, since the doctor reviews everything before confirming (§7.4).
 * Source toggles between Self (clinic stock) and Pharmacy (external).
 */
export function MedicineEditor({
  medicines,
  onChange,
}: {
  medicines: MedicineRow[];
  onChange: (next: MedicineRow[]) => void;
}) {
  function update(i: number, patch: Partial<MedicineRow>) {
    onChange(medicines.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function remove(i: number) {
    onChange(medicines.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {medicines.map((m, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Medicine name"
              value={m.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1"
            />
            <div className="flex overflow-hidden rounded-xl border border-line">
              {(["self", "pharmacy"] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => update(i, { source: src })}
                  className={cn(
                    "px-3 text-sm font-medium",
                    m.source === src ? "bg-brand text-brand-fg" : "bg-surface-raised text-ink-muted",
                  )}
                >
                  {src === "self" ? "Self" : "Pharmacy"}
                </button>
              ))}
            </div>
          </div>
          <Input
            placeholder="Clinical (e.g. Tab. Paracetamol 500mg — 1 TDS)"
            value={m.clinicalText}
            onChange={(e) => update(i, { clinicalText: e.target.value })}
          />
          <Input
            placeholder="Patient instructions (plain language)"
            value={m.patientText}
            onChange={(e) => update(i, { patientText: e.target.value })}
          />
          <button type="button" className="text-sm text-sos hover:underline" onClick={() => remove(i)}>
            Remove medicine
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...medicines, emptyMedicine()])}>
        + Add medicine
      </Button>
    </div>
  );
}
