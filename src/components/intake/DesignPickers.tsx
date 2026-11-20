"use client";

import { Check, ExternalLink, HelpCircle } from "lucide-react";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import { cn } from "@/lib/cn";
import type { IntakeKind } from "@/lib/constants";
import { DESIGN_OPTIONS, NOT_SURE, type FieldDef } from "@/lib/intake/form";
import { getTheme } from "@/themes/specialty";

const tile = (selected: boolean, disabled?: boolean) =>
  cn(
    "relative flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left transition-[border-color,box-shadow]",
    selected ? "border-lagoon ring-2 ring-lagoon" : "border-line hover:border-lagoon/50",
    disabled ? "cursor-not-allowed opacity-55" : "bg-surface",
  );

function Tick() {
  return (
    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-lagoon text-white">
      <Check className="size-4" strokeWidth={3} aria-hidden />
    </span>
  );
}

function NotSureTile({ selected, onSelect, text }: { selected: boolean; onSelect: () => void; text: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn(tile(selected), "items-center justify-center text-center")}>
      {selected && <Tick />}
      <HelpCircle className="size-6 text-lagoon" aria-hidden />
      <span className="font-semibold text-ink">Not decided</span>
      <span className="text-xs text-body/75">{text}</span>
    </button>
  );
}

/** Doctor portfolio designs don't have a theme; a neutral page mock stands in. */
function DoctorDesignMock({ label }: { label: string }) {
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-line bg-white text-[8px] leading-tight">
      <div className="flex items-center gap-1.5 bg-ink px-2 py-2 text-white">
        <span className="size-4 rounded-full bg-white/30" />
        <span className="truncate font-semibold">{label}</span>
      </div>
      <div className="space-y-1 bg-[#E0F2F1] px-2 py-2">
        <div className="h-1.5 w-3/4 rounded-full bg-ink/80" />
        <div className="h-1 w-1/2 rounded-full bg-ink/30" />
        <div className="mt-1 h-2.5 w-10 rounded bg-marigold" />
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 rounded bg-[#E0F2F1]" />
        ))}
      </div>
    </div>
  );
}

/** Website design: preview tiles with "View sample" (opens in a new tab), plus "Not decided". */
export function DesignPicker({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  const kind: IntakeKind = field.kind ?? "doctor";
  const options = DESIGN_OPTIONS[kind];
  return (
    <div id={id} role="radiogroup" aria-label={field.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <div key={o.value} className="flex flex-col gap-1.5">
            <button type="button" role="radio" aria-checked={selected} disabled={!o.ready} onClick={() => onChange(o.value)} className={tile(selected, !o.ready)}>
              {selected && <Tick />}
              {kind === "doctor" ? <DoctorDesignMock label={o.label} /> : <ThemeMiniPreview theme={getTheme(o.value, kind === "hospital" ? "hospital" : "clinic")} />}
              <span className="text-sm font-semibold text-ink">{o.label}</span>
              {!o.ready && <span className="text-xs text-body/70">Coming soon</span>}
            </button>
            {o.ready && (
              <a href={o.sampleHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-1 text-xs font-semibold text-lagoon underline-offset-2 hover:underline">
                View sample <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
        );
      })}
      <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" />
    </div>
  );
}

/** Visiting card colour style (code names from /visiting-cards), plus "Not decided". */
export function CardStylePicker({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  const styles = CARD_STYLES_BY_GROUP[field.kind ?? "doctor"];
  return (
    <div className="space-y-2">
      <div id={id} role="radiogroup" aria-label={field.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {styles.map((c) => {
          const selected = value === c.code;
          return (
            <button key={c.code} type="button" role="radio" aria-checked={selected} onClick={() => onChange(c.code)} className={tile(selected)}>
              {selected && <Tick />}
              <span className="flex h-10 overflow-hidden rounded-md" aria-hidden>
                <span className="flex-[3]" style={{ background: c.swatches[0] }} />
                <span className="flex-1" style={{ background: c.swatches[1] }} />
                <span className="flex-1" style={{ background: c.swatches[2] }} />
              </span>
              <span className="text-sm font-semibold text-ink">{c.name}</span>
              <span className="text-xs text-body/70">{c.code}</span>
            </button>
          );
        })}
        <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" />
      </div>
      <a href="/visiting-cards" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-lagoon underline-offset-2 hover:underline">
        See the full visiting cards <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}

/** A few options as large radio cards (label + one line). */
export function ChoiceCards({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  return (
    <div id={id} role="radiogroup" aria-label={field.label} className="grid gap-3 sm:grid-cols-2">
      {(field.options as readonly { value: string; label: string; description?: string }[] | undefined)?.map((o) => {
        const selected = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(o.value)} className={cn(tile(selected), "flex-row items-start gap-3 p-4")}>
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-lagoon" : "border-line")}>
              {selected && <span className="size-2.5 rounded-full bg-lagoon" />}
            </span>
            <span>
              <span className="block font-semibold text-ink">{o.label}</span>
              {o.description && <span className="block text-sm text-body/80">{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
