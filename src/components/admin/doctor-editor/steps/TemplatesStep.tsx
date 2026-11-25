"use client";

import { Check, ClipboardList, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CardStylePicker, DesignPicker } from "@/components/intake/DesignPickers";
import { DEFAULT_DOCTOR_CARD_STYLE, findCardStyle } from "@/lib/cards/styles";
import { cn } from "@/lib/cn";
import { DESIGN_OPTIONS, INTAKE_SECTIONS } from "@/lib/intake/form";
import { SwitchField } from "@/components/admin/form/fields";
import { Group, type StepProps } from "../shared";

function SlotPicker({
  type,
  value,
  onChange,
  options,
  disabled,
}: {
  type: "portfolio" | "card";
  value: string;
  onChange: (key: string) => void;
  options: StepProps["options"];
  disabled?: boolean;
}) {
  const slots = options.templates.filter((t) => t.type === type);
  return (
    <div role="radiogroup" aria-label={type === "portfolio" ? "Portfolio design" : "Card design"} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {slots.map((s) => {
        const ready = s.status === "ready";
        const selected = value === s.key;
        const card = (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={!ready || disabled}
            onClick={() => ready && !disabled && onChange(s.key)}
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-xl border-2 bg-card text-left transition",
              selected ? "border-ink" : "border-line",
              ready ? "hover:border-ink/50" : "cursor-not-allowed border-dashed opacity-70",
            )}
          >
            <span className="flex aspect-[3/4] items-center justify-center bg-sage">
              {s.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                <img src={s.previewUrl} alt="" className="size-full object-cover" />
              ) : ready ? (
                <span className="font-display text-2xl text-ink">Aa</span>
              ) : (
                <Clock className="size-6 text-ink/50" strokeWidth={1.5} />
              )}
            </span>
            <span className="p-2 text-sm font-medium">{s.name}</span>
            {selected && (
              <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-ink text-on-ink">
                <Check className="size-4" />
              </span>
            )}
          </button>
        );
        return ready ? (
          <div key={s.key}>{card}</div>
        ) : (
          <Tooltip key={s.key}>
            <TooltipTrigger asChild>
              <div>{card}</div>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// The same pickers as the website form and the homepage (Get started → Doctor).
const DESIGN_FIELDS = INTAKE_SECTIONS.doctor.find((s) => s.key === "design")!.fields;
const WEBSITE_FIELD = DESIGN_FIELDS.find((x) => x.key === "websiteDesign")!;
const CARD_FIELD = DESIGN_FIELDS.find((x) => x.key === "cardStyle")!;

export function TemplatesStep({ form: f, set, options, readOnly, hints, cardFaces }: StepProps) {
  const readyCardLayouts = options.templates.filter((t) => t.type === "card" && t.status === "ready");
  const cardStyle = f.cardStyle || DEFAULT_DOCTOR_CARD_STYLE.code;
  const picked = findCardStyle(cardStyle);
  const formDesign = hints?.websiteDesign ? DESIGN_OPTIONS.doctor.find((d) => d.value === hints.websiteDesign)?.label : undefined;
  const formCard = hints?.cardStyle ? findCardStyle(hints.cardStyle) : undefined;
  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {hints && (formDesign || formCard || hints.designDecision) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sage/60 px-3 py-2 text-sm text-ink">
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          <span>
            Website form {hints.ref}: website <strong>{formDesign ?? "not decided"}</strong>, card <strong>{formCard ? `${formCard.name} (${formCard.code})` : "not decided"}</strong>
            {hints.designDecision === "discuss" ? " · Not final: talk to the doctor first." : hints.designDecision === "final" ? " · Final choice." : ""}
            {hints.healthTips ? ` · Health tips: ${hints.healthTips === "no" ? "no" : "yes"}` : ""}
          </span>
        </p>
      )}
      <Group title="Website design" description="The designs doctors see on the website. View opens the full sample site; every design has the same SEO.">
        <DesignPicker id="portfolioTemplateId" field={WEBSITE_FIELD} value={f.portfolioTemplateId} onChange={(v) => v && set({ portfolioTemplateId: v })} undecided={false} />
        <SwitchField
          label="Health tips section"
          description="Two short, general health articles chosen for the doctor's specialty (not written by or credited to the doctor). Shown in designs that have the section, such as Clinic Modern."
          checked={f.showHealthTips}
          onCheckedChange={(showHealthTips) => set({ showHealthTips })}
        />
      </Group>
      <Group
        title="Visiting card"
        description={`Shown with this doctor's details${cardFaces ? " (as last saved)" : ""}. View shows the phone and print card. The card page, WhatsApp image and print PDF all use the chosen colours.`}
      >
        <CardStylePicker id="cardStyle" field={CARD_FIELD} value={cardStyle} onChange={(code) => code && set({ cardStyle: code })} cardFaces={cardFaces} undecided={false} />
        {picked && (
          <p className="text-sm text-muted-foreground">
            Chosen: <strong className="text-ink">{picked.name}</strong> <span className="font-mono">{picked.code}</span>
            {!f.cardStyle && " (default)"}
          </p>
        )}
        {readyCardLayouts.length > 1 ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Card layout</p>
            <SlotPicker type="card" value={f.cardTemplateId} options={options} disabled={readOnly} onChange={(cardTemplateId) => set({ cardTemplateId })} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Card layout: {readyCardLayouts[0]?.name ?? "Classic"}. More layouts are coming.</p>
        )}
      </Group>
    </fieldset>
  );
}
