"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipInput, Field, NativeSelect } from "@/components/admin/form/fields";
import { AddButton, Group, grid2, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

export function PracticeStep({ form: f, set, err, options, readOnly }: StepProps) {
  const secondary = new Set(f.secondarySpecialtyIds);
  return (
    <div className="space-y-5">
      <Group title="Practice">
        <div className={grid2}>
          <Field label="Practitioner type" htmlFor="practitionerType">
            <NativeSelect
              id="practitionerType"
              value={f.practitionerType}
              disabled={readOnly}
              onChange={(e) => set({ practitionerType: e.target.value as typeof f.practitionerType })}
            >
              <option value="gp">General practitioner</option>
              <option value="consultant">Consultant / specialist</option>
            </NativeSelect>
          </Field>
          <Field
            label="Primary specialty"
            htmlFor="primarySpecialtyId"
            required
            help="Used in the page title and address: dr-name-specialty."
            error={err("primarySpecialtyId")}
          >
            <NativeSelect
              id="primarySpecialtyId"
              value={f.primarySpecialtyId}
              disabled={readOnly}
              onChange={(e) =>
                set({
                  primarySpecialtyId: e.target.value,
                  secondarySpecialtyIds: f.secondarySpecialtyIds.filter((x) => x !== e.target.value),
                })
              }
            >
              <option value="">Choose…</option>
              {options.specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <details className="rounded-lg border border-line bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Secondary specialties {f.secondarySpecialtyIds.length > 0 && `(${f.secondarySpecialtyIds.length})`}
          </summary>
          <p className="mt-1 text-xs text-muted-foreground">Up to 5. The doctor will also be listed on these specialty pages.</p>
          <ul className="mt-3 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
            {options.specialties
              .filter((s) => s.id !== f.primarySpecialtyId)
              .map((s) => (
                <li key={s.id}>
                  <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                    <Checkbox
                      checked={secondary.has(s.id)}
                      disabled={readOnly || (!secondary.has(s.id) && secondary.size >= 5)}
                      onCheckedChange={(on) =>
                        set({
                          secondarySpecialtyIds: on
                            ? [...f.secondarySpecialtyIds, s.id]
                            : f.secondarySpecialtyIds.filter((x) => x !== s.id),
                        })
                      }
                    />
                    {s.name}
                  </label>
                </li>
              ))}
          </ul>
        </details>
      </Group>

      <Group title="Services" description="What the doctor offers, e.g. “Diabetes care”, “Vaccination”. Factual — no claims.">
        <div className="space-y-3">
          {f.services.map((sv, i) => (
            <RepeatItem key={i} title={`Service ${i + 1}`} disabled={readOnly} onRemove={() => set({ services: removeAt(f.services, i) })}>
              <div className={grid2}>
                <Field label="Name" htmlFor={`services.${i}.name`} required error={err(`services.${i}.name`)}>
                  <Input
                    id={`services.${i}.name`}
                    value={sv.name}
                    disabled={readOnly}
                    onChange={(e) => set({ services: updateAt(f.services, i, { name: e.target.value }) })}
                  />
                </Field>
                <Field label="Short description (optional)" htmlFor={`services.${i}.description`} error={err(`services.${i}.description`)}>
                  <Input
                    id={`services.${i}.description`}
                    value={sv.description}
                    disabled={readOnly}
                    onChange={(e) => set({ services: updateAt(f.services, i, { description: e.target.value }) })}
                  />
                </Field>
              </div>
            </RepeatItem>
          ))}
          <AddButton disabled={readOnly || f.services.length >= 30} onClick={() => set({ services: [...f.services, { name: "", description: "" }] })}>
            Add service
          </AddButton>
        </div>
      </Group>

      <Group title="Conditions treated (optional)">
        <Field label="Conditions" htmlFor="conditionsTreated" error={f.conditionsTreated.map((_, i) => err(`conditionsTreated.${i}`)).find(Boolean)}>
          <ChipInput
            disabled={readOnly}
            id="conditionsTreated"
            value={f.conditionsTreated}
            onChange={(conditionsTreated) => set({ conditionsTreated })}
            placeholder="e.g. Diabetes, Asthma — press Enter after each"
            max={40}
          />
        </Field>
      </Group>
    </div>
  );
}
