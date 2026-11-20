"use client";

import { useState, type ReactNode } from "react";
import { Check, ExternalLink, Expand, HelpCircle, Monitor, Smartphone, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import { cn } from "@/lib/cn";
import type { IntakeKind } from "@/lib/constants";
import { DESIGN_OPTIONS, NOT_SURE, type FieldDef } from "@/lib/intake/form";
import { getTheme } from "@/themes/specialty";
import { useIntakeContext } from "./IntakeContext";

const tile = (selected: boolean, disabled?: boolean) =>
  cn(
    "relative flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left transition-[border-color,box-shadow]",
    selected ? "border-lagoon ring-2 ring-lagoon" : "border-line hover:border-lagoon/50",
    disabled ? "cursor-not-allowed opacity-55" : "bg-surface",
  );

function Tick() {
  return (
    <span className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-lagoon text-white">
      <Check className="size-4" strokeWidth={3} aria-hidden />
    </span>
  );
}

function NotSureTile({ selected, onSelect, text }: { selected: boolean; onSelect: () => void; text: string }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={cn(tile(selected), "min-h-40 items-center justify-center text-center")}>
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

/** One choice: preview (opens the viewer), name, and View + Select buttons. */
function OptionTile({
  name,
  sub,
  preview,
  selected,
  disabled,
  onView,
  onSelect,
}: {
  name: string;
  sub?: string;
  preview: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onView?: () => void;
  onSelect: () => void;
}) {
  return (
    <div className={tile(selected, disabled)}>
      {selected && <Tick />}
      <button type="button" onClick={onView} disabled={!onView} tabIndex={-1} aria-hidden className="block w-full rounded-lg text-left disabled:cursor-not-allowed">
        {preview}
      </button>
      <span className="text-sm font-semibold text-ink">{name}</span>
      {sub && <span className="-mt-1.5 text-xs text-body/70">{sub}</span>}
      <span className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
        <button
          type="button"
          onClick={onView}
          disabled={!onView}
          aria-label={`View ${name}`}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-lagoon/40 px-2 text-sm font-semibold text-lagoon hover:bg-lagoon/5 disabled:opacity-50"
        >
          <Expand className="size-3.5" aria-hidden /> View
        </button>
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`${selected ? "Selected" : "Select"}: ${name}`}
          className={cn("inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold", selected ? "bg-lagoon text-white" : "bg-ink text-white hover:bg-ink/85")}
        >
          {selected ? (
            <>
              <Check className="size-4" strokeWidth={3} aria-hidden /> Selected
            </>
          ) : (
            "Select"
          )}
        </button>
      </span>
    </div>
  );
}

/** Full-screen preview with a "Choose" button at the bottom. */
function FullScreenViewer({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  children,
  selected,
  chooseLabel,
  onChoose,
  extra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs?: ReactNode;
  children: ReactNode;
  selected: boolean;
  chooseLabel: string;
  onChoose: () => void;
  extra?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#062A2A]/95 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-display text-lg font-semibold sm:text-xl">{title}</DialogPrimitive.Title>
              {subtitle && <p className="truncate text-sm text-white/70">{subtitle}</p>}
            </div>
            {tabs}
            <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Close">
              <X className="size-5" strokeWidth={2} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 pb-2 sm:px-4">{children}</div>

          <div className="border-t border-white/10 bg-black/20 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:justify-between">
              <div className="text-sm text-white/75">{extra}</div>
              <button
                type="button"
                onClick={() => {
                  onChoose();
                  onClose();
                }}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] px-6 font-semibold text-white transition-colors active:scale-[.98] sm:w-auto",
                  selected ? "bg-lagoon hover:bg-lagoon/90" : "bg-marigold hover:bg-marigold-700",
                )}
              >
                <Check className="size-5" strokeWidth={2.5} aria-hidden /> {selected ? "Selected. Close" : chooseLabel}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const switchTab = (active: boolean) =>
  cn("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition", active ? "bg-white text-ink shadow-soft" : "text-white/80 hover:text-white");

/** Website design: tiles with View (the sample site, full screen) and Select, plus "Not decided". */
export function DesignPicker({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  const kind: IntakeKind = field.kind ?? "doctor";
  const options = DESIGN_OPTIONS[kind];
  const [viewing, setViewing] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const current = options.find((o) => o.value === viewing);
  return (
    <>
      <div id={id} role="group" aria-label={field.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <OptionTile
            key={o.value}
            name={o.label}
            sub={o.ready ? undefined : "Coming soon"}
            preview={kind === "doctor" ? <DoctorDesignMock label={o.label} /> : <ThemeMiniPreview theme={getTheme(o.value, kind === "hospital" ? "hospital" : "clinic")} />}
            selected={value === o.value}
            disabled={!o.ready}
            onView={o.ready ? () => setViewing(o.value) : undefined}
            onSelect={() => onChange(o.value)}
          />
        ))}
        <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" />
      </div>
      {current && (
        <FullScreenViewer
          open
          onClose={() => setViewing(null)}
          title={current.label}
          subtitle="Sample website with made-up details. Yours will have your own."
          tabs={
            <div role="tablist" aria-label="Preview size" className="hidden rounded-full bg-white/10 p-1 sm:flex">
              <button type="button" role="tab" aria-selected={device === "desktop"} onClick={() => setDevice("desktop")} className={switchTab(device === "desktop")}>
                <Monitor className="size-4" aria-hidden /> Computer
              </button>
              <button type="button" role="tab" aria-selected={device === "phone"} onClick={() => setDevice("phone")} className={switchTab(device === "phone")}>
                <Smartphone className="size-4" aria-hidden /> Phone
              </button>
            </div>
          }
          selected={value === current.value}
          chooseLabel="Choose this design"
          onChoose={() => onChange(current.value)}
          extra={
            <a href={current.sampleHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-white underline-offset-2 hover:underline">
              Open in a new tab <ExternalLink className="size-3.5" aria-hidden />
            </a>
          }
        >
          <iframe
            key={current.value}
            src={current.sampleHref}
            title={`${current.label} sample website`}
            className={cn("h-full rounded-xl bg-white shadow-2xl", device === "phone" ? "w-full max-w-[400px]" : "w-full max-w-6xl")}
          />
        </FullScreenViewer>
      )}
    </>
  );
}

/** Visiting card style: tiles with View (phone and print card, full screen) and Select, plus "Not decided". */
export function CardStylePicker({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  const styles = CARD_STYLES_BY_GROUP[field.kind ?? "doctor"];
  const { cardFaces } = useIntakeContext();
  const [viewing, setViewing] = useState<string | null>(null);
  const [face, setFace] = useState<"phone" | "print">("phone");
  const current = styles.find((c) => c.code === viewing);
  const faces = current ? cardFaces?.[current.code] : undefined;
  const swatches = (c: (typeof styles)[number], tall?: boolean) => (
    <span className={cn("flex overflow-hidden rounded-md", tall ? "aspect-[85/55] w-full max-w-md" : "h-10")} aria-hidden>
      <span className="flex-[3]" style={{ background: c.swatches[0] }} />
      <span className="flex-1" style={{ background: c.swatches[1] }} />
      <span className="flex-1" style={{ background: c.swatches[2] }} />
    </span>
  );
  return (
    <>
      <div id={id} role="group" aria-label={field.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {styles.map((c) => (
          <OptionTile
            key={c.code}
            name={c.name}
            sub={c.code}
            preview={
              cardFaces?.[c.code] ? (
                <span className="pointer-events-none block rounded-md p-1.5" style={{ background: c.swatches[2] }}>
                  {cardFaces[c.code]!.thumb}
                </span>
              ) : (
                swatches(c)
              )
            }
            selected={value === c.code}
            onView={() => {
              setFace("phone");
              setViewing(c.code);
            }}
            onSelect={() => onChange(c.code)}
          />
        ))}
        <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" />
      </div>
      {current && (
        <FullScreenViewer
          open
          onClose={() => setViewing(null)}
          title={`${current.name} (${current.code})`}
          subtitle={current.colours}
          tabs={
            faces && (
              <div role="tablist" aria-label="Card" className="flex rounded-full bg-white/10 p-1">
                <button type="button" role="tab" aria-selected={face === "phone"} onClick={() => setFace("phone")} className={switchTab(face === "phone")}>
                  Phone
                </button>
                <button type="button" role="tab" aria-selected={face === "print"} onClick={() => setFace("print")} className={switchTab(face === "print")}>
                  Print
                </button>
              </div>
            )
          }
          selected={value === current.code}
          chooseLabel="Choose this card"
          onChoose={() => onChange(current.code)}
          extra="Sample card with made-up details. Yours will have your own."
        >
          {faces ? (
            face === "phone" ? (
              <div className="w-[min(88vw,calc((100dvh-200px)*0.5625),460px)] overflow-hidden rounded-2xl shadow-2xl">{faces.phone}</div>
            ) : (
              <div className="w-[min(92vw,calc((100dvh-200px)*1.545),960px)] overflow-hidden rounded-xl shadow-2xl">{faces.print}</div>
            )
          ) : (
            swatches(current, true)
          )}
        </FullScreenViewer>
      )}
    </>
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
