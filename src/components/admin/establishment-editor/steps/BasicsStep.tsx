"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { ImageUpload } from "@/components/admin/form/ImageUpload";
import { PhotoCropUpload } from "@/components/admin/doctor-editor/PhotoCropUpload";
import { RichTextEditor } from "@/components/admin/doctor-editor/RichTextEditor";
import { Group, grid2 } from "@/components/admin/doctor-editor/shared";
import { LIMITS } from "@/lib/constants";
import { DEFAULT_CLINIC_THEME, DEFAULT_HOSPITAL_THEME, type ThemeKey } from "@/themes/specialty";
import { ThemePicker } from "../ThemePicker";
import type { EStepProps } from "../shared";

export function BasicsStep({ form: f, set, err, options, readOnly }: EStepProps) {
  const categories = options.categories.filter((c) => c.kind === f.kind);
  const category = options.categories.find((c) => c.id === f.categoryId);
  const designs = options.templates.filter((t) => t.type === f.kind);
  const cards = options.templates.filter((t) => t.type === "card");

  /** Changing the category moves the theme to the category's default, unless one was picked by hand. */
  function pickCategory(id: string) {
    const next = options.categories.find((c) => c.id === id);
    set((prev) => {
      const prevDefault = options.categories.find((c) => c.id === prev.categoryId)?.defaultThemeKey;
      const untouched = !prev.categoryId || prev.themeKey === prevDefault || prev.themeKey === DEFAULT_CLINIC_THEME || prev.themeKey === DEFAULT_HOSPITAL_THEME;
      return { categoryId: id, ...(next && untouched ? { themeKey: next.defaultThemeKey } : {}) };
    });
  }

  return (
    <div className="space-y-5">
      <Group title="What is it?">
        <div className={grid2}>
          <Field label="Type" htmlFor="kind" help={f.status === "published" ? "Unpublish to change the type." : "Hospitals: up to 10 beds."}>
            <NativeSelect
              id="kind"
              value={f.kind}
              disabled={readOnly || f.status === "published"}
              onChange={(e) => {
                const kind = e.target.value as typeof f.kind;
                set({ kind, categoryId: "", themeKey: kind === "hospital" ? DEFAULT_HOSPITAL_THEME : DEFAULT_CLINIC_THEME, siteTemplateId: "classic" });
              }}
            >
              <option value="clinic">Clinic</option>
              <option value="hospital">Small hospital</option>
            </NativeSelect>
          </Field>
          <Field label="Category" htmlFor="categoryId" required error={err("categoryId")} help="Used in the Google title, e.g. “Skin Clinic in Baner”.">
            <NativeSelect id="categoryId" value={f.categoryId} disabled={readOnly} onChange={(e) => pickCategory(e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
            <Input id="name" value={f.name} disabled={readOnly} placeholder="e.g. Shree Skin Clinic" onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Tagline (optional)" htmlFor="tagline" error={err("tagline")} help="Factual, e.g. “Skin and hair care in Baner since 2012”.">
            <Input id="tagline" maxLength={120} value={f.tagline} disabled={readOnly} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field
            label="Short description"
            htmlFor="shortDescription"
            error={err("shortDescription")}
            help={`${f.shortDescription.length}/${LIMITS.shortBio} · Shown in Google results.`}
          >
            <Textarea
              id="shortDescription"
              rows={2}
              maxLength={LIMITS.shortBio}
              value={f.shortDescription}
              disabled={readOnly}
              onChange={(e) => set({ shortDescription: e.target.value })}
            />
          </Field>
        </div>
        <Field label="About (optional)" htmlFor="about" error={err("about")} help="Facts only: what you offer, since when, who runs it. No claims or comparisons.">
          <RichTextEditor id="about" value={f.about} disabled={readOnly} invalid={Boolean(err("about"))} onChange={(about) => set({ about })} />
        </Field>
      </Group>

      <Group title="Specialty design" description="Colours, icon and section order made for the specialty. Every site is personalised with its own name, logo and photos.">
        <ThemePicker
          value={f.themeKey}
          onChange={(themeKey: ThemeKey) => set({ themeKey })}
          disabled={readOnly}
          siteName={f.name}
          {...(category ? { recommended: category.defaultThemeKey } : {})}
        />
        <div className={grid2}>
          <Field label="Layout" htmlFor="siteTemplateId" help="More layouts are coming; until then every site uses Classic.">
            <NativeSelect id="siteTemplateId" value={f.siteTemplateId} disabled={readOnly} onChange={(e) => set({ siteTemplateId: e.target.value })}>
              {designs.map((t) => (
                <option key={t.key} value={t.key} disabled={t.status !== "ready"}>
                  {t.name}
                  {t.status !== "ready" ? " (coming soon)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Visiting card design" htmlFor="cardTemplateId">
            <NativeSelect id="cardTemplateId" value={f.cardTemplateId} disabled={readOnly} onChange={(e) => set({ cardTemplateId: e.target.value })}>
              {cards.map((t) => (
                <option key={t.key} value={t.key} disabled={t.status !== "ready"}>
                  {t.name}
                  {t.status !== "ready" ? " (coming soon)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Group>

      <Group title="Logo and cover photo" description="Premises or signboard only. Never patients.">
        <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
          <Field label="Logo (square)">
            <PhotoCropUpload value={f.logo} onChange={(logo) => set({ logo })} disabled={readOnly} purpose="logo" />
          </Field>
          <Field label="Cover photo (wide)">
            <ImageUpload value={f.coverPhoto} onChange={(coverPhoto) => set({ coverPhoto })} purpose="cover" disabled={readOnly} label="Upload cover" />
          </Field>
        </div>
      </Group>
    </div>
  );
}
