"use client";

import { Input } from "@/components/ui/input";
import { Field, NativeSelect, NumberInput } from "@/components/admin/form/fields";
import { SYSTEMS_OF_MEDICINE } from "@/lib/constants";
import { AddButton, Group, grid2, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

const SYSTEM_LABEL: Record<(typeof SYSTEMS_OF_MEDICINE)[number], string> = {
  allopathy: "Allopathy (modern medicine)",
  ayurveda: "Ayurveda",
  homeopathy: "Homoeopathy",
  unani: "Unani",
  siddha: "Siddha",
  dental: "Dental",
  other: "Other",
};

export function RegistrationStep({ form: f, set, err, options, readOnly }: StepProps) {
  const reg = f.registration;
  const setReg = (patch: Partial<typeof reg>) => set((f) => ({ registration: { ...f.registration, ...patch } }));

  return (
    <div className="space-y-5">
      <Group title="Registration" description="Council and number are required to publish, and are shown on the page.">
        <div className={grid2}>
          <Field label="System of medicine" htmlFor="systemOfMedicine">
            <NativeSelect
              id="systemOfMedicine"
              value={f.systemOfMedicine}
              disabled={readOnly}
              onChange={(e) => set({ systemOfMedicine: e.target.value as typeof f.systemOfMedicine })}
            >
              {SYSTEMS_OF_MEDICINE.map((s) => (
                <option key={s} value={s}>
                  {SYSTEM_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Council / board" htmlFor="registration.councilId" required error={err("registration.councilId")}>
            <NativeSelect id="registration.councilId" value={reg.councilId} disabled={readOnly} onChange={(e) => setReg({ councilId: e.target.value })}>
              <option value="">Choose…</option>
              {options.councils.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Registration number" htmlFor="registration.number" required error={err("registration.number")}>
            <Input id="registration.number" value={reg.number} disabled={readOnly} onChange={(e) => setReg({ number: e.target.value })} />
          </Field>
          <Field label="Registration year" htmlFor="registration.year" error={err("registration.year")}>
            <NumberInput id="registration.year" maxLength={4} value={reg.year} disabled={readOnly} onChange={(year) => setReg({ year })} />
          </Field>
          <Field label="NMR ID (optional)" htmlFor="registration.nmrId" help="National Medical Register ID, if the doctor has one.">
            <Input id="registration.nmrId" value={reg.nmrId} disabled={readOnly} onChange={(e) => setReg({ nmrId: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Qualifications" description="Degrees, in the order you want them shown.">
        <div className="space-y-3">
          {f.qualifications.map((q, i) => (
            <RepeatItem key={i} title={`Qualification ${i + 1}`} disabled={readOnly} onRemove={() => set((f) => ({ qualifications: removeAt(f.qualifications, i) }))}>
              <div className={grid2}>
                <Field label="Degree" htmlFor={`qualifications.${i}.degreeId`} required error={err(`qualifications.${i}.degreeId`)}>
                  <NativeSelect
                    id={`qualifications.${i}.degreeId`}
                    value={q.degreeId}
                    disabled={readOnly}
                    onChange={(e) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { degreeId: e.target.value }) }))}
                  >
                    <option value="">Choose…</option>
                    {options.degrees.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Specialization" htmlFor={`qualifications.${i}.specialization`} help="e.g. Medicine, Paediatrics" error={err(`qualifications.${i}.specialization`)}>
                  <Input
                    id={`qualifications.${i}.specialization`}
                    value={q.specialization}
                    disabled={readOnly}
                    onChange={(e) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { specialization: e.target.value }) }))}
                  />
                </Field>
                <Field label="Institute" htmlFor={`qualifications.${i}.institute`} required error={err(`qualifications.${i}.institute`)}>
                  <Input
                    id={`qualifications.${i}.institute`}
                    value={q.institute}
                    disabled={readOnly}
                    onChange={(e) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { institute: e.target.value }) }))}
                  />
                </Field>
                <Field label="Year" htmlFor={`qualifications.${i}.year`} error={err(`qualifications.${i}.year`)}>
                  <NumberInput
                    id={`qualifications.${i}.year`}
                    maxLength={4}
                    value={q.year}
                    disabled={readOnly}
                    onChange={(year) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { year }) }))}
                  />
                </Field>
              </div>
            </RepeatItem>
          ))}
          <AddButton
            disabled={readOnly || f.qualifications.length >= 12}
            onClick={() => set((f) => ({ qualifications: [...f.qualifications, { degreeId: "", specialization: "", institute: "", year: undefined }] }))}
          >
            Add qualification
          </AddButton>
        </div>
      </Group>
    </div>
  );
}
