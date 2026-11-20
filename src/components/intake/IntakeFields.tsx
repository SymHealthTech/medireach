"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldId, isRepeatValue, type FieldDef, type FieldValue, type IntakeData, type RepeatItem, type SectionDef } from "@/lib/intake/form";

export const inputClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 text-base text-body outline-none placeholder:text-body/40 focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/20 aria-invalid:border-clay disabled:bg-paper disabled:text-body/70";

const INPUT_TYPE: Partial<Record<FieldDef["type"], { type: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }>> = {
  email: { type: "email", inputMode: "email" },
  mobile: { type: "tel", inputMode: "tel" },
  phone: { type: "tel", inputMode: "tel" },
  url: { type: "url", inputMode: "url" },
  year: { type: "text", inputMode: "numeric" },
  number: { type: "text", inputMode: "numeric" },
  pincode: { type: "text", inputMode: "numeric" },
};

/** One labelled input for a field definition. `errKey` is the field-error key (also the DOM id). */
export function IntakeField({
  field: f,
  value,
  onChange,
  errKey,
  error,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  errKey: string;
  error?: string;
}) {
  const id = fieldId(errKey);
  const describedBy = error ? `${id}-error` : f.help ? `${id}-help` : undefined;

  if (f.type === "checkbox") {
    return (
      <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-[10px] border border-line bg-surface px-3", f.wide && "sm:col-span-2")}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[#0E7C7B]" />
        <span className="text-sm font-medium text-body">{f.label}</span>
      </label>
    );
  }

  const v = typeof value === "string" ? value : "";
  const common = {
    id,
    name: errKey,
    value: v,
    placeholder: f.placeholder,
    autoComplete: f.autoComplete ?? "off",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  return (
    <div className={cn("space-y-1.5", f.wide && "sm:col-span-2")}>
      <label htmlFor={id} className="block text-sm font-medium text-body">
        {f.label}
        {f.required && (
          <span className="text-clay-text" aria-hidden>
            {" "}
            *
          </span>
        )}
        {f.required && <span className="sr-only"> (required to send)</span>}
      </label>
      {f.type === "textarea" || f.type === "lines" ? (
        <textarea {...common} rows={f.type === "lines" ? 4 : f.max && f.max <= 200 ? 2 : 4} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "min-h-11 py-2.5 leading-relaxed")} />
      ) : f.type === "select" ? (
        <select {...common} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "h-11")}>
          <option value="">Choose…</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} {...INPUT_TYPE[f.type]} type={INPUT_TYPE[f.type]?.type ?? "text"} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "h-11")} />
      )}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-clay-text">
          {error}
        </p>
      ) : f.help ? (
        <p id={`${id}-help`} className="text-xs text-body/70">
          {f.help}
        </p>
      ) : null}
      {f.max && f.max <= 200 && (f.type === "textarea" || f.type === "text") && (
        <p className={cn("text-right text-xs", v.length > f.max ? "text-clay-text" : "text-body/50")}>
          {v.length}/{f.max}
        </p>
      )}
    </div>
  );
}

/** A form section card: plain fields in a two-column grid, or a repeating group (a doctor's clinics). */
export function IntakeSection({
  section: s,
  data,
  onChange,
  errors,
}: {
  section: SectionDef;
  data: IntakeData;
  onChange: (next: IntakeData) => void;
  errors: Record<string, string>;
}) {
  const body = s.repeat ? (
    <RepeatGroup section={s} items={isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : []} onChange={(items) => onChange({ ...data, [s.key]: items })} errors={errors} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2">
      {s.fields.map((f) => (
        <IntakeField
          key={f.key}
          field={f}
          errKey={f.key}
          value={data[f.key] as FieldValue | undefined}
          error={errors[f.key]}
          onChange={(v) => onChange({ ...data, [f.key]: v })}
        />
      ))}
    </div>
  );
  return (
    <SectionCard id={`section-${s.key}`} title={s.title} description={s.description}>
      {errors[s.key] && <p className="mb-3 text-sm text-clay-text">{errors[s.key]}</p>}
      {body}
    </SectionCard>
  );
}

export function SectionCard({ id, title, description, children, className }: { id?: string; title: string; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6", className)}>
      <h2 id={id ? `${id}-title` : undefined} className="font-display text-xl font-semibold text-ink">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-body/80">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RepeatGroup({ section: s, items, onChange, errors }: { section: SectionDef; items: RepeatItem[]; onChange: (items: RepeatItem[]) => void; errors: Record<string, string> }) {
  const r = s.repeat!;
  const blank = (): RepeatItem => Object.fromEntries(s.fields.map((f) => [f.key, f.type === "checkbox" ? false : f.key === "city" ? "Pune" : ""]));
  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} role="group" aria-label={`${r.itemLabel} ${i + 1}`} className="rounded-xl border border-line bg-paper/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-semibold text-ink">
              {r.itemLabel} {items.length > 1 ? i + 1 : ""}
            </p>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10"
              >
                <Trash2 className="size-4" aria-hidden /> Remove
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => {
              const key = `${s.key}.${i}.${f.key}`;
              return (
                <IntakeField
                  key={f.key}
                  field={f}
                  errKey={key}
                  value={it[f.key]}
                  error={errors[key]}
                  onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))}
                />
              );
            })}
          </div>
        </div>
      ))}
      {items.length < r.max && (
        <button
          type="button"
          onClick={() => onChange([...items, blank()])}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-dashed border-lagoon/50 px-4 font-semibold text-lagoon hover:bg-lagoon/5"
        >
          <Plus className="size-4" aria-hidden /> {items.length ? r.addLabel : `Add a ${r.itemLabel.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}
