"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput, Field, NumberInput } from "@/components/admin/form/fields";
import { LIMITS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { GalleryEditor } from "../GalleryEditor";
import { SimpleImageUpload } from "../PhotoCropUpload";
import { RichTextEditor } from "../RichTextEditor";
import { AddButton, Group, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

const INTERESTS = ["Marathon runner", "Classical music", "Cycling", "Photography", "Yoga", "Trekking", "Reading", "Cricket"];

export function AboutStep({ form: f, set, err, readOnly }: StepProps) {
  const awardPhotos = f.awards.filter((a) => a.photo).length;
  const galleryRoom = LIMITS.galleryMax - awardPhotos;
  const bioLen = f.shortBio.length;

  return (
    <div className="space-y-5">
      <Group title="About" description="Factual only: no “best”, “No. 1”, guarantees, success rates or patient counts.">
        <Field
          label="Short bio"
          htmlFor="shortBio"
          help={<span className={cn(bioLen > LIMITS.shortBio && "text-clay")}>{bioLen}/{LIMITS.shortBio} — also used as the Google description.</span>}
          error={err("shortBio")}
        >
          <Textarea
            id="shortBio"
            rows={2}
            maxLength={LIMITS.shortBio + 20}
            value={f.shortBio}
            disabled={readOnly}
            aria-invalid={err("shortBio") ? true : undefined}
            onChange={(e) => set({ shortBio: e.target.value })}
          />
        </Field>
        <Field label="Full bio" htmlFor="fullBio" help="Bold, italic and lists only." error={err("fullBio")}>
          <RichTextEditor id="fullBio" value={f.fullBio} disabled={readOnly} invalid={Boolean(err("fullBio"))} onChange={(fullBio) => set({ fullBio })} />
        </Field>
      </Group>

      <Group title="Awards" description="Each award needs a title, the awarding body and the year.">
        <div className="space-y-3">
          {f.awards.map((a, i) => (
            <RepeatItem key={i} title={`Award ${i + 1}`} disabled={readOnly} onRemove={() => set({ awards: removeAt(f.awards, i) })}>
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                <Field label="Title" htmlFor={`awards.${i}.title`} required error={err(`awards.${i}.title`)}>
                  <Input id={`awards.${i}.title`} value={a.title} disabled={readOnly} onChange={(e) => set({ awards: updateAt(f.awards, i, { title: e.target.value }) })} />
                </Field>
                <Field label="Awarding body" htmlFor={`awards.${i}.awardingBody`} required error={err(`awards.${i}.awardingBody`)}>
                  <Input id={`awards.${i}.awardingBody`} value={a.awardingBody} disabled={readOnly} onChange={(e) => set({ awards: updateAt(f.awards, i, { awardingBody: e.target.value }) })} />
                </Field>
                <Field label="Year" htmlFor={`awards.${i}.year`} required error={err(`awards.${i}.year`)}>
                  <NumberInput id={`awards.${i}.year`} maxLength={4} value={a.year} disabled={readOnly} onChange={(year) => set({ awards: updateAt(f.awards, i, { year }) })} />
                </Field>
              </div>
              <SimpleImageUpload
                purpose="award"
                label="Add award photo"
                value={a.photo}
                disabled={readOnly || (!a.photo && f.gallery.length + awardPhotos >= LIMITS.galleryMax)}
                onChange={(photo) => set({ awards: updateAt(f.awards, i, { photo }) })}
              />
            </RepeatItem>
          ))}
          <AddButton disabled={readOnly || f.awards.length >= 15} onClick={() => set({ awards: [...f.awards, { title: "", awardingBody: "", year: undefined }] })}>
            Add award
          </AddButton>
        </div>
      </Group>

      <Group title="Memberships">
        <div className="space-y-3">
          {f.memberships.map((m, i) => (
            <RepeatItem key={i} title={`Membership ${i + 1}`} disabled={readOnly} onRemove={() => set({ memberships: removeAt(f.memberships, i) })}>
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field label="Organisation" htmlFor={`memberships.${i}.name`} required error={err(`memberships.${i}.name`)}>
                  <Input id={`memberships.${i}.name`} value={m.name} disabled={readOnly} onChange={(e) => set({ memberships: updateAt(f.memberships, i, { name: e.target.value }) })} />
                </Field>
                <Field label="Member since" htmlFor={`memberships.${i}.since`}>
                  <NumberInput id={`memberships.${i}.since`} maxLength={4} value={m.since} disabled={readOnly} onChange={(since) => set({ memberships: updateAt(f.memberships, i, { since }) })} />
                </Field>
              </div>
            </RepeatItem>
          ))}
          <AddButton disabled={readOnly || f.memberships.length >= 15} onClick={() => set({ memberships: [...f.memberships, { name: "", since: undefined }] })}>
            Add membership
          </AddButton>
        </div>
      </Group>

      <Group title="Publications (optional)">
        <div className="space-y-3">
          {f.publications.map((p, i) => (
            <RepeatItem key={i} title={`Publication ${i + 1}`} disabled={readOnly} onRemove={() => set({ publications: removeAt(f.publications, i) })}>
              <Field label="Title" htmlFor={`publications.${i}.title`} required error={err(`publications.${i}.title`)}>
                <Input id={`publications.${i}.title`} value={p.title} disabled={readOnly} onChange={(e) => set({ publications: updateAt(f.publications, i, { title: e.target.value }) })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_120px_1fr]">
                <Field label="Journal" htmlFor={`publications.${i}.journal`}>
                  <Input id={`publications.${i}.journal`} value={p.journal} disabled={readOnly} onChange={(e) => set({ publications: updateAt(f.publications, i, { journal: e.target.value }) })} />
                </Field>
                <Field label="Year" htmlFor={`publications.${i}.year`}>
                  <NumberInput id={`publications.${i}.year`} maxLength={4} value={p.year} disabled={readOnly} onChange={(year) => set({ publications: updateAt(f.publications, i, { year }) })} />
                </Field>
                <Field label="Link" htmlFor={`publications.${i}.url`} error={err(`publications.${i}.url`)}>
                  <Input id={`publications.${i}.url`} type="url" value={p.url} disabled={readOnly} onChange={(e) => set({ publications: updateAt(f.publications, i, { url: e.target.value }) })} />
                </Field>
              </div>
            </RepeatItem>
          ))}
          <AddButton
            disabled={readOnly || f.publications.length >= 20}
            onClick={() => set({ publications: [...f.publications, { title: "", journal: "", year: undefined, url: "" }] })}
          >
            Add publication
          </AddButton>
        </div>
      </Group>

      <Group title="Beyond medicine" description="Hobbies and interests, shown as chips.">
        <Field label="Interests" htmlFor="interests" error={f.interests.map((_, i) => err(`interests.${i}`)).find(Boolean)}>
          <ChipInput disabled={readOnly} id="interests" value={f.interests} onChange={(interests) => set({ interests })} suggestions={INTERESTS} max={12} placeholder="e.g. Marathon runner" />
        </Field>
      </Group>

      <Group title="Gallery" description={`Up to ${LIMITS.galleryMax} photos in total, including award photos. Drag to reorder.`}>
        <GalleryEditor value={f.gallery} maxPhotos={Math.max(0, galleryRoom)} disabled={readOnly} errorFor={err} onChange={(gallery) => set({ gallery })} />
        {err("gallery") && <p className="text-sm text-clay">{err("gallery")}</p>}
      </Group>
    </div>
  );
}
