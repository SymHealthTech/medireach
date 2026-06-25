"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { MedicineSource } from "@/lib/constants";
import {
  MEDICINE_TYPES,
  MEDICINE_DOSES,
  MEDICINE_FREQUENCIES,
  MEDICINE_TIMINGS,
} from "@/lib/constants";
import { INDIA_BRANDS, type BrandEntry } from "@/lib/medicines-data";

export interface MedicineRow {
  type: string;
  name: string;
  generic: string;
  dose: string;
  frequency: string;
  timing: string;
  source: MedicineSource;
  clinicalText: string;
  patientText: string;
  dosage: string;
}

export function emptyMedicine(): MedicineRow {
  return {
    type: "Tab", name: "", generic: "", dose: "", frequency: "",
    timing: "", source: "pharmacy", clinicalText: "", patientText: "", dosage: "",
  };
}

// ── Text builders ──────────────────────────────────────────────────────────

const FREQ_LABEL: Record<string, string> = {
  OD: "once a day", BD: "twice a day", TDS: "3 times a day", QID: "4 times a day",
  HS: "at bedtime", SOS: "when required", Stat: "immediately",
  Weekly: "once a week", Fortnightly: "once in 2 weeks",
};

const TYPE_LABEL: Record<string, string> = {
  Tab: "tablet", Cap: "capsule", Syr: "syrup", Susp: "suspension",
  Inj: "injection", Drops: "drop", Gel: "application of gel",
  Cream: "application of cream", Oint: "application of ointment",
  Inhaler: "puff", Patch: "patch", Sachet: "sachet",
  Spray: "spray", Powder: "sachet of powder", Loz: "lozenge", Supp: "suppository",
};

function buildTexts(
  m: Pick<MedicineRow, "type" | "name" | "generic" | "dose" | "frequency" | "timing">
): Pick<MedicineRow, "clinicalText" | "patientText"> {
  const medLabel = `${m.type}. ${m.name}${m.generic ? ` (${m.generic})` : ""}`;
  const instrParts = [m.dose, m.frequency, m.timing].filter(Boolean).join(" ");
  const clinicalText = `${medLabel}${instrParts ? ` — ${instrParts}` : ""}`;

  const isVol = /ml|tsf/i.test(m.dose);
  const typeStr = TYPE_LABEL[m.type] ?? m.type.toLowerCase();
  const doseStr = m.dose
    ? isVol ? m.dose : `${m.dose} ${typeStr}`
    : typeStr;
  const freqStr = FREQ_LABEL[m.frequency] ?? m.frequency.toLowerCase();
  const timingStr = m.timing ? `, ${m.timing.toLowerCase()}` : "";
  const patientText = m.name
    ? `${m.name}: Take ${doseStr}${freqStr ? `, ${freqStr}` : ""}${timingStr}.`
    : "";

  return { clinicalText, patientText };
}

// ── Draft state ────────────────────────────────────────────────────────────

interface Draft {
  type: string;
  name: string;
  generic: string;
  dose: string;
  frequency: string;
  timing: string;
  source: MedicineSource;
}

function emptyDraft(): Draft {
  return { type: "Tab", name: "", generic: "", dose: "", frequency: "", timing: "", source: "pharmacy" };
}

// ── Custom options state ────────────────────────────────────────────────────

interface CustomOptions {
  types: string[];
  doses: string[];
  frequencies: string[];
  timings: string[];
}

async function saveCustomOption(category: keyof CustomOptions, value: string) {
  fetch("/api/medicine-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, value }),
  }).catch(() => {});
}

// ── Main component ──────────────────────────────────────────────────────────

export function MedicineEditor({
  medicines,
  onChange,
}: {
  medicines: MedicineRow[];
  onChange: (next: MedicineRow[]) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [suggestions, setSuggestions] = useState<BrandEntry[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [custom, setCustom] = useState<CustomOptions>({ types: [], doses: [], frequencies: [], timings: [] });
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/medicine-options")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCustom(d as CustomOptions); })
      .catch(() => {});

    function close(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function addCustom(category: keyof CustomOptions, value: string) {
    setCustom((prev) => ({
      ...prev,
      [category]: prev[category].includes(value) ? prev[category] : [...prev[category], value],
    }));
    saveCustomOption(category, value);
  }

  async function searchBrands(q: string) {
    if (!q.trim()) { setSuggestions([]); setShowSug(false); return; }
    const lower = q.toLowerCase();

    let personal: BrandEntry[] = [];
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json() as { medicines: { name: string; generic?: string }[] };
        personal = data.medicines.map((m) => ({ name: m.name, generic: m.generic ?? "" }));
      }
    } catch { /* ignore */ }

    const personalNames = new Set(personal.map((m) => m.name.toLowerCase()));
    const staticMatches = INDIA_BRANDS.filter(
      (b) => b.name.toLowerCase().startsWith(lower) && !personalNames.has(b.name.toLowerCase())
    );

    const combined = [...personal, ...staticMatches].slice(0, 12);
    setSuggestions(combined);
    setShowSug(combined.length > 0);
  }

  function selectBrand(brand: BrandEntry) {
    setDraft((d) => ({ ...d, name: brand.name, generic: brand.generic }));
    setSuggestions([]);
    setShowSug(false);
  }

  function clearBrand() {
    setDraft((d) => ({ ...d, name: "", generic: "" }));
    setSuggestions([]);
    setShowSug(false);
  }

  function handleAdd() {
    if (!draft.name.trim()) return;
    const texts = buildTexts(draft);
    const row: MedicineRow = { ...draft, dosage: draft.dose, ...texts };
    onChange([...medicines, row]);
    fetch("/api/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.name, generic: draft.generic }),
    }).catch(() => {});
    setDraft(emptyDraft());
    setSuggestions([]);
    setShowSug(false);
  }

  function remove(i: number) {
    onChange(medicines.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {/* ── Added medicines list ─────────────────────────────────────────── */}
      {medicines.map((m, i) => {
        const display = m.clinicalText || [
          m.type ? `${m.type}.` : null,
          m.name,
          m.generic ? `(${m.generic})` : null,
          (m.dose || m.dosage || m.frequency) ? "—" : null,
          m.dose || m.dosage,
          m.frequency,
          m.timing,
        ].filter(Boolean).join(" ");
        return (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2"
          >
            <span className="flex-1 text-sm text-ink">{display}</span>
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              m.source === "clinic"
                ? "bg-brand/10 text-brand"
                : "border border-line bg-surface text-ink-muted",
            )}>
              {m.source === "clinic" ? "Clinic" : "Pharmacy"}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 text-base leading-none text-ink-muted hover:text-sos"
              aria-label="Remove medicine"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* ── Add medicine form ────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-line bg-surface p-4">

        {/* Row 1 — Type · Brand · Generic */}
        <div className="flex flex-wrap gap-2">
          <SelectOrAdd
            value={draft.type}
            options={[...(MEDICINE_TYPES as unknown as string[]), ...custom.types]}
            onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
            onCustomAdded={(v) => addCustom("types", v)}
            placeholder="Type"
            className="w-28 shrink-0"
          />

          {/* Brand name with autocomplete */}
          <div ref={brandRef} className="relative min-w-[160px] flex-1">
            <Input
              placeholder="Brand name"
              value={draft.name}
              autoComplete="off"
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, name: v }));
                searchBrands(v);
              }}
              onFocus={() => { if (draft.name) searchBrands(draft.name); }}
              className={draft.name ? "pr-9" : ""}
            />
            {draft.name && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); clearBrand(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-lg leading-none text-ink-muted hover:text-sos"
                aria-label="Clear brand name"
              >
                ×
              </button>
            )}
            {showSug && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
                {suggestions.map((s) => (
                  <li
                    key={s.name}
                    onMouseDown={(e) => { e.preventDefault(); selectBrand(s); }}
                    className="cursor-pointer px-3 py-2 hover:bg-surface-raised"
                  >
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    {s.generic && (
                      <p className="text-[11px] text-ink-muted">{s.generic}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Generic / Contains */}
          <Input
            placeholder="Generic / Contains"
            value={draft.generic}
            onChange={(e) => setDraft((d) => ({ ...d, generic: e.target.value }))}
            className="min-w-[140px] flex-1"
          />
        </div>

        {/* Row 2 — Dose · Frequency · Timing · Source */}
        <div className="flex flex-wrap items-center gap-2">
          <SelectOrAdd
            value={draft.dose}
            options={[...(MEDICINE_DOSES as unknown as string[]), ...custom.doses]}
            onChange={(v) => setDraft((d) => ({ ...d, dose: v }))}
            onCustomAdded={(v) => addCustom("doses", v)}
            placeholder="Dose"
            className="w-28 shrink-0"
          />
          <SelectOrAdd
            value={draft.frequency}
            options={[...(MEDICINE_FREQUENCIES as unknown as string[]), ...custom.frequencies]}
            onChange={(v) => setDraft((d) => ({ ...d, frequency: v }))}
            onCustomAdded={(v) => addCustom("frequencies", v)}
            placeholder="Frequency"
            className="w-32 shrink-0"
          />
          <SelectOrAdd
            value={draft.timing}
            options={[...(MEDICINE_TIMINGS as unknown as string[]), ...custom.timings]}
            onChange={(v) => setDraft((d) => ({ ...d, timing: v }))}
            onCustomAdded={(v) => addCustom("timings", v)}
            placeholder="Timing"
            className="min-w-[160px] flex-1"
          />

          {/* Clinic / Pharmacy toggle */}
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-line">
            {(["clinic", "pharmacy"] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, source: src }))}
                className={cn(
                  "px-3 py-2 text-sm font-medium",
                  draft.source === src
                    ? "bg-brand text-brand-fg"
                    : "bg-surface-raised text-ink-muted",
                )}
              >
                {src === "clinic" ? "Clinic" : "Pharmacy"}
              </button>
            ))}
          </div>
        </div>

        {/* Add button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleAdd}
          disabled={!draft.name.trim()}
        >
          + Add Medicine
        </Button>
      </div>
    </div>
  );
}

// ── AddCustomModal ──────────────────────────────────────────────────────────

function AddCustomModal({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function commit() {
    const v = val.trim();
    if (v) onConfirm(v);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="w-72 rounded-2xl border border-line bg-surface p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-semibold text-ink">
          Add custom {label.toLowerCase()}
        </p>
        <Input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder={`Enter ${label.toLowerCase()}…`}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={commit}
            disabled={!val.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── SelectOrAdd ─────────────────────────────────────────────────────────────

const SELECT_CLS =
  "h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink " +
  "focus:outline-none focus:ring-2 focus:ring-brand";

function SelectOrAdd({
  value,
  options,
  onChange,
  onCustomAdded,
  placeholder,
  className,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onCustomAdded?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  // A value is "custom-removable" only if it's not in the built-in presets
  // (it may already be in the merged `options` list if loaded from DB).
  const isCustom = !!value && !options.includes(value);

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <select
          value={value || ""}
          onChange={(e) => {
            if (e.target.value === "__add__") { setShowModal(true); }
            else onChange(e.target.value);
          }}
          className={cn(SELECT_CLS, !value && "text-ink-muted", "flex-1 min-w-0")}
        >
          <option value="" disabled>
            {placeholder ?? "Select…"}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value="__add__">＋ Add new…</option>
        </select>
        {isCustom && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-lg leading-none text-ink-muted hover:text-sos"
            aria-label={`Remove custom ${placeholder?.toLowerCase() ?? "value"}`}
          >
            ×
          </button>
        )}
      </div>
      {showModal && (
        <AddCustomModal
          label={placeholder ?? "value"}
          onConfirm={(v) => {
            onChange(v);
            onCustomAdded?.(v);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
