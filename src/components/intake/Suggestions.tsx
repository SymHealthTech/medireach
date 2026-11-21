"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { splitLines, splitList, type FieldDef } from "@/lib/intake/form";
import { fieldSuggestions, type SuggestKey } from "@/lib/suggestions";
import { useOptionalIntakeContext } from "./IntakeContext";

/** Long single-value lists are a type-ahead list (datalist) instead of chips. */
const TYPE_AHEAD: readonly SuggestKey[] = ["designation", "education", "specialty", "council"];
/** Text fields holding a comma-separated list. */
const COMMA_LISTS: readonly SuggestKey[] = ["languages", "interests"];
const SHOWN = 10;

export type SuggestMode = "lines" | "comma" | "single" | "typeahead";

export function suggestMode(f: FieldDef): SuggestMode | null {
  if (!f.suggest) return null;
  if (f.type === "lines") return "lines";
  if (COMMA_LISTS.includes(f.suggest)) return "comma";
  return TYPE_AHEAD.includes(f.suggest) ? "typeahead" : "single";
}

/** The suggestion list for a field, from the whole form (clinic type, specialty) and the local answers. */
export function useFieldSuggestions(f: FieldDef, context: Record<string, unknown>): string[] {
  const ctx = useOptionalIntakeContext();
  if (!f.suggest) return [];
  return fieldSuggestions(ctx?.kind ?? "clinic", f.suggest, { ...(ctx?.data ?? {}), ...context });
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
export function SuggestionChips({ mode, items, value, onChange, label }: { mode: Exclude<SuggestMode, "typeahead">; items: string[]; value: string; onChange: (v: string) => void; label: string }) {
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
      {mode !== "single" && left.length > 1 && (
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
