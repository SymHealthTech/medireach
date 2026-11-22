"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { splitLines } from "@/lib/intake/form";
import { blankRow, rowHasContent, rowsToText, textToRows, type Row, type RowsDef } from "@/lib/intake/rows";
import { inputClass } from "./input-class";
import { SelectOtherInput, SuggestionChips } from "./Suggestions";

/**
 * Qualifications, services, awards or memberships as rows of boxes (like the
 * admin editor). Keeps its own rows (a half-typed row stays put) and writes
 * the text answer, one line per row. `suggestions` add rows (first column).
 */
export function RowsField({
  id,
  def,
  value,
  onChange,
  label,
  suggestions = [],
  describedBy,
  invalid,
}: {
  id: string;
  def: RowsDef;
  value: string;
  onChange: (v: string) => void;
  label: string;
  suggestions?: string[];
  describedBy?: string;
  invalid?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => textToRows(def, value));
  const [written, setWritten] = useState(value);
  if (value !== written) {
    // Changed from outside (a saved form opened, a suggestion tapped).
    setWritten(value);
    setRows(textToRows(def, value));
  }
  const write = (next: Row[]) => {
    const text = rowsToText(def, next);
    setRows(next);
    setWritten(text);
    onChange(text);
  };
  const first = def.columns[0]!.key;
  const names = rows.map((r) => r[first] ?? "").join("\n");

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} role="group" aria-label={`${def.item} ${i + 1}`} className="min-w-0 rounded-xl border border-line bg-paper/60 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {def.item} {i + 1}
            </p>
            {(rows.length > 1 || rowHasContent(r)) && (
              <button
                type="button"
                onClick={() => write(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blankRow(def)])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10"
              >
                <Trash2 className="size-4" aria-hidden /> Remove
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {def.columns.map((c, ci) => {
              const cid = i === 0 && ci === 0 ? id : `${id}-${i}-${c.key}`;
              const v = r[c.key] ?? "";
              const set = (next: string) => write(rows.map((x, j) => (j === i ? { ...x, [c.key]: next } : x)));
              return (
                <div key={c.key} className="min-w-0 space-y-1">
                  <label htmlFor={cid} className="block text-xs font-medium text-body/80">
                    {c.label}
                  </label>
                  {c.type === "choice" ? (
                    <SelectOtherInput id={cid} value={v} onChange={set} items={[...(c.choices ?? [])]} describedBy={describedBy} invalid={invalid && ci === 0} />
                  ) : (
                    <input
                      id={cid}
                      value={v}
                      placeholder={c.placeholder}
                      autoComplete="off"
                      inputMode={c.type === "year" ? "numeric" : undefined}
                      maxLength={c.type === "year" ? 4 : 150}
                      aria-invalid={invalid && ci === 0 ? true : undefined}
                      aria-describedby={ci === 0 ? describedBy : undefined}
                      onChange={(e) => set(c.type === "year" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                      className={cn(inputClass, "h-11")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {suggestions.length > 0 && (
        <SuggestionChips
          mode="lines"
          items={suggestions}
          value={names}
          label={label}
          onChange={(next) => {
            const have = new Set(rows.map((r) => (r[first] ?? "").trim().toLowerCase()));
            const added = splitLines(next).filter((n) => !have.has(n.toLowerCase()));
            write([...rows.filter(rowHasContent), ...added.map((n) => ({ ...blankRow(def), [first]: n }))].slice(0, def.max));
          }}
        />
      )}
      {rows.length < def.max && (
        <button
          type="button"
          onClick={() => setRows([...rows, blankRow(def)])}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-dashed border-lagoon/50 px-4 font-semibold text-lagoon hover:bg-lagoon/5"
        >
          <Plus className="size-4" aria-hidden /> Add {def.item.toLowerCase()}
        </button>
      )}
    </div>
  );
}
