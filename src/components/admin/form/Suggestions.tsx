"use client";

import { useState, type ReactNode } from "react";
import { ClipboardList, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/admin/form/fields";
import { DOCTOR_ROLES } from "@/lib/intake/form";
import { cn } from "@/lib/cn";

const SHOWN = 12;

/**
 * One-tap suggestions under a list (services, facilities, insurers…): items
 * already in the list are hidden; "Add all" adds the rest. The same lists as
 * the website forms (lib/suggestions).
 */
export function SuggestionChips({
  items,
  have,
  onAdd,
  disabled,
  label = "Suggestions",
  single,
  tone = "suggest",
}: {
  items: string[];
  /** What the list already has (matched without case). */
  have: string[];
  onAdd: (items: string[]) => void;
  disabled?: boolean;
  label?: string;
  /** Picks one value (no "Add all"). */
  single?: boolean;
  /** "form" = answers from the website form. */
  tone?: "suggest" | "form";
}) {
  const [all, setAll] = useState(false);
  const owned = new Set(have.map((x) => x.trim().toLowerCase()));
  const left = items.filter((x, i) => x.trim() && !owned.has(x.trim().toLowerCase()) && items.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
  if (left.length === 0) return null;
  const shown = all ? left : left.slice(0, SHOWN);
  const Icon = tone === "form" ? ClipboardList : Sparkles;
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-1.5", tone === "form" && "rounded-lg bg-sage/60 p-2")}>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}:
      </span>
      {shown.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onAdd([s])}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-card px-2.5 py-1 text-xs hover:border-ink/40 disabled:opacity-50"
        >
          {!single && <Plus className="size-3" aria-hidden />}
          {s}
        </button>
      ))}
      {left.length > SHOWN && (
        <button type="button" onClick={() => setAll((x) => !x)} className="px-1 text-xs font-medium text-ink underline underline-offset-2">
          {all ? "Show fewer" : `+${left.length - SHOWN} more`}
        </button>
      )}
      {!single && left.length > 1 && (
        <button type="button" disabled={disabled} onClick={() => onAdd(left)} className="rounded-full px-2 py-1 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50">
          Add all {left.length}
        </button>
      )}
    </div>
  );
}

const ROLE_LABELS = DOCTOR_ROLES.filter((r) => r.value !== "other").map((r) => r.label);

/**
 * A list of choices plus "Other…" with their own words (stored as the text
 * itself, so older free-text answers still show, as "Other").
 */
export function SelectOther({
  id,
  value,
  onChange,
  options,
  disabled,
  emptyLabel = "Not specified",
  otherPlaceholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  disabled?: boolean;
  emptyLabel?: string;
  otherPlaceholder?: string;
}) {
  const known = options.find((l) => l.toLowerCase() === value.trim().toLowerCase());
  const [other, setOther] = useState(Boolean(value.trim()) && !known);
  const showOther = other || (Boolean(value.trim()) && !known);
  return (
    <div className="space-y-2">
      <NativeSelect
        id={id}
        value={showOther ? "__other" : (known ?? "")}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOther(true);
            if (known) onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
        <option value="__other">Other…</option>
      </NativeSelect>
      {showOther && (
        <Input id={`${id}.other`} aria-label="Please specify" value={value} maxLength={80} disabled={disabled} placeholder={otherPlaceholder ?? "Please specify"} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/**
 * A doctor's role at a clinic or hospital: the same list as the website form,
 * plus "Other" with their own words. Stored as the label text.
 */
export function RoleSelect({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return <SelectOther id={id} value={value} onChange={onChange} options={ROLE_LABELS} disabled={disabled} otherPlaceholder="Please specify, e.g. Anaesthetist, Dietitian" />;
}

/** "Website form REF: …" note with an optional action, as in the doctor editor. */
export function FormNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-sage/60 px-3 py-2 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-start gap-2">
        <ClipboardList className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0">{children}</span>
      </p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
