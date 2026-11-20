"use client";

import { Check } from "lucide-react";
import { CARD_STYLES_BY_GROUP, type CardStyleGroup } from "@/lib/cards/styles";
import { cn } from "@/lib/cn";

const GROUP_LABEL: Record<CardStyleGroup, string> = { doctor: "Doctor styles", clinic: "Clinic styles", hospital: "Hospital styles" };

/**
 * Visiting card colour style, chosen by code name (the code the doctor or
 * site owner picked on /visiting-cards, e.g. "DOC-AMBER"). Saving it links
 * that look to every version of the card. "" = the default look.
 */
export function CardStylePicker({
  groups,
  value,
  onChange,
  disabled,
  defaultLabel,
  defaultHint,
}: {
  /** Which style groups to offer, in order (the first is the main one). */
  groups: CardStyleGroup[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  defaultLabel: string;
  defaultHint: string;
}) {
  const tile = (selected: boolean) =>
    cn(
      "relative flex w-full items-center gap-3 rounded-xl border-2 bg-card p-3 text-left transition",
      selected ? "border-ink" : "border-line hover:border-ink/40",
      disabled && "cursor-not-allowed opacity-70",
    );
  const tick = (
    <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-ink text-on-ink">
      <Check className="size-3.5" />
    </span>
  );

  return (
    <div role="radiogroup" aria-label="Visiting card colours" className="space-y-4">
      <button type="button" role="radio" aria-checked={!value} disabled={disabled} onClick={() => onChange("")} className={tile(!value)}>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{defaultLabel}</span>
          <span className="block text-xs text-muted-foreground">{defaultHint}</span>
        </span>
        {!value && tick}
      </button>
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{GROUP_LABEL[g]}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_STYLES_BY_GROUP[g].map((s) => {
              const selected = value === s.code;
              return (
                <button key={s.code} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(s.code)} className={tile(selected)}>
                  <span aria-hidden className="flex shrink-0 -space-x-1.5">
                    {s.swatches.map((c, i) => (
                      <span key={i} className="size-6 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-semibold tracking-wide">{s.code}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.name} · {s.colours}
                    </span>
                  </span>
                  {selected && tick}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
