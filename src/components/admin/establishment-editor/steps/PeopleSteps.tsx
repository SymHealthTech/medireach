"use client";

import Link from "next/link";
import { ExternalLink, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/admin/StatusBadge";
import { ChipInput, Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { AddButton, Group, grid2, removeAt, RepeatItem, updateAt } from "@/components/admin/doctor-editor/shared";
import { LIMITS } from "@/lib/constants";
import { randomKey } from "@/lib/establishments/form";
import type { EStepProps } from "../shared";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ---------------------------------------------------------------- Doctors
export function DoctorsStep({ form: f, set, err, options, readOnly }: EStepProps) {
  const linked = new Set(f.doctors.map((d) => d.doctorProfileId).filter(Boolean));
  const doctorById = new Map(options.doctors.map((d) => [d.id, d]));
  return (
    <div className="space-y-5">
      <Group
        title="Doctors"
        description="Link doctors who have a MediReach portfolio (their cards link to it, and their page links back here). Doctors without one can be added by name."
      >
        {f.doctors.map((d, i) => {
          const p = `doctors.${i}`;
          const profile = d.doctorProfileId ? doctorById.get(d.doctorProfileId) : undefined;
          return (
            <RepeatItem key={d.key} title={profile?.name || d.name || `Doctor ${i + 1}`} disabled={readOnly} onRemove={() => set((prev) => ({ doctors: removeAt(prev.doctors, i) }))}>
              <div className={grid2}>
                <Field label="MediReach portfolio" htmlFor={`${p}.doctorProfileId`} error={err(`${p}.doctorProfileId`)}>
                  <NativeSelect
                    id={`${p}.doctorProfileId`}
                    value={d.doctorProfileId}
                    disabled={readOnly}
                    onChange={(e) => set((prev) => ({ doctors: updateAt(prev.doctors, i, { doctorProfileId: e.target.value }) }))}
                  >
                    <option value="">None (add by name below)</option>
                    {options.doctors
                      .filter((x) => x.id === d.doctorProfileId || !linked.has(x.id))
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                          {x.specialty ? ` · ${x.specialty}` : ""}
                          {x.status !== "published" ? ` (${x.status})` : ""}
                        </option>
                      ))}
                  </NativeSelect>
                </Field>
                <Field label="Role at this site (optional)" htmlFor={`${p}.role`} error={err(`${p}.role`)} help="e.g. Consultant, Medical director, Visiting">
                  <Input id={`${p}.role`} value={d.role} disabled={readOnly} onChange={(e) => set((prev) => ({ doctors: updateAt(prev.doctors, i, { role: e.target.value }) }))} />
                </Field>
                {!d.doctorProfileId && (
                  <>
                    <Field label="Name" htmlFor={`${p}.name`} required error={err(`${p}.name`)}>
                      <Input id={`${p}.name`} value={d.name} placeholder="Dr. …" disabled={readOnly} onChange={(e) => set((prev) => ({ doctors: updateAt(prev.doctors, i, { name: e.target.value }) }))} />
                    </Field>
                    <Field label="Qualifications" htmlFor={`${p}.qualifications`}>
                      <Input id={`${p}.qualifications`} value={d.qualifications} placeholder="MBBS, MD" disabled={readOnly} onChange={(e) => set((prev) => ({ doctors: updateAt(prev.doctors, i, { qualifications: e.target.value }) }))} />
                    </Field>
                    <Field label="Specialty" htmlFor={`${p}.specialty`}>
                      <Input id={`${p}.specialty`} value={d.specialty} disabled={readOnly} onChange={(e) => set((prev) => ({ doctors: updateAt(prev.doctors, i, { specialty: e.target.value }) }))} />
                    </Field>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {profile ? (
                  <>
                    <Pill tone={profile.status === "published" ? "leaf" : "muted"}>{profile.status === "published" ? "Portfolio live" : `Portfolio ${profile.status}`}</Pill>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/doctors/${profile.id}`} target="_blank">
                        <ExternalLink /> Open portfolio
                      </Link>
                    </Button>
                  </>
                ) : (
                  f.id && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/doctors/new?establishment=${f.id}`} target="_blank">
                        <UserPlus /> Create portfolio for this doctor ({rupees(options.prices.doctorAddon)} add-on)
                      </Link>
                    </Button>
                  )
                )}
              </div>
            </RepeatItem>
          );
        })}
        {err("doctors") && <p className="text-sm text-clay-text">{err("doctors")}</p>}
        <AddButton
          disabled={readOnly}
          onClick={() => set((prev) => ({ doctors: [...prev.doctors, { key: randomKey(), doctorProfileId: "", name: "", qualifications: "", specialty: "", role: "" }] }))}
        >
          Add doctor
        </AddButton>
        {!f.id && <p className="text-xs text-muted-foreground">Save the name first to create portfolios from here.</p>}
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Registration + hospital extras
export function ExtrasStep({ form: f, set, err, options, readOnly }: EStepProps) {
  const hospital = f.kind === "hospital";
  const team = f.doctors.filter((d) => d.doctorProfileId);
  const doctorName = (id: string) => options.doctors.find((d) => d.id === id)?.name ?? "Doctor";
  const bedSum = f.beds.types.reduce((n, b) => n + (b.count ?? 0), 0);

  return (
    <div className="space-y-5">
      <Group
        title="Registration / licence"
        description={hospital ? "Required to publish a hospital site (e.g. nursing home registration under the Maharashtra Nursing Homes Act)." : "Optional for clinics. Shown in the footer if provided."}
      >
        <div className={grid2}>
          <Field label="Authority" htmlFor="registration.authority" required={hospital} error={err("registration.authority")} help="e.g. Pune Municipal Corporation">
            <Input id="registration.authority" value={f.registration.authority} disabled={readOnly} onChange={(e) => set((p) => ({ registration: { ...p.registration, authority: e.target.value } }))} />
          </Field>
          <Field label="Registration number" htmlFor="registration.number" required={hospital} error={err("registration.number")}>
            <Input id="registration.number" value={f.registration.number} disabled={readOnly} onChange={(e) => set((p) => ({ registration: { ...p.registration, number: e.target.value } }))} />
          </Field>
        </div>
      </Group>

      <Group title="Insurance and cashless" description="Factual list of insurers/TPAs you work with.">
        <SwitchField label="Cashless treatment available" checked={f.insurance.cashless} disabled={readOnly} onCheckedChange={(cashless) => set((p) => ({ insurance: { ...p.insurance, cashless } }))} />
        <Field label="Insurers and TPAs" htmlFor="insurance.providers">
          <ChipInput
            id="insurance.providers"
            value={f.insurance.providers}
            onChange={(providers) => set((p) => ({ insurance: { ...p.insurance, providers } }))}
            placeholder="Type a name and press Enter"
            max={60}
            disabled={readOnly}
          />
        </Field>
      </Group>

      {hospital && (
        <>
          <Group title="Beds" description={`Number and types, factual. This plan covers hospitals up to ${LIMITS.hospitalBedsMax} beds.`}>
            <Field label="Total beds" htmlFor="beds.total" error={err("beds.total")} help={f.beds.types.length ? `Types add up to ${bedSum}.` : undefined}>
              <NumberInput id="beds.total" value={f.beds.total} disabled={readOnly} onChange={(total) => set((p) => ({ beds: { ...p.beds, total } }))} />
            </Field>
            {f.beds.types.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_auto] items-end gap-2">
                <Field label={i === 0 ? "Bed type" : ""} htmlFor={`beds.types.${i}.type`}>
                  <Input id={`beds.types.${i}.type`} value={b.type} placeholder="e.g. General, Private, ICU" disabled={readOnly} onChange={(e) => set((p) => ({ beds: { ...p.beds, types: updateAt(p.beds.types, i, { type: e.target.value }) } }))} />
                </Field>
                <Field label={i === 0 ? "Count" : ""} htmlFor={`beds.types.${i}.count`}>
                  <NumberInput id={`beds.types.${i}.count`} value={b.count} disabled={readOnly} onChange={(count) => set((p) => ({ beds: { ...p.beds, types: updateAt(p.beds.types, i, { count }) } }))} />
                </Field>
                <Button type="button" variant="ghost" disabled={readOnly} className="text-clay-text" onClick={() => set((p) => ({ beds: { ...p.beds, types: removeAt(p.beds.types, i) } }))}>
                  Remove
                </Button>
              </div>
            ))}
            <AddButton disabled={readOnly} onClick={() => set((p) => ({ beds: { ...p.beds, types: [...p.beds.types, { type: "", count: undefined }] } }))}>
              Add bed type
            </AddButton>
          </Group>

          <Group title="Departments" description="Each department lists its doctors (from the Doctors step, with a portfolio).">
            {f.departments.map((dep, i) => (
              <RepeatItem key={dep.key} title={dep.name || `Department ${i + 1}`} disabled={readOnly} onRemove={() => set((p) => ({ departments: removeAt(p.departments, i) }))}>
                <div className={grid2}>
                  <Field label="Name" htmlFor={`departments.${i}.name`} required error={err(`departments.${i}.name`)}>
                    <Input id={`departments.${i}.name`} value={dep.name} disabled={readOnly} onChange={(e) => set((p) => ({ departments: updateAt(p.departments, i, { name: e.target.value }) }))} />
                  </Field>
                  <Field label="Description (optional)" htmlFor={`departments.${i}.description`} error={err(`departments.${i}.description`)}>
                    <Textarea id={`departments.${i}.description`} rows={2} value={dep.description} disabled={readOnly} onChange={(e) => set((p) => ({ departments: updateAt(p.departments, i, { description: e.target.value }) }))} />
                  </Field>
                </div>
                {team.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Link doctors with portfolios in the Doctors step to list them here.</p>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {team.map((d) => (
                      <li key={d.doctorProfileId}>
                        <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                          <Checkbox
                            checked={dep.doctorIds.includes(d.doctorProfileId)}
                            disabled={readOnly}
                            onCheckedChange={(on) =>
                              set((p) => ({
                                departments: updateAt(p.departments, i, {
                                  doctorIds: on ? [...dep.doctorIds, d.doctorProfileId] : dep.doctorIds.filter((x) => x !== d.doctorProfileId),
                                }),
                              }))
                            }
                          />
                          {doctorName(d.doctorProfileId)}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </RepeatItem>
            ))}
            {err("departments") && <p className="text-sm text-clay-text">{err("departments")}</p>}
            <AddButton disabled={readOnly} onClick={() => set((p) => ({ departments: [...p.departments, { key: randomKey(), name: "", description: "", doctorIds: [] }] }))}>
              Add department
            </AddButton>
          </Group>

          <Group title="Visiting hours">
            <Field label="Visiting hours for patients' families" htmlFor="visitingHours" error={err("visitingHours")}>
              <Input id="visitingHours" maxLength={200} value={f.visitingHours} disabled={readOnly} placeholder="e.g. 11 am–1 pm and 5 pm–7 pm" onChange={(e) => set({ visitingHours: e.target.value })} />
            </Field>
          </Group>
        </>
      )}
      {!hospital && (
        <p className="text-sm text-muted-foreground">
          Beds, departments and visiting hours are for hospitals. Change the type in Basics if this is a hospital.
        </p>
      )}
    </div>
  );
}
