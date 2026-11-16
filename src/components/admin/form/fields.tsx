"use client";

import { useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

/**
 * Form primitives for the dashboard (DESIGN_BRIEF.md §4): labels above,
 * helper text below, errors in clay, 44px controls.
 */

export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-clay-text"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-clay-text" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

/** Native <select> styled like the inputs (best picker on Android phones). */
export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
    >
      {children}
    </select>
  );
}

/** Label + description on the left, switch on the right. */
export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-card p-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** Free-text chips: type and press Enter (or comma) to add. */
export function ChipInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions = [],
  max = 30,
  disabled,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  function add(raw: string) {
    if (disabled) return;
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-sm text-ink">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              disabled={disabled}
              className="rounded-full p-0.5 hover:bg-ink/10"
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
        />
      </div>
      {remaining.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted-foreground hover:border-ink/40 hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Integer input that reports `undefined` when empty. */
export function NumberInput({
  value,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={value ?? ""}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onChange(digits === "" ? undefined : Number(digits));
      }}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
    />
  );
}
