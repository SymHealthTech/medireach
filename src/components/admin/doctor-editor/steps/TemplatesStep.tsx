"use client";

import { Check, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
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

export function TemplatesStep({ form: f, set, options, readOnly }: StepProps) {
  return (
    <div className="space-y-5">
      <Group title="Portfolio page design" description="All designs share the same SEO; only the look changes.">
        <SlotPicker type="portfolio" value={f.portfolioTemplateId} options={options} disabled={readOnly} onChange={(portfolioTemplateId) => set({ portfolioTemplateId })} />
      </Group>
      <Group title="Visiting card design">
        <SlotPicker type="card" value={f.cardTemplateId} options={options} disabled={readOnly} onChange={(cardTemplateId) => set({ cardTemplateId })} />
      </Group>
    </div>
  );
}
