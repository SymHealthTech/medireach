"use client";

import { ClipboardList, IdCard } from "lucide-react";
import { DesignPicker } from "@/components/intake/DesignPickers";
import { DESIGN_OPTIONS, INTAKE_SECTIONS } from "@/lib/intake/form";
import { SwitchField } from "@/components/admin/form/fields";
import { Group, type StepProps } from "../shared";

// The same picker as the website form and the homepage (Get started → Doctor).
const DESIGN_FIELDS = INTAKE_SECTIONS.doctor.find((s) => s.key === "design")!.fields;
const WEBSITE_FIELD = DESIGN_FIELDS.find((x) => x.key === "websiteDesign")!;

/** Website design. The visiting card always comes in the same design, so there is nothing to choose for it. */
export function TemplatesStep({ form: f, set, readOnly, hints }: StepProps) {
  const formDesign = hints?.websiteDesign ? DESIGN_OPTIONS.doctor.find((d) => d.value === hints.websiteDesign)?.label : undefined;
  const chosen = DESIGN_OPTIONS.doctor.find((d) => d.value === f.portfolioTemplateId)?.label;
  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {hints && (formDesign || hints.designDecision) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sage/60 px-3 py-2 text-sm text-ink">
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          <span>
            Website form {hints.ref}: website <strong>{formDesign ?? "not decided"}</strong>
            {hints.designDecision === "discuss" ? " · Not final: talk to the doctor first." : hints.designDecision === "final" ? " · Final choice." : ""}
            {hints.healthTips ? ` · Health tips: ${hints.healthTips === "no" ? "no" : "yes"}` : ""}
          </span>
        </p>
      )}
      <Group title="Website design" description="The designs doctors see on the website. View opens the full sample site; every design has the same SEO.">
        <DesignPicker id="portfolioTemplateId" field={WEBSITE_FIELD} value={f.portfolioTemplateId} onChange={(v) => v && set({ portfolioTemplateId: v })} undecided={false} />
        <p className="flex items-start gap-2 rounded-lg bg-mist px-3 py-2 text-sm text-body">
          <IdCard className="mt-0.5 size-4 shrink-0 text-lagoon" aria-hidden />
          <span>
            The digital visiting card comes with the website design{chosen ? <> (<strong className="text-ink">{chosen}</strong>)</> : null}: same colours and style, with
            Call, WhatsApp, Directions and Website buttons. The card page, WhatsApp image and PDFs all follow it.
          </span>
        </p>
        <SwitchField
          label="Health tips section"
          description="Two short, general health articles chosen for the doctor's specialty (not written by or credited to the doctor). Shown in designs that have the section, such as Clinic Modern."
          checked={f.showHealthTips}
          onCheckedChange={(showHealthTips) => set({ showHealthTips })}
        />
      </Group>
    </fieldset>
  );
}
