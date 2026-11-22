"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, Plus, Trash2, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/admin/StatusBadge";
import { ChipInput, Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { AddButton, Group, grid2, removeAt, RepeatItem, updateAt } from "@/components/admin/doctor-editor/shared";
import { PhotoCropUpload } from "@/components/admin/doctor-editor/PhotoCropUpload";
import { RoleSelect, SelectOther, SuggestionChips } from "@/components/admin/form/Suggestions";
import { LIMITS } from "@/lib/constants";
import { randomKey, type EstablishmentForm } from "@/lib/establishments/form";
import type { FormSiteDoctor } from "@/lib/intake/hints";
import { blankRow, rowHasContent, ROWS, rowsToText, textToRows, type Row } from "@/lib/intake/rows";
import {
  BED_TYPE_SUGGESTIONS,
  DEGREE_SUGGESTIONS,
  DEPARTMENT_SUGGESTIONS,
  DESIGNATION_SUGGESTIONS,
  INSURANCE_SUGGESTIONS,
  REG_AUTHORITY_SUGGESTIONS,
  VISITING_HOURS_SUGGESTIONS,
} from "@/lib/suggestions";
import type { EStepProps } from "../shared";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ---------------------------------------------------------------- Doctors
type SiteDoctor = EstablishmentForm["doctors"][number];
const blankSiteDoctor = (): SiteDoctor => ({ key: randomKey(), doctorProfileId: "", name: "", qualifications: "", specialty: "", role: "", profileUrl: "" });
const sameName = (a: string, b: string) => a.replace(/^dr\.?\s*/i, "").trim().toLowerCase() === b.replace(/^dr\.?\s*/i, "").trim().toLowerCase();

export function DoctorsStep({ form: f, set, err, options, readOnly, hints }: EStepProps) {
  const linked = new Set(f.doctors.map((d) => d.doctorProfileId).filter(Boolean));
  const doctorById = new Map(options.doctors.map((d) => [d.id, d]));
  const nameOf = (d: SiteDoctor) => (d.doctorProfileId ? (doctorById.get(d.doctorProfileId)?.name ?? "") : d.name);
  // Website-form doctors not on the list yet (matched by name).
  const formDoctors = (hints?.doctors ?? []).filter((x) => x.name && !f.doctors.some((d) => sameName(nameOf(d), x.name)));
  const fromForm = (x: FormSiteDoctor): SiteDoctor => {
    // Same name as a MediReach portfolio: link it (the portfolio brings photo, degrees and page).
    const profile = options.doctors.find((p) => sameName(p.name, x.name) && !linked.has(p.id));
    return profile
      ? { ...blankSiteDoctor(), doctorProfileId: profile.id, role: x.role }
      : { ...blankSiteDoctor(), name: x.name, qualifications: x.qualifications, specialty: x.specialty, role: x.role, profileUrl: x.profileUrl, ...(x.photo ? { photo: x.photo } : {}) };
  };
  const setDoctor = (i: number, patch: Partial<SiteDoctor>) => set((prev) => ({ doctors: updateAt(prev.doctors, i, patch) }));

  return (
    <div className="space-y-5">
      {formDoctors.length > 0 && (
        <div className="space-y-2 rounded-lg bg-sage/60 p-3 text-sm text-ink">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <ClipboardList className="size-4" aria-hidden /> Doctors in website form {hints?.ref}
            </p>
            {formDoctors.length > 1 && (
              <Button type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => set((prev) => ({ doctors: [...prev.doctors, ...formDoctors.map(fromForm)] }))}>
                <Plus /> Add all {formDoctors.length}
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {formDoctors.map((x, i) => (
              <li key={`${x.name}-${i}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  {x.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small Cloudinary thumbnail from the form
                    <img src={x.photo.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,g_face,w_64,h_64/")} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <UserRound className="size-8 shrink-0 rounded-full bg-card p-1.5" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <strong className="text-ink">{x.name}</strong>
                    {[x.specialty, x.qualifications, x.role, x.department && `Dept: ${x.department}`].filter(Boolean).length > 0 &&
                      ` · ${[x.specialty, x.qualifications, x.role, x.department && `Dept: ${x.department}`].filter(Boolean).join(" · ")}`}
                  </span>
                </span>
                <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={readOnly} onClick={() => set((prev) => ({ doctors: [...prev.doctors, fromForm(x)] }))}>
                  <Plus /> Add
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Group
        title="Doctors"
        description="Link doctors who have a MediReach portfolio (their cards link to it, and their page links back here). Doctors without one are added with their own details and photo."
      >
        {f.doctors.map((d, i) => {
          const p = `doctors.${i}`;
          const profile = d.doctorProfileId ? doctorById.get(d.doctorProfileId) : undefined;
          return (
            <RepeatItem key={d.key} title={profile?.name || d.name || `Doctor ${i + 1}`} disabled={readOnly} onRemove={() =>
                set((prev) => ({
                  doctors: removeAt(prev.doctors, i),
                  // They leave their departments too (the server does the same when Doctors saves).
                  departments: prev.departments.map((dep) => ({ ...dep, doctorIds: dep.doctorIds.filter((k) => k !== prev.doctors[i]?.key) })),
                }))
              }>
              <div className={grid2}>
                <Field label="MediReach portfolio" htmlFor={`${p}.doctorProfileId`} error={err(`${p}.doctorProfileId`)}>
                  <NativeSelect id={`${p}.doctorProfileId`} value={d.doctorProfileId} disabled={readOnly} onChange={(e) => setDoctor(i, { doctorProfileId: e.target.value })}>
                    <option value="">None (add their details below)</option>
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
                <Field label="Role at this site (optional)" htmlFor={`${p}.role`} error={err(`${p}.role`)}>
                  <RoleSelect id={`${p}.role`} value={d.role} disabled={readOnly} onChange={(role) => setDoctor(i, { role })} />
                </Field>
              </div>
              {!d.doctorProfileId && (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="shrink-0 sm:w-44">
                    <p className="mb-1.5 text-sm font-medium">Profile photo</p>
                    <PhotoCropUpload value={d.photo} disabled={readOnly} onChange={(photo) => setDoctor(i, { photo })} />
                  </div>
                  <div className="grid flex-1 gap-4 sm:grid-cols-2">
                    <Field label="Name" htmlFor={`${p}.name`} required error={err(`${p}.name`)}>
                      <Input id={`${p}.name`} value={d.name} placeholder="Dr. …" disabled={readOnly} onChange={(e) => setDoctor(i, { name: e.target.value })} />
                    </Field>
                    <Field label="Designation / specialty" htmlFor={`${p}.specialty`} error={err(`${p}.specialty`)}>
                      <SelectOther
                        id={`${p}.specialty`}
                        value={d.specialty}
                        options={DESIGNATION_SUGGESTIONS}
                        disabled={readOnly}
                        otherPlaceholder="Please specify, e.g. Sleep Medicine Specialist"
                        onChange={(specialty) => setDoctor(i, { specialty })}
                      />
                    </Field>
                    <Field
                      label="Qualifications"
                      htmlFor={`${p}.qualifications`}
                      error={err(`${p}.qualifications`)}
                      help="One row per degree. Shown on the site as one line, e.g. “MBBS, MD (Dermatology)”."
                      className="sm:col-span-2"
                    >
                      <DegreesInput id={`${p}.qualifications`} value={d.qualifications} disabled={readOnly} onChange={(qualifications) => setDoctor(i, { qualifications })} />
                    </Field>
                    <Field label="Profile link (optional)" htmlFor={`${p}.profileUrl`} error={err(`${p}.profileUrl`)} help="Their own website or Practo profile. The card links to it.">
                      <Input id={`${p}.profileUrl`} type="url" inputMode="url" value={d.profileUrl} placeholder="https://…" disabled={readOnly} onChange={(e) => setDoctor(i, { profileUrl: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}
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
        <AddButton disabled={readOnly} onClick={() => set((prev) => ({ doctors: [...prev.doctors, blankSiteDoctor()] }))}>
          Add doctor
        </AddButton>
        {!f.id && <p className="text-xs text-muted-foreground">Save the name first to create portfolios from here.</p>}
      </Group>
    </div>
  );
}

/**
 * A doctor's degrees as rows (degree dropdown + specialization), like the
 * Get started form. Stored as the one line the site shows ("MBBS, MD (Dermatology)").
 * Keeps its own rows so a half-filled row stays put.
 */
function DegreesInput({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const def = ROWS.degrees;
  const [rows, setRows] = useState<Row[]>(() => textToRows(def, value));
  const [written, setWritten] = useState(value);
  if (value !== written) {
    // Changed from outside (e.g. added from the website form).
    setWritten(value);
    setRows(textToRows(def, value));
  }
  const write = (next: Row[]) => {
    const text = rowsToText(def, next);
    setRows(next);
    setWritten(text);
    onChange(text);
  };
  const setCell = (i: number, key: string, v: string) => write(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} role="group" aria-label={`Degree ${i + 1}`} className="grid items-start gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <SelectOther
            id={i === 0 ? id : `${id}.${i}.degree`}
            value={r.degree ?? ""}
            options={DEGREE_SUGGESTIONS}
            disabled={disabled}
            emptyLabel="Degree…"
            otherPlaceholder="Please specify, e.g. DNB"
            onChange={(v) => setCell(i, "degree", v)}
          />
          <Input
            aria-label={`Degree ${i + 1} specialization`}
            value={r.specialization ?? ""}
            placeholder="Specialization (optional), e.g. Dermatology"
            disabled={disabled}
            onChange={(e) => setCell(i, "specialization", e.target.value)}
          />
          {rows.length > 1 || rowHasContent(r) ? (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove degree ${i + 1}`} className="text-clay-text" disabled={disabled} onClick={() => write(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blankRow(def)])}>
              <Trash2 />
            </Button>
          ) : (
            <span className="hidden size-9 sm:block" aria-hidden />
          )}
        </div>
      ))}
      {rows.length < def.max && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setRows([...rows, blankRow(def)])}>
          <Plus /> Add degree
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Registration + hospital extras
export function ExtrasStep({ form: f, set, err, options, readOnly, hints }: EStepProps) {
  const hospital = f.kind === "hospital";
  // Every doctor on the Doctors step, with or without a portfolio (ticked by key).
  const team = f.doctors.map((d, i) => ({
    key: d.key,
    name: (d.doctorProfileId ? options.doctors.find((x) => x.id === d.doctorProfileId)?.name : d.name)?.trim() || `Doctor ${i + 1}`,
    portfolio: Boolean(d.doctorProfileId),
  }));
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
        {!f.registration.authority && (
          <SuggestionChips single label="Use" items={REG_AUTHORITY_SUGGESTIONS} have={[]} disabled={readOnly} onAdd={([authority]) => set((p) => ({ registration: { ...p.registration, authority: authority! } }))} />
        )}
      </Group>

      <Group title="Insurance and cashless" description="Factual list of insurers/TPAs you work with.">
        <SwitchField label="Cashless treatment available" checked={f.insurance.cashless} disabled={readOnly} onCheckedChange={(cashless) => set((p) => ({ insurance: { ...p.insurance, cashless } }))} />
        <Field label="Insurers and TPAs" htmlFor="insurance.providers">
          <ChipInput
            id="insurance.providers"
            value={f.insurance.providers}
            onChange={(providers) => set((p) => ({ insurance: { ...p.insurance, providers } }))}
            placeholder="Type a name and press Enter, or tap a suggestion"
            suggestions={[...(hints?.insurance ?? []), ...INSURANCE_SUGGESTIONS]}
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
            <SuggestionChips
              items={BED_TYPE_SUGGESTIONS}
              have={f.beds.types.map((b) => b.type)}
              disabled={readOnly}
              onAdd={(types) => set((p) => ({ beds: { ...p.beds, types: [...p.beds.types.filter((b) => b.type.trim()), ...types.map((type) => ({ type, count: undefined }))].slice(0, 10) } }))}
            />
            <AddButton disabled={readOnly} onClick={() => set((p) => ({ beds: { ...p.beds, types: [...p.beds.types, { type: "", count: undefined }] } }))}>
              Add bed type
            </AddButton>
          </Group>

          <Group title="Departments" description="Each department lists its doctors from the Doctors step, with or without a MediReach portfolio.">
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
                  <p className="text-xs text-muted-foreground">Add doctors in the Doctors step to list them here.</p>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {team.map((d) => (
                      <li key={d.key}>
                        <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                          <Checkbox
                            checked={dep.doctorIds.includes(d.key)}
                            disabled={readOnly}
                            onCheckedChange={(on) =>
                              set((p) => ({
                                departments: updateAt(p.departments, i, {
                                  doctorIds: on ? [...dep.doctorIds, d.key] : dep.doctorIds.filter((x) => x !== d.key),
                                }),
                              }))
                            }
                          />
                          <span className="min-w-0 truncate">{d.name}</span>
                          {d.portfolio && <span className="shrink-0 text-xs text-muted-foreground">Portfolio</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </RepeatItem>
            ))}
            {err("departments") && <p className="text-sm text-clay-text">{err("departments")}</p>}
            {hints && hints.departments.length > 0 && (
              <SuggestionChips
                tone="form"
                label={`Website form ${hints.ref}`}
                items={hints.departments}
                have={f.departments.map((d) => d.name)}
                disabled={readOnly}
                onAdd={(names) => set((p) => ({ departments: [...p.departments, ...names.map((name) => ({ key: randomKey(), name, description: "", doctorIds: [] }))] }))}
              />
            )}
            <SuggestionChips
              items={DEPARTMENT_SUGGESTIONS}
              have={f.departments.map((d) => d.name)}
              disabled={readOnly}
              onAdd={(names) => set((p) => ({ departments: [...p.departments, ...names.map((name) => ({ key: randomKey(), name, description: "", doctorIds: [] }))].slice(0, 30) }))}
            />
            <AddButton disabled={readOnly} onClick={() => set((p) => ({ departments: [...p.departments, { key: randomKey(), name: "", description: "", doctorIds: [] }] }))}>
              Add department
            </AddButton>
          </Group>

          <Group title="Visiting hours">
            <Field label="Visiting hours for patients' families" htmlFor="visitingHours" error={err("visitingHours")}>
              <Input id="visitingHours" maxLength={200} value={f.visitingHours} disabled={readOnly} placeholder="e.g. 11 am–1 pm and 5 pm–7 pm" onChange={(e) => set({ visitingHours: e.target.value })} />
            </Field>
            {!f.visitingHours && (
              <SuggestionChips
                single
                label="Use"
                items={[...(hints?.visitingHours ? [hints.visitingHours] : []), ...VISITING_HOURS_SUGGESTIONS]}
                have={[]}
                disabled={readOnly}
                onAdd={([visitingHours]) => set({ visitingHours })}
              />
            )}
          </Group>
        </>
      )}
      {!hospital && (
        <p className="text-sm text-muted-foreground">
          Beds, departments and visiting hours are for hospitals. If this is a hospital, create it with “New hospital” instead.
        </p>
      )}
    </div>
  );
}
