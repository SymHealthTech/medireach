"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { CardStylePicker, DesignPicker } from "@/components/intake/DesignPickers";
import { Group } from "@/components/admin/doctor-editor/shared";
import { CARD_STYLES_BY_GROUP, findCardStyle } from "@/lib/cards/styles";
import { DESIGN_GROUPS, DESIGN_TYPE_FIELD, INTAKE_SECTIONS } from "@/lib/intake/form";
import { getTheme, isThemeKey, type ThemeKey } from "@/themes/specialty";
import { ThemePicker } from "../ThemePicker";
import type { EStepProps } from "../shared";

// The same pickers as the website forms and the homepage (Get started → Clinic / Hospital).
const fieldsFor = (kind: "clinic" | "hospital") => {
  const design = INTAKE_SECTIONS[kind].find((s) => s.key === "design")!.fields;
  return { website: design.find((x) => x.key === "websiteDesign")!, card: design.find((x) => x.key === "cardStyle")! };
};

/** Website design and visiting card (moved out of Basics, as in the doctor editor). */
export function DesignStep({ form: f, set, options, readOnly, hints, cardFaces }: EStepProps) {
  const kind = f.kind;
  const { website, card } = fieldsFor(kind);
  const category = options.categories.find((c) => c.id === f.categoryId);
  const theme = getTheme(f.themeKey, kind);
  const layouts = options.templates.filter((t) => t.type === kind && t.status === "ready");
  const cardLayouts = options.templates.filter((t) => t.type === "card" && t.status === "ready");
  const picked = f.cardStyle ? findCardStyle(f.cardStyle) : undefined;
  // An older pick from the other list (clinic vs hospital styles) stays visible.
  const otherGroup = picked && picked.group !== kind && picked.group !== "doctor" ? picked.group : undefined;

  const formDesign = hints?.websiteDesign && isThemeKey(hints.websiteDesign) ? getTheme(hints.websiteDesign, kind).name : undefined;
  const formCard = hints?.cardStyle ? findCardStyle(hints.cardStyle) : undefined;
  const canUseForm = (formDesign && hints?.websiteDesign !== f.themeKey) || (formCard && formCard.code !== f.cardStyle);

  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {hints && (formDesign || formCard || hints.designDecision) && (
        <div className="flex flex-col gap-2 rounded-lg bg-sage/60 px-3 py-2 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ClipboardList className="size-4 shrink-0" aria-hidden />
            <span>
              Website form {hints.ref}: website <strong>{formDesign ?? "not decided"}</strong>, card <strong>{formCard ? `${formCard.name} (${formCard.code})` : "not decided"}</strong>
              {hints.designDecision === "discuss" ? " · Not final: talk to them first." : hints.designDecision === "final" ? " · Final choice." : ""}
            </span>
          </p>
          {canUseForm && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() =>
                set({
                  ...(formDesign ? { themeKey: hints.websiteDesign as ThemeKey } : {}),
                  ...(formCard && CARD_STYLES_BY_GROUP[kind].some((c) => c.code === formCard.code) ? { cardStyle: formCard.code } : {}),
                })
              }
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
          // The picker opens on the type: the clinic's category, or the hospital type from the website form.
          context={{ [DESIGN_TYPE_FIELD[kind]]: kind === "clinic" ? (category?.slug ?? "") : (DESIGN_GROUPS.hospital.find((g) => g.label === hints?.category)?.value ?? "") }}
          onChange={(v) => v && isThemeKey(v) && set({ themeKey: v })}
          undecided={false}
        />
        <p className="text-sm text-muted-foreground">
          Chosen: <strong className="text-ink">{theme.name}</strong>
          {category && category.defaultThemeKey === f.themeKey && " (the design for this type)"}
        </p>
        <details className="rounded-lg border border-line bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">All specialty designs</summary>
          <div className="mt-3">
            <ThemePicker value={f.themeKey} onChange={(themeKey) => set({ themeKey })} disabled={readOnly} siteName={f.name} {...(category ? { recommended: category.defaultThemeKey } : {})} />
          </div>
        </details>
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

      <Group title="Visiting card" description="View shows the phone and print card. The card page, WhatsApp image and print PDF all use the chosen colours.">
        <CardStylePicker id="cardStyle" field={card} value={f.cardStyle} onChange={(code) => code && set({ cardStyle: code })} cardFaces={cardFaces} undecided={false} />
        {otherGroup && (
          <p className="text-sm text-clay-text">
            Current card {picked!.name} ({picked!.code}) is a {otherGroup} style. Pick one above to switch.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {picked ? (
            <>
              <span>
                Chosen: <strong className="text-ink">{picked.name}</strong> <span className="font-mono">{picked.code}</span>
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={() => set({ cardStyle: "" })}>
                Use the website design&apos;s colours instead
              </Button>
            </>
          ) : (
            <span>Default: the card uses the colours of the website design ({theme.name}).</span>
          )}
        </div>
        {cardLayouts.length > 1 ? (
          <Field label="Card layout" htmlFor="cardTemplateId">
            <NativeSelect id="cardTemplateId" value={f.cardTemplateId} onChange={(e) => set({ cardTemplateId: e.target.value })}>
              {options.templates
                .filter((t) => t.type === "card")
                .map((t) => (
                  <option key={t.key} value={t.key} disabled={t.status !== "ready"}>
                    {t.name}
                    {t.status !== "ready" ? " (coming soon)" : ""}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        ) : (
          <p className="text-xs text-muted-foreground">Card layout: {cardLayouts[0]?.name ?? "Classic"}. More layouts are coming.</p>
        )}
      </Group>
    </fieldset>
  );
}
