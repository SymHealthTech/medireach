"use client";

import { ClipboardList, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { DesignPicker } from "@/components/intake/DesignPickers";
import { Group } from "@/components/admin/doctor-editor/shared";
import { DESIGN_TYPE_FIELD, INTAKE_SECTIONS, hospitalTypeFor } from "@/lib/intake/form";
import { getTheme, isThemeKey, type ThemeKey } from "@/themes/specialty";
import type { EStepProps } from "../shared";

// The same picker as the website forms and the homepage (Get started → Clinic / Hospital).
const websiteField = (kind: "clinic" | "hospital") => INTAKE_SECTIONS[kind].find((s) => s.key === "design")!.fields.find((x) => x.key === "websiteDesign")!;

/** Website design (moved out of Basics, as in the doctor editor). The visiting card follows it: nothing to choose for the card. */
export function DesignStep({ form: f, set, options, readOnly, hints }: EStepProps) {
  const kind = f.kind;
  const website = websiteField(kind);
  const category = options.categories.find((c) => c.id === f.categoryId);
  const theme = getTheme(f.themeKey, kind);
  const layouts = options.templates.filter((t) => t.type === kind && t.status === "ready");

  const formDesign = hints?.websiteDesign && isThemeKey(hints.websiteDesign) ? getTheme(hints.websiteDesign, kind).name : undefined;
  const canUseForm = formDesign && hints?.websiteDesign !== f.themeKey;

  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {hints && (formDesign || hints.designDecision) && (
        <div className="flex flex-col gap-2 rounded-lg bg-sage/60 px-3 py-2 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ClipboardList className="size-4 shrink-0" aria-hidden />
            <span>
              Website form {hints.ref}: website <strong>{formDesign ?? "not decided"}</strong>
              {hints.designDecision === "discuss" ? " · Not final: talk to them first." : hints.designDecision === "final" ? " · Final choice." : ""}
            </span>
          </p>
          {canUseForm && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => set({ themeKey: hints.websiteDesign as ThemeKey })}
            >
              Use their choice
            </Button>
          )}
        </div>
      )}

      <Group
        title="Website design"
        description={`The designs ${kind === "hospital" ? "hospitals" : "clinics"} see on the website, by type. View opens the full sample site; every design has the same SEO.`}
      >
        <DesignPicker
          id="themeKey"
          field={website}
          value={f.themeKey}
          // The picker opens on the type: the clinic's or hospital's category.
          context={{ [DESIGN_TYPE_FIELD[kind]]: kind === "clinic" ? (category?.slug ?? "") : hospitalTypeFor(category?.slug ?? "") }}
          onChange={(v) => v && isThemeKey(v) && set({ themeKey: v })}
          undecided={false}
        />
        <p className="text-sm text-muted-foreground">
          Chosen: <strong className="text-ink">{theme.name}</strong>
          {category && category.defaultThemeKey === f.themeKey && " (the design for this type)"}
        </p>
        {layouts.length > 1 ? (
          <Field label="Layout" htmlFor="siteTemplateId">
            <NativeSelect id="siteTemplateId" value={f.siteTemplateId} onChange={(e) => set({ siteTemplateId: e.target.value })}>
              {options.templates
                .filter((t) => t.type === kind)
                .map((t) => (
                  <option key={t.key} value={t.key} disabled={t.status !== "ready"}>
                    {t.name}
                    {t.status !== "ready" ? " (coming soon)" : ""}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        ) : (
          <p className="text-xs text-muted-foreground">Layout: {layouts[0]?.name ?? "Classic"}. More layouts are coming.</p>
        )}
      </Group>

      <p className="flex items-start gap-2 rounded-lg bg-mist px-3 py-2 text-sm text-body">
        <IdCard className="mt-0.5 size-4 shrink-0 text-lagoon" aria-hidden />
        <span>
          The digital visiting card comes with the website design (<strong className="text-ink">{theme.name}</strong>): same colours, with Call, WhatsApp,
          Directions and Website buttons. The card page, WhatsApp image and PDFs all follow it.
        </span>
      </p>
    </fieldset>
  );
}
