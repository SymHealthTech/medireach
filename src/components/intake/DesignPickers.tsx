"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink, Expand, HelpCircle, Monitor, Smartphone, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import { cn } from "@/lib/cn";
import type { IntakeKind } from "@/lib/constants";
import { DESIGN_GROUPS, DESIGN_OPTIONS, DESIGN_TYPE_FIELD, NOT_SURE, type DesignGroup, type FieldDef } from "@/lib/intake/form";
import { BrandLoader } from "@/components/loading/BrandLoader";
import { THEME_ICONS } from "@/themes/icons";
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

function NotSureTile({ selected, onSelect, text, className }: { selected: boolean; onSelect: () => void; text: string; className?: string }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={cn(tile(selected), "min-h-40 items-center justify-center text-center", className)}>
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

/** The sample site in the viewer, with the loader until it has loaded (a cold sample page can take a few seconds). */
function SampleFrame({ src, title, className }: { src: string; title: string; className: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl bg-white shadow-2xl", className)}>
      {!loaded && <BrandLoader label="Opening the sample website" className="absolute inset-0 justify-center bg-white" />}
      <iframe src={src} title={title} onLoad={() => setLoaded(true)} className={cn("size-full transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} />
    </div>
  );
}

/** A sample website, full screen, with a Computer / Phone switch. */
function WebsiteViewer({
  design,
  title,
  selected,
  onChoose,
  onClose,
}: {
  design: { value: string; sampleHref: string };
  title: string;
  selected: boolean;
  onChoose: () => void;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  return (
    <FullScreenViewer
      open
      onClose={onClose}
      title={title}
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
      selected={selected}
      chooseLabel="Choose this design"
      onChoose={onChoose}
      extra={
        <a href={design.sampleHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-white underline-offset-2 hover:underline">
          Open in a new tab <ExternalLink className="size-3.5" aria-hidden />
        </a>
      }
    >
      <SampleFrame key={design.value} src={design.sampleHref} title={`${title} sample website`} className={device === "phone" ? "max-w-[400px]" : "max-w-6xl"} />
    </FullScreenViewer>
  );
}

/**
 * Website design. Doctors: one row of portfolio designs. Clinics and
 * hospitals: their type first (chips), then that type's designs. Each tile has
 * View (the sample site, full screen) and Select; plus "Not decided".
 */
export function DesignPicker({ id, field, value, onChange, context = {} }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void; context?: Record<string, unknown> }) {
  const kind: IntakeKind = field.kind ?? "doctor";
  if (kind === "doctor") return <DoctorDesignPicker id={id} field={field} value={value} onChange={onChange} />;
  const formType = context[DESIGN_TYPE_FIELD[kind]];
  return <TypedDesignPicker id={id} field={field} kind={kind} formType={typeof formType === "string" ? formType : ""} value={value} onChange={onChange} />;
}

function DoctorDesignPicker({ id, field, value, onChange }: { id: string; field: FieldDef; value: string; onChange: (v: string) => void }) {
  const options = DESIGN_OPTIONS.doctor;
  const [viewing, setViewing] = useState<string | null>(null);
  const current = options.find((o) => o.value === viewing);
  return (
    <>
      <div id={id} role="group" aria-label={field.label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <OptionTile
            key={o.value}
            name={o.label}
            sub={o.ready ? undefined : "Coming soon"}
            preview={<DoctorDesignMock label={o.label} />}
            selected={value === o.value}
            disabled={!o.ready}
            onView={o.ready ? () => setViewing(o.value) : undefined}
            onSelect={() => onChange(o.value)}
          />
        ))}
        <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" />
      </div>
      {current && <WebsiteViewer design={current} title={current.label} selected={value === current.value} onChoose={() => onChange(current.value)} onClose={() => setViewing(null)} />}
    </>
  );
}

/** Greyed preview for a design slot that isn't built yet. */
function ComingSoonPreview({ themeKey, kind }: { themeKey: string; kind: "clinic" | "hospital" }) {
  return (
    <span className="relative block">
      <span className="block opacity-35 grayscale">
        <ThemeMiniPreview theme={getTheme(themeKey, kind)} name=" " />
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Coming soon</span>
      </span>
    </span>
  );
}

function TypedDesignPicker({
  id,
  field,
  kind,
  formType,
  value,
  onChange,
}: {
  id: string;
  field: FieldDef;
  kind: "clinic" | "hospital";
  /** The type chosen in "About" (the picker opens on it). */
  formType: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const groups = DESIGN_GROUPS[kind];
  const has = (g: DesignGroup) => value !== NOT_SURE && g.designs.some((d) => d.ready && d.value === value);
  const isType = (t: string) => groups.some((g) => g.value === t);
  // Open on their own type, unless the chosen design is only under another type.
  const [active, setActive] = useState(() => {
    const own = groups.find((g) => g.value === formType);
    return (own && (value === NOT_SURE || has(own)) ? own : (groups.find(has) ?? own ?? groups[0]!)).value;
  });
  // Changing the type in "About" moves the picker to it.
  const [seenType, setSeenType] = useState(formType);
  if (formType !== seenType) {
    setSeenType(formType);
    if (isType(formType)) setActive(formType);
  }
  const group = groups.find((g) => g.value === active) ?? groups[0]!;
  const chosenElsewhere = has(group) ? undefined : groups.find(has);
  // A tick on the type's chip, when the chosen design belongs to that type only (some types share a design today).
  const owners = groups.filter(has);
  const tickOn = owners.length === 1 ? owners[0]!.value : undefined;
  const chosen = chosenElsewhere?.designs.find((d) => d.value === value);

  const [viewing, setViewing] = useState<string | null>(null);
  const current = group.designs.find((d) => d.ready && d.value === viewing);

  // Keep the active chip in view in the sideways-scrolling row (phones), without scrolling the page.
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row.current && el && row.current.scrollWidth > row.current.clientWidth) {
      row.current.scrollLeft = el.offsetLeft - row.current.clientWidth / 2 + el.offsetWidth / 2;
    }
  }, [active]);

  const typeWord = kind === "clinic" ? "clinic" : "hospital";
  return (
    <>
      <div id={id} role="group" aria-label={field.label} className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-body/70">1. Type of {typeWord}</p>
          <div ref={row} role="group" aria-label={`Type of ${typeWord}`} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {groups.map((g) => {
              const Icon = THEME_ICONS[g.icon];
              const on = g.value === group.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(g.value)}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    on ? "border-lagoon bg-lagoon text-white" : "border-line bg-surface text-body hover:border-lagoon/50 hover:text-ink",
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} aria-hidden />
                  {g.label}
                  {g.value === tickOn && !on && (
                    <>
                      <Check className="size-3.5 text-lagoon" strokeWidth={3} aria-hidden />
                      <span className="sr-only">(your design)</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {!isType(formType) && formType && <p className="text-xs text-body/70">Your {typeWord} type isn&apos;t listed. Pick the closest one, or choose “Not decided”.</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-body/70">2. Designs for {group.label}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.designs.map((d) => (
              <OptionTile
                key={d.value}
                name={d.label}
                sub={d.ready ? d.sub : "Coming soon"}
                preview={d.ready ? <ThemeMiniPreview theme={getTheme(d.value, kind)} /> : <ComingSoonPreview themeKey={group.themeKey} kind={kind} />}
                selected={d.ready && value === d.value}
                disabled={!d.ready}
                onView={d.ready ? () => setViewing(d.value) : undefined}
                onSelect={() => onChange(d.value)}
              />
            ))}
            <NotSureTile selected={value === NOT_SURE} onSelect={() => onChange(NOT_SURE)} text="Help me choose" className="sm:col-span-3 sm:min-h-0 sm:flex-row sm:py-3" />
          </div>
          {chosenElsewhere && chosen && (
            <p className="text-sm text-body/80">
              Your choice: <strong className="text-ink">{chosen.sub}</strong> ({chosenElsewhere.label}, {chosen.label}).{" "}
              <button type="button" onClick={() => setActive(chosenElsewhere.value)} className="font-semibold text-lagoon underline underline-offset-2">
                Show it
              </button>
            </p>
          )}
        </div>
      </div>
      {current && (
        <WebsiteViewer
          design={current}
          title={`${group.label}: ${current.label} (${current.sub})`}
          selected={value === current.value}
          onChoose={() => onChange(current.value)}
          onClose={() => setViewing(null)}
        />
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
