"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/form/fields";
import { MasterSelect } from "@/components/admin/form/MasterSelect";
import { ImageUpload } from "@/components/admin/form/ImageUpload";
import { FormNote, SuggestionChips } from "@/components/admin/form/Suggestions";
import { PhotoCropUpload } from "@/components/admin/doctor-editor/PhotoCropUpload";
import { RichTextEditor } from "@/components/admin/doctor-editor/RichTextEditor";
import { Group, grid2 } from "@/components/admin/doctor-editor/shared";
import { LIMITS } from "@/lib/constants";
import { DEFAULT_CLINIC_THEME, DEFAULT_HOSPITAL_THEME } from "@/themes/specialty";
import type { EStepProps } from "../shared";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Basics, laid out like the doctor editor's: name and type, short texts,
 * logo and cover, about. The kind (clinic or hospital) is fixed by the
 * "New clinic" / "New hospital" button; designs and the visiting card are in
 * the Design step.
 */
export function BasicsStep({ form: f, set, err, options, readOnly, hints }: EStepProps) {
  const hospital = f.kind === "hospital";
  const what = hospital ? "hospital" : "clinic";
  const categories = options.categories.filter((c) => c.kind === f.kind);
  const category = options.categories.find((c) => c.id === f.categoryId);
  const area = options.areas.find((a) => a.id === f.address.areaId)?.name;
  const city = options.cities.find((c) => c.id === f.address.cityId)?.name;

  /** Changing the category moves the design to the category's default, unless one was picked by hand (the server does the same). */
  function pickCategory(id: string) {
    const next = options.categories.find((c) => c.id === id);
    if (!next) return set({ categoryId: id }); // just added: it keeps the current design
    set((prev) => {
      const prevDefault = options.categories.find((c) => c.id === prev.categoryId)?.defaultThemeKey;
      const untouched = !prev.categoryId || prev.themeKey === prevDefault || prev.themeKey === DEFAULT_CLINIC_THEME || prev.themeKey === DEFAULT_HOSPITAL_THEME;
      return { categoryId: id, ...(untouched ? { themeKey: next.defaultThemeKey } : {}) };
    });
  }

  // Ready-made factual lines from what is already filled in.
  const typeName = category?.name ?? (hospital ? "Hospital" : "Clinic");
  const place = [area, city].filter(Boolean).join(", ");
  const since = hints?.yearStarted && /^\d{4}$/.test(hints.yearStarted) ? hints.yearStarted : "";
  const taglineIdeas = [hints?.tagline ?? "", place ? `${typeName} in ${place}${since ? ` since ${since}` : ""}` : "", since ? `Caring for patients since ${since}` : ""].filter(Boolean);
  const descIdeas = [
    hints?.tagline && place ? `${hints.tagline}. ${f.name ? `${f.name}, ` : ""}${place}.` : "",
    place ? `${f.name || typeName} is a ${typeName.toLowerCase()} in ${place}${since ? `, open since ${since}` : ""}. See timings, services, doctors and directions.` : "",
  ]
    .filter(Boolean)
    .map((x) => x.slice(0, LIMITS.shortBio));
  const awards = hints?.awards ?? [];

  return (
    <div className="space-y-5">
      <Group title="Name and type" description="Shown exactly like this on the site, the visiting card and Google.">
        <div className={grid2}>
          <Field label="Name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
            <Input id="name" value={f.name} disabled={readOnly} placeholder={hospital ? "e.g. Sai Care Hospital" : "e.g. Shree Skin Clinic"} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field
            label={hospital ? "Type of hospital" : "Type of clinic"}
            htmlFor="categoryId"
            required
            error={err("categoryId")}
            help={`Used in the Google title, e.g. “${hospital ? "Hospital" : "Skin Clinic"} in Baner”. Not listed? Type it to add it.`}
          >
            <MasterSelect
              id="categoryId"
              kind="category"
              noun={hospital ? "hospital type" : "clinic type"}
              value={f.categoryId}
              options={categories}
              scope={{ establishmentKind: f.kind, themeKey: f.themeKey }}
              disabled={readOnly}
              invalid={Boolean(err("categoryId"))}
              hint={hints?.category}
              onChange={pickCategory}
            />
          </Field>
          <Field label="Tagline (optional)" htmlFor="tagline" error={err("tagline")} help="Factual, e.g. “Skin and hair care in Baner since 2012”.">
            <Input id="tagline" maxLength={120} value={f.tagline} disabled={readOnly} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          {!f.tagline && taglineIdeas.length > 0 && (
            <div className="sm:col-span-2">
              <SuggestionChips single label="Use" items={taglineIdeas.map((x) => x.slice(0, 120))} have={[]} disabled={readOnly} onAdd={([tagline]) => set({ tagline })} />
            </div>
          )}
          <Field
            label="Short description"
            htmlFor="shortDescription"
            error={err("shortDescription")}
            help={`${f.shortDescription.length}/${LIMITS.shortBio} · Shown in Google results.`}
            className="sm:col-span-2"
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
          {!f.shortDescription && descIdeas.length > 0 && (
            <div className="sm:col-span-2">
              <SuggestionChips single label="Use" items={descIdeas} have={[]} disabled={readOnly} onAdd={([shortDescription]) => set({ shortDescription })} />
            </div>
          )}
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

      <Group title={`About the ${what}`} description="Facts only: what you offer, since when, who runs it. No claims or comparisons.">
        {hints && (since || awards.length > 0) && (
          <FormNote
            action={
              awards.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={readOnly || f.about.includes(escapeHtml(awards[0]!))}
                  onClick={() =>
                    set((p) => ({ about: `${p.about}<p><strong>Accreditations and awards</strong></p><ul>${awards.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` }))
                  }
                >
                  Add awards to About
                </Button>
              )
            }
          >
            Website form {hints.ref}:{since && <> started in <strong>{since}</strong>.</>}
            {awards.length > 0 && <> Accreditations and awards: {awards.join("; ")}.</>}
          </FormNote>
        )}
        <Field label="About (optional)" htmlFor="about" error={err("about")}>
          <RichTextEditor id="about" value={f.about} disabled={readOnly} invalid={Boolean(err("about"))} onChange={(about) => set({ about })} />
        </Field>
      </Group>
    </div>
  );
}
