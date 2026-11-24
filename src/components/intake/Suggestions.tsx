"use client";

import { useState } from "react";
import { inputClass } from "./input-class";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { splitLines, splitList, type FieldDef } from "@/lib/intake/form";
import { fieldSuggestions, type SuggestKey } from "@/lib/suggestions";
import { useOptionalIntakeContext } from "./IntakeContext";

/** Long single-value lists are a type-ahead list (datalist) instead of chips. */
const TYPE_AHEAD: readonly SuggestKey[] = ["education"];
/** A dropdown with "Other" and "Please specify" (the answer is stored as text), like the admin editor's lists. */
const SELECT_OTHER: readonly SuggestKey[] = ["designation", "specialty", "council", "city", "area"];
/** Text fields holding a comma-separated list. */
const COMMA_LISTS: readonly SuggestKey[] = ["languages", "interests", "otherSpecialties"];
const SHOWN = 10;

export type SuggestMode = "lines" | "comma" | "single" | "typeahead" | "selectOther";

export function suggestMode(f: FieldDef): SuggestMode | null {
  if (!f.suggest) return null;
  if (f.type === "lines") return "lines";
  if (COMMA_LISTS.includes(f.suggest)) return "comma";
  if (SELECT_OTHER.includes(f.suggest)) return "selectOther";
  return TYPE_AHEAD.includes(f.suggest) ? "typeahead" : "single";
}

/** The suggestion list for a field, from the whole form (clinic type, specialty) and the local answers. */
export function useFieldSuggestions(f: FieldDef, context: Record<string, unknown>): string[] {
  const ctx = useOptionalIntakeContext();
  if (!f.suggest) return [];
  const data = { ...(ctx?.data ?? {}), ...context };
  // Cities and areas: the live master lists when the page passed them (areas follow the city picked).
  const places = ctx?.places;
  if (places && f.suggest === "city") return Object.keys(places);
  if (places && f.suggest === "area") {
    const city = typeof data.city === "string" ? data.city.trim().toLowerCase() : "";
    return Object.entries(places).find(([name]) => name.toLowerCase() === (city || "pune"))?.[1] ?? [];
  }
  return fieldSuggestions(ctx?.kind ?? "clinic", f.suggest, data);
}

/** The datalist id for a type-ahead field. */
export const datalistId = (inputId: string) => `${inputId}-suggestions`;

export function SuggestionDatalist({ id, items }: { id: string; items: string[] }) {
  return (
    <datalist id={id}>
      {items.map((s) => (
        <option key={s} value={s} />
      ))}
    </datalist>
  );
}

/**
 * One-tap chips under a field: add a line ("lines"), add to a comma list,
 * or fill a one-line answer. Items already in the answer are hidden.
 */
export function SuggestionChips({ mode, items, value, onChange, label, addAll = true }: { mode: Exclude<SuggestMode, "typeahead">; items: string[]; value: string; onChange: (v: string) => void; label: string; addAll?: boolean }) {
  const [all, setAll] = useState(false);
  const have = new Set((mode === "lines" ? splitLines(value) : mode === "comma" ? splitList(value) : [value.trim()]).map((x) => x.toLowerCase()));
  const left = items.filter((s) => !have.has(s.toLowerCase()));
  if (left.length === 0) return null;
  const shown = all ? left : left.slice(0, SHOWN);

  const add = (items: string[]) => {
    if (mode === "single") return onChange(items[0]!);
    if (mode === "comma") return onChange([...splitList(value), ...items].join(", "));
    const base = value.replace(/\s+$/, "");
    onChange(base ? `${base}\n${items.join("\n")}` : items.join("\n"));
  };

  return (
    <div role="group" aria-label={`Suggestions for ${label}`} className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-body/70">
        <Sparkles className="size-3.5 text-marigold" aria-hidden /> {mode === "single" ? "Tap one:" : "Tap to add:"}
      </span>
      {shown.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => add([s])}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-lagoon/30 bg-lagoon/5 px-2.5 text-xs font-medium text-ink hover:border-lagoon hover:bg-lagoon/10"
        >
          {mode !== "single" && <Plus className="size-3" aria-hidden />}
          {s}
        </button>
      ))}
      {left.length > SHOWN && (
        <button type="button" onClick={() => setAll((x) => !x)} className="min-h-8 px-1.5 text-xs font-semibold text-lagoon underline underline-offset-2">
          {all ? "Show fewer" : `+${left.length - SHOWN} more`}
        </button>
      )}
      {addAll && mode !== "single" && left.length > 1 && (
        <button
          type="button"
          onClick={() => add(left)}
          className={cn("min-h-8 rounded-full px-2.5 text-xs font-semibold text-lagoon hover:bg-lagoon/10")}
        >
          Add all {left.length}
        </button>
      )}
    </div>
  );
}

/** A list of choices plus "Other" → "Please specify" (website-form style). Older free-text answers show as "Other". */
export function SelectOtherInput({
  id,
  value,
  onChange,
  items,
  describedBy,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  items: string[];
  describedBy?: string;
  invalid?: boolean;
}) {
  const known = items.find((x) => x.toLowerCase() === value.trim().toLowerCase());
  const [other, setOther] = useState(Boolean(value.trim()) && !known);
  const showOther = other || (Boolean(value.trim()) && !known);
  return (
    <div className="space-y-2">
      <select
        id={id}
        value={showOther ? "__other" : (known ?? "")}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOther(true);
            if (known) onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
        className={cn(inputClass, "h-11")}
      >
        <option value="">Choose…</option>
        {items.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
        <option value="__other">Other</option>
      </select>
      {showOther && (
        <input
          id={`${id}-other`}
          aria-label="Please specify"
          value={value}
          maxLength={200}
          placeholder="Please specify"
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "h-11")}
        />
      )}
    </div>
  );
}
