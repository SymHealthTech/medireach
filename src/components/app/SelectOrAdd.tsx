"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

/**
 * Medicine option categories that support doctor-defined custom values,
 * persisted per doctor via /api/medicine-options and merged into the built-in
 * presets. Shared by the consult MedicineEditor and the Edit-Keyword medicine
 * form so both offer the same "＋ Add new…" behaviour.
 */
export interface CustomOptions {
  types: string[];
  doses: string[];
  frequencies: string[];
  timings: string[];
}

export function saveCustomOption(category: keyof CustomOptions, value: string) {
  fetch("/api/medicine-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, value }),
  }).catch(() => {});
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
  "h-10 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink " +
  "focus:outline-none focus:ring-2 focus:ring-brand";

export function SelectOrAdd({
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
