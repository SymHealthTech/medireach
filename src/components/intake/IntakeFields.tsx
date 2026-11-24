"use client";

import { useState } from "react";
import { ClipboardPaste, HelpCircle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { cleanPastedText, emptyItem, fieldId, isRepeatValue, isRequired, isShown, type DoctorEntry, type FieldDef, type FieldValue, type IntakeData, type RepeatItem, type SectionDef } from "@/lib/intake/form";
import { CardStylePicker, ChoiceCards, DesignPicker } from "./DesignPickers";
import { DoctorPickField, DoctorsField } from "./DoctorsField";
import { LocationField } from "./LocationField";
import { RowsField } from "./RowsField";
import { ROWS } from "@/lib/intake/rows";
import { SelectOtherInput, SuggestionChips, SuggestionDatalist, datalistId, suggestMode, useFieldSuggestions } from "./Suggestions";
import { TimingsField } from "./TimingsField";

import { inputClass } from "./input-class";

export { inputClass };

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
  context = {},
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  errKey: string;
  error?: string;
  /** The other answers in the same form or repeat item (search hint for the map). */
  context?: Record<string, unknown>;
}) {
  const id = fieldId(errKey);
  const suggestions = useFieldSuggestions(f, context);
  const mode = suggestMode(f);

  if (f.type === "doctors") {
    const list = Array.isArray(value) ? (value as DoctorEntry[]) : [];
    // Inside a repeat (a hospital department) the list gets its own heading; on its own the section title says it.
    return errKey.includes(".") ? (
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium text-body">{f.label}</p>
        <DoctorsField field={f} value={list} onChange={onChange} errKey={errKey} />
      </div>
    ) : (
      <DoctorsField field={f} value={list} onChange={onChange} errKey={errKey} />
    );
  }

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
    <div className={cn("min-w-0 space-y-1.5", f.wide && "sm:col-span-2")}>
      <label htmlFor={id} className="block text-sm font-medium text-body">
        {f.label}
        {isRequired(f, context) && (
          <span className="text-clay-text" aria-hidden>
            {" "}
            *
          </span>
        )}
        {isRequired(f, context) && <span className="sr-only"> (required to send)</span>}
      </label>
      {f.type === "doctorPick" ? (
        <DoctorPickField id={id} value={v} onChange={onChange} describedBy={describedBy} />
      ) : f.type === "design" ? (
        <DesignPicker id={id} field={f} value={v} onChange={onChange} context={context} />
      ) : f.type === "card" ? (
        <CardStylePicker id={id} field={f} value={v} onChange={onChange} />
      ) : f.type === "choice" ? (
        <ChoiceCards id={id} field={f} value={v} onChange={onChange} />
      ) : f.type === "location" ? (
        <LocationField id={id} value={v} onChange={onChange} hint={[context.name, context.address, context.area, context.city].filter((x) => typeof x === "string" && x.trim()).join(", ")} />
      ) : f.rows ? (
        <RowsField id={id} def={ROWS[f.rows]} value={v} onChange={onChange} label={f.label} suggestions={suggestions} describedBy={describedBy} invalid={Boolean(error)} />
      ) : mode === "selectOther" && suggestions.length > 0 ? (
        <SelectOtherInput id={id} value={v} onChange={onChange} items={suggestions} describedBy={describedBy} invalid={Boolean(error)} />
      ) : f.type === "timings" ? (
        <TimingsField id={id} value={v} onChange={onChange} placeholder={f.placeholder} describedBy={describedBy} invalid={Boolean(error)} />
      ) : f.type === "story" ? (
        <StoryInput common={common} value={v} max={f.max ?? 6000} onChange={onChange} />
      ) : f.type === "textarea" || f.type === "lines" ? (
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
        <input
          {...common}
          {...INPUT_TYPE[f.type]}
          type={INPUT_TYPE[f.type]?.type ?? "text"}
          list={mode === "typeahead" ? datalistId(id) : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "h-11")}
        />
      )}
      {mode === "typeahead" && suggestions.length > 0 && <SuggestionDatalist id={datalistId(id)} items={suggestions} />}
      {mode && !f.rows && mode !== "typeahead" && mode !== "selectOther" && suggestions.length > 0 && <SuggestionChips mode={mode} items={suggestions} value={v} onChange={onChange} label={f.label} />}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-clay-text">
          {error}
        </p>
      ) : f.help ? (
        <p id={`${id}-help`} className="text-xs text-body/70">
          {f.help}
        </p>
      ) : null}
      {f.steps && <Steps steps={f.steps} />}
      {f.max && f.max <= 200 && (f.type === "textarea" || f.type === "text") && (
        <p className={cn("text-right text-xs", v.length > f.max ? "text-clay-text" : "text-body/50")}>
          {v.length}/{f.max}
        </p>
      )}
    </div>
  );
}

/** "How do I get this?" steps, folded by default. */
function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <details className="group rounded-lg border border-line bg-paper/60 px-3 py-2 text-sm">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 font-semibold text-lagoon">
        <HelpCircle className="size-4" aria-hidden /> How do I get this link?
      </summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-body">
        {steps.map((st) => (
          <li key={st}>{st}</li>
        ))}
      </ol>
    </details>
  );
}

/** Large text box for a blog-style story: paste button (handy on phones), cleaned paste, counter. */
function StoryInput({
  common,
  value,
  max,
  onChange,
}: {
  common: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  value: string;
  max: number;
  onChange: (v: string) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const append = (text: string) => {
    const clean = cleanPastedText(text);
    if (!clean) return;
    onChange(value.trim() ? `${value.trimEnd()}\n\n${clean}` : clean);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            setNote(null);
            try {
              const text = await navigator.clipboard.readText();
              if (text.trim()) append(text);
              else setNote("Nothing copied yet. Copy your text first, then tap Paste.");
            } catch {
              setNote("Your browser blocked the paste button. Press and hold in the box below and tap Paste (or press Ctrl+V).");
            }
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-lagoon/40 bg-lagoon/5 px-3 text-sm font-semibold text-lagoon hover:bg-lagoon/10"
        >
          <ClipboardPaste className="size-4" aria-hidden /> Paste copied text
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm text-clay-text hover:bg-clay/10">
            <Trash2 className="size-4" aria-hidden /> Clear
          </button>
        )}
      </div>
      {note && <p className="text-sm text-body/80">{note}</p>}
      <textarea
        {...common}
        rows={14}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          // Keep paragraphs, drop invisible characters from Word / web pages.
          const text = e.clipboardData.getData("text/plain");
          if (!text) return;
          e.preventDefault();
          const el = e.currentTarget;
          const next = el.value.slice(0, el.selectionStart) + cleanPastedText(text) + el.value.slice(el.selectionEnd);
          onChange(next);
        }}
        className={cn(inputClass, "min-h-64 py-3 leading-relaxed")}
      />
      <p className={cn("text-right text-xs", value.length > max ? "text-clay-text" : "text-body/50")}>
        {value.length.toLocaleString("en-IN")}/{max.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

/** A form section card: plain fields in a two-column grid, or a repeating group (a doctor's clinics). */
export function IntakeSection({
  section: s,
  data,
  onChange,
  errors,
  extra,
}: {
  section: SectionDef;
  data: IntakeData;
  onChange: (next: IntakeData) => void;
  errors: Record<string, string>;
  /** Shown after the section's fields (the "Beyond medicine" photo). */
  extra?: React.ReactNode;
}) {
  const body = s.repeat ? (
    <RepeatGroup section={s} items={isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : []} onChange={(items) => onChange({ ...data, [s.key]: items })} errors={errors} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2">
      {s.fields
        .filter((f) => isShown(f, data))
        .map((f) => (
          <IntakeField
            key={f.key}
            field={f}
            errKey={f.key}
            value={data[f.key] as FieldValue | undefined}
            error={errors[f.key]}
            onChange={(v) => onChange({ ...data, [f.key]: v })}
            context={data}
          />
        ))}
      {extra}
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
  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} role="group" aria-label={`${r.itemLabel} ${i + 1}`} className="rounded-xl border border-line bg-paper/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-semibold text-ink">
              {r.itemLabel} {items.length > 1 ? i + 1 : ""}
            </p>
            {(items.length > 1 || r.minToSubmit === 0) && (
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
            {s.fields.filter((f) => isShown(f, it)).map((f) => {
              const key = `${s.key}.${i}.${f.key}`;
              return (
                <IntakeField
                  key={f.key}
                  field={f}
                  errKey={key}
                  value={it[f.key]}
                  error={errors[key]}
                  onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))}
                  context={it}
                />
              );
            })}
          </div>
        </div>
      ))}
      {items.length < r.max && (
        <button
          type="button"
          onClick={() => onChange([...items, emptyItem(s.fields)])}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-dashed border-lagoon/50 px-4 font-semibold text-lagoon hover:bg-lagoon/5"
        >
          <Plus className="size-4" aria-hidden /> {items.length ? r.addLabel : `Add a ${r.itemLabel.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}
