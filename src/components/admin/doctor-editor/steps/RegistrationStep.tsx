"use client";

import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect, NumberInput } from "@/components/admin/form/fields";
import { addMaster, MasterSelect, useMasterOptions } from "@/components/admin/form/MasterSelect";
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

export function RegistrationStep({ form: f, set, err, options, readOnly, hints }: StepProps) {
  const reg = f.registration;
  const setReg = (patch: Partial<typeof reg>) => set((f) => ({ registration: { ...f.registration, ...patch } }));
  const degrees = useMasterOptions("degree", options.degrees);
  const [filling, setFilling] = useState(false);
  const formQuals = hints?.qualifications ?? [];

  /** Add the website form's qualifications as rows (degrees not in the list are added to it). */
  async function fillFromForm() {
    setFilling(true);
    try {
      const rows: typeof f.qualifications = [];
      for (const q of formQuals) {
        const d = await addMaster("degree", q.degree, undefined, degrees);
        if (!d) return;
        rows.push({ degreeId: d.id, specialization: q.specialization, institute: q.institute, year: q.year });
      }
      set((f) => {
        const fresh = rows.filter((r) => !f.qualifications.some((q) => q.degreeId === r.degreeId && q.specialization === r.specialization));
        return { qualifications: [...f.qualifications, ...fresh].slice(0, 12) };
      });
      toast.success(`Added ${rows.length} qualification${rows.length === 1 ? "" : "s"} from the website form.`);
    } finally {
      setFilling(false);
    }
  }

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
          {f.systemOfMedicine === "other" && (
            <Field label="Please specify" htmlFor="systemOther" required help={hints?.systemOther ? `Website form: ${hints.systemOther}` : undefined}>
              <Input
                id="systemOther"
                value={f.systemOther}
                maxLength={80}
                placeholder="e.g. Naturopathy, Yoga, Sowa-Rigpa"
                disabled={readOnly}
                onChange={(e) => set({ systemOther: e.target.value })}
              />
            </Field>
          )}
          <Field label="Council / board" htmlFor="registration.councilId" required error={err("registration.councilId")}>
            <MasterSelect
              id="registration.councilId"
              kind="council"
              noun="council or board"
              value={reg.councilId}
              options={options.councils}
              disabled={readOnly}
              invalid={Boolean(err("registration.councilId"))}
              hint={hints?.council}
              onChange={(councilId) => setReg({ councilId })}
            />
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

      <Group title="Qualifications" description="Degrees, in the order you want them shown. Not in the list? Choose “Other” to add it.">
        <div className="space-y-3">
          {hints && hints.qualificationLines.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg bg-sage/60 p-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <ClipboardList className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Website form {hints.ref}</p>
                  <ul className="mt-0.5 text-muted-foreground">
                    {hints.qualificationLines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {formQuals.length > 0 && (
                <Button type="button" variant="outline" size="sm" disabled={readOnly || filling} onClick={() => void fillFromForm()} className="shrink-0">
                  {filling && <Loader2 className="animate-spin" />} Fill from website form
                </Button>
              )}
            </div>
          )}
          {f.qualifications.map((q, i) => (
            <RepeatItem key={i} title={`Qualification ${i + 1}`} disabled={readOnly} onRemove={() => set((f) => ({ qualifications: removeAt(f.qualifications, i) }))}>
              <div className={grid2}>
                <Field label="Degree" htmlFor={`qualifications.${i}.degreeId`} required error={err(`qualifications.${i}.degreeId`)}>
                  <MasterSelect
                    id={`qualifications.${i}.degreeId`}
                    kind="degree"
                    noun="degree"
                    value={q.degreeId}
                    options={options.degrees}
                    disabled={readOnly}
                    invalid={Boolean(err(`qualifications.${i}.degreeId`))}
                    hint={formQuals[i]?.degree}
                    onChange={(degreeId) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { degreeId }) }))}
                  />
                </Field>
                <Field label="Specialization" htmlFor={`qualifications.${i}.specialization`} help="e.g. Medicine, Paediatrics" error={err(`qualifications.${i}.specialization`)}>
                  <Input
                    id={`qualifications.${i}.specialization`}
                    value={q.specialization}
                    disabled={readOnly}
                    onChange={(e) => set((f) => ({ qualifications: updateAt(f.qualifications, i, { specialization: e.target.value }) }))}
                  />
                </Field>
                <Field label="Institute (optional)" htmlFor={`qualifications.${i}.institute`} error={err(`qualifications.${i}.institute`)}>
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
