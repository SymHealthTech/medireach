"use client";

import { Input } from "@/components/ui/input";
import { ChipInput, Field, NativeSelect, NumberInput } from "@/components/admin/form/fields";
import { GENDERS } from "@/lib/constants";
import { PhotoCropUpload } from "../PhotoCropUpload";
import { Group, grid2, type StepProps } from "../shared";

const GENDER_LABEL: Record<(typeof GENDERS)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not: "Prefer not to say",
};

const LANGUAGES = ["English", "Hindi", "Marathi", "Gujarati", "Kannada", "Telugu", "Tamil", "Bengali", "Urdu", "Konkani", "Malayalam", "Punjabi"];

export function BasicsStep({ form: f, set, err, readOnly }: StepProps) {
  return (
    <div className="space-y-5">
      <Group title="Name" description="Shown exactly like this on the page, card and Google.">
        <div className="grid gap-4 sm:grid-cols-[110px_1fr_1fr]">
          <Field label="Title" htmlFor="title">
            <Input id="title" value={f.title} disabled={readOnly} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="First name" htmlFor="firstName" required error={err("firstName")}>
            <Input
              id="firstName"
              value={f.firstName}
              disabled={readOnly}
              autoComplete="off"
              aria-invalid={err("firstName") ? true : undefined}
              onChange={(e) => set({ firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" required error={err("lastName")}>
            <Input
              id="lastName"
              value={f.lastName}
              disabled={readOnly}
              autoComplete="off"
              aria-invalid={err("lastName") ? true : undefined}
              onChange={(e) => set({ lastName: e.target.value })}
            />
          </Field>
        </div>
        <div className={grid2}>
          <Field label="Middle name" htmlFor="middleName">
            <Input id="middleName" value={f.middleName} disabled={readOnly} onChange={(e) => set({ middleName: e.target.value })} />
          </Field>
          <Field label="Display name (optional)" htmlFor="displayName" help="Only if different, e.g. “Dr. A. K. Shah”." error={err("displayName")}>
            <Input id="displayName" value={f.displayName} disabled={readOnly} onChange={(e) => set({ displayName: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Photo">
        <PhotoCropUpload value={f.photo} disabled={readOnly} onChange={(photo) => set({ photo })} />
      </Group>

      <Group title="Other details">
        <div className={grid2}>
          <Field label="Gender" htmlFor="gender">
            <NativeSelect id="gender" value={f.gender} disabled={readOnly} onChange={(e) => set({ gender: e.target.value as typeof f.gender })}>
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="In practice since (year)" htmlFor="practiceSinceYear" help="Shown as “In practice since 2009”." error={err("practiceSinceYear")}>
            <NumberInput id="practiceSinceYear" maxLength={4} value={f.practiceSinceYear} disabled={readOnly} onChange={(practiceSinceYear) => set({ practiceSinceYear })} />
          </Field>
        </div>
        <Field label="Languages spoken" htmlFor="languages">
          <ChipInput disabled={readOnly} id="languages" value={f.languages} onChange={(languages) => set({ languages })} suggestions={LANGUAGES} placeholder="Type a language and press Enter" />
        </Field>
      </Group>
    </div>
  );
}
