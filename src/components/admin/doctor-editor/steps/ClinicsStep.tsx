"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { addMaster, MasterSelect } from "@/components/admin/form/MasterSelect";
import { emptyClinic, MAX_CLINICS, type ClinicForm } from "@/lib/doctors/form";
import type { FormClinic } from "@/lib/intake/hints";
import { coordsFromMapsUrl, mapsLinkFor, parseLocation } from "@/lib/intake/form";
import { parseTimingsText } from "@/lib/timings";
import { toast } from "sonner";
import { LocationField } from "@/components/intake/LocationField";
import { TimingEditor } from "../TimingEditor";
import { AddButton, Group, grid2, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const isVisiting = (c: Pick<ClinicForm, "type">) => c.type === "hospital_visiting";

/** Own clinics first, hospitals where they visit after (the first clinic sets the page's city and area). */
const ordered = (list: ClinicForm[]) => [...list.filter((c) => !isVisiting(c)), ...list.filter(isVisiting)];

export function ClinicsStep({ form: f, set, err, options, readOnly, hints }: StepProps) {
  const defaultCity = options.cities.find((c) => c.slug === "pune")?.id ?? options.cities[0]?.id ?? "";
  const [importing, setImporting] = useState<number | null>(null);
  // Website-form clinics not added yet (matched by name).
  const formClinics = (hints?.clinics ?? []).map((c, i) => ({ c, i })).filter(({ c }) => !f.clinics.some((x) => c.name && same(x.name, c.name)));

  /** A website-form clinic as editor values: city and area matched (a new area is added to the list), timings read from the text. */
  async function fromForm(fc: FormClinic): Promise<ClinicForm> {
    const city = options.cities.find((x) => fc.city && (same(x.name, fc.city) || same(x.slug, fc.city)));
    const cityId = city?.id ?? defaultCity;
    const areaOpts = options.areas.filter((a) => a.cityId === cityId);
    const area = fc.area && cityId ? await addMaster("area", fc.area, { cityId }, areaOpts) : null;
    const geo = parseLocation(fc.location);
    const timings = fc.timings ? parseTimingsText(fc.timings) : null;
    return {
      ...emptyClinic(cityId),
      ...(fc.type === "visiting" ? { type: "hospital_visiting" as const } : {}),
      name: fc.name,
      addressLine1: fc.address.replace(/\s*\n\s*/g, ", "),
      ...(fc.address2 ? { addressLine2: fc.address2 } : {}),
      areaId: area?.id ?? "",
      state: city?.state ?? "Maharashtra",
      pincode: /^\d{6}$/.test(fc.pincode) ? fc.pincode : "",
      phone: fc.phone.split(/[,/;]/)[0]?.trim() ?? "",
      mapsUrl: fc.mapsUrl || (geo ? mapsLinkFor(geo) : ""),
      lat: geo ? String(geo.lat) : "",
      lng: geo ? String(geo.lng) : "",
      appointmentNote: fc.appointmentNote,
      fee: /^\d+$/.test(fc.fee) ? Number(fc.fee) : undefined,
      showFee: /^\d+$/.test(fc.fee) && fc.showFee,
      ...(timings ? { timings } : {}),
    };
  }

  /** Add a clinic from the website form. */
  async function importClinic(fc: FormClinic, i: number) {
    setImporting(i);
    try {
      const clinic = await fromForm(fc);
      set((prev) => ({ clinics: ordered([...prev.clinics, clinic]).slice(0, MAX_CLINICS) }));
    } finally {
      setImporting(null);
    }
  }

  /** Fill an existing clinic from the website form: empty fields are filled; the timings are replaced by the form's. */
  async function fillClinic(i: number, fc: FormClinic) {
    setImporting(-1 - i);
    try {
      const v = await fromForm(fc);
      const readTimings = v.timings.some((t) => t.slots.length > 0);
      set((prev) => {
        const c = prev.clinics[i];
        if (!c) return {};
        const keep = <K extends keyof ClinicForm>(k: K): ClinicForm[K] => (c[k] === "" || c[k] === undefined ? v[k] : c[k]);
        const sameCity = !c.cityId || c.cityId === v.cityId;
        const next: ClinicForm = {
          ...c,
          name: keep("name"),
          addressLine1: keep("addressLine1"),
          addressLine2: keep("addressLine2"),
          cityId: c.cityId || v.cityId,
          areaId: c.areaId || (sameCity ? v.areaId : ""),
          pincode: keep("pincode"),
          phone: keep("phone"),
          mapsUrl: keep("mapsUrl"),
          lat: keep("lat"),
          lng: keep("lng"),
          appointmentNote: keep("appointmentNote"),
          fee: c.fee ?? v.fee,
          showFee: c.fee === undefined ? v.showFee : c.showFee,
          timings: readTimings ? v.timings : c.timings,
        };
        return { clinics: updateAt(prev.clinics, i, next) };
      });
      toast.success(readTimings ? "Filled from the website form. Check the timings." : "Filled from the website form. The timings couldn't be read: enter them by hand.");
    } finally {
      setImporting(null);
    }
  }
  const setClinic = (i: number, patch: Partial<ClinicForm>) => set((f) => ({ clinics: updateAt(f.clinics, i, patch) }));
  /** Swap two entries (neighbours in the same group). */
  const swap = (i: number, j: number) =>
    set((prev) => {
      const next = [...prev.clinics];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return { clinics: next };
    });
  const own = f.clinics.map((c, i) => ({ c, i })).filter(({ c }) => !isVisiting(c));
  const visiting = f.clinics.map((c, i) => ({ c, i })).filter(({ c }) => isVisiting(c));
  const full = f.clinics.length >= MAX_CLINICS;

  return (
    <div className="space-y-5">
      {formClinics.length > 0 && (
        <div className="space-y-2 rounded-lg bg-sage/60 p-3 text-sm text-ink">
          <p className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-4" aria-hidden /> Clinics in website form {hints?.ref}
          </p>
          <ul className="space-y-2">
            {formClinics.map(({ c, i }) => (
              <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  <strong className="text-ink">{c.name || `Clinic ${i + 1}`}</strong>
                  {c.type === "visiting" && " (visiting consultant)"}
                  {[c.address, c.area, c.city, c.pincode].filter(Boolean).length > 0 && ` · ${[c.address, c.area, c.city, c.pincode].filter(Boolean).join(", ")}`}
                </span>
                <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={readOnly || importing !== null || full} onClick={() => void importClinic(c, i)}>
                  {importing === i ? <Loader2 className="animate-spin" /> : <Plus />} Add this {c.type === "visiting" ? "hospital" : "clinic"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {own.length === 0 && (
        <p className="rounded-lg border border-dashed border-line bg-card p-4 text-sm text-muted-foreground">
          Add the doctor&apos;s clinic. The first clinic is the primary one: it sets the city and area in the page address and Google title.
        </p>
      )}
      {own.map(({ c, i }, k) => renderClinic(c, i, k, own))}
      <AddButton
        disabled={readOnly || full}
        onClick={() => set((f) => ({ clinics: ordered([...f.clinics, emptyClinic(defaultCity)]) }))}
      >
        Add clinic
      </AddButton>

      <Group
        title="Visiting consultant at"
        description="Hospitals where the doctor consults on fixed days or on call. The page lists them as “Visiting consultant at …”, with the days and timings."
      >
        {visiting.length === 0 && <p className="text-sm text-muted-foreground">No hospitals added.</p>}
        {visiting.map(({ c, i }, k) => renderClinic(c, i, k, visiting))}
        <AddButton disabled={readOnly || full} onClick={() => set((f) => ({ clinics: [...f.clinics, { ...emptyClinic(defaultCity), type: "hospital_visiting" }] }))}>
          Add hospital
        </AddButton>
      </Group>
      {full && <p className="text-xs text-muted-foreground">Up to {MAX_CLINICS} clinics and hospitals in all.</p>}
    </div>
  );

  /** One clinic or visiting hospital (`k` = its place in its group). */
  function renderClinic(c: ClinicForm, i: number, k: number, group: { i: number }[]) {
        const p = `clinics.${i}`;
        const areas = options.areas.filter((a) => a.cityId === c.cityId);
        // The website-form clinic for this one: same name, else the same position.
        const fc = hints?.clinics.find((x) => x.name && same(x.name, c.name)) ?? hints?.clinics[i];
        const sites = options.establishments.filter((e) => !e.cityId || e.cityId === c.cityId);
        const hospital = isVisiting(c);
        const noun = hospital ? "Hospital" : "Clinic";
        const card = (
            <RepeatItem title={c.name || `New ${noun.toLowerCase()}`} disabled={readOnly} onRemove={() => set((f) => ({ clinics: removeAt(f.clinics, i) }))}>
              {group.length > 1 && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={readOnly || k === 0} onClick={() => swap(i, group[k - 1]!.i)}>
                    <ArrowUp /> Move up
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={readOnly || k === group.length - 1} onClick={() => swap(i, group[k + 1]!.i)}>
                    <ArrowDown /> Move down
                  </Button>
                </div>
              )}
              {fc && (
                <div className="flex flex-col gap-2 rounded-lg bg-sage/60 p-3 text-sm text-ink sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-2">
                    <ClipboardList className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-semibold">
                        Website form {hints?.ref}: {fc.name || `clinic ${i + 1}`}
                      </p>
                      <p className="text-muted-foreground">{[fc.address, fc.address2, fc.area, fc.city, fc.pincode].filter(Boolean).join(", ")}</p>
                      {fc.timings && <p className="whitespace-pre-line text-muted-foreground">Timings: {fc.timings}</p>}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={readOnly || importing !== null} onClick={() => void fillClinic(i, fc)}>
                    {importing === -1 - i ? <Loader2 className="animate-spin" /> : <ClipboardList />} Fill from website form
                  </Button>
                </div>
              )}
              <div className={grid2}>
                <Field label="Type" htmlFor={`${p}.type`}>
                  <NativeSelect
                    id={`${p}.type`}
                    value={c.type}
                    disabled={readOnly}
                    onChange={(e) => set((f) => ({ clinics: ordered(updateAt(f.clinics, i, { type: e.target.value as ClinicForm["type"] })) }))}
                  >
                    <option value="own_clinic">Own clinic</option>
                    <option value="hospital_visiting">Visiting consultant at a hospital</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </Field>
                {sites.length > 0 && (
                  <Field
                    label="Clinic / hospital site"
                    htmlFor={`${p}.establishmentId`}
                    error={err(`${p}.establishmentId`)}
                    help="If it has a MediReach site, link it: the page shows “Practises at” and the two link to each other."
                  >
                    <NativeSelect
                      id={`${p}.establishmentId`}
                      value={c.establishmentId}
                      disabled={readOnly}
                      onChange={(e) => {
                        const site = options.establishments.find((x) => x.id === e.target.value);
                        setClinic(i, {
                          establishmentId: e.target.value,
                          ...(site
                            ? {
                                name: c.name || site.name,
                                addressLine1: c.addressLine1 || site.address || "",
                                addressLine2: c.addressLine2 || site.address2 || "",
                                areaId: c.areaId || site.areaId || "",
                                pincode: c.pincode || site.pincode || "",
                                phone: c.phone || site.phone || "",
                              }
                            : {}),
                        });
                      }}
                    >
                      <option value="">Not linked</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.kind === "hospital" ? "hospital" : "clinic"})
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                <Field label={`${noun} name`} htmlFor={`${p}.name`} required error={err(`${p}.name`)}>
                  <Input id={`${p}.name`} value={c.name} disabled={readOnly} onChange={(e) => setClinic(i, { name: e.target.value })} />
                </Field>
                <Field label="Phone" htmlFor={`${p}.phone`} error={err(`${p}.phone`)}>
                  <Input id={`${p}.phone`} type="tel" inputMode="tel" value={c.phone} disabled={readOnly} onChange={(e) => setClinic(i, { phone: e.target.value })} />
                </Field>
              </div>

              <div className={grid2}>
                <Field label="Address line 1" htmlFor={`${p}.addressLine1`} required error={err(`${p}.addressLine1`)}>
                  <Input id={`${p}.addressLine1`} value={c.addressLine1} disabled={readOnly} onChange={(e) => setClinic(i, { addressLine1: e.target.value })} />
                </Field>
                <Field label="Address line 2" htmlFor={`${p}.addressLine2`}>
                  <Input id={`${p}.addressLine2`} value={c.addressLine2} disabled={readOnly} onChange={(e) => setClinic(i, { addressLine2: e.target.value })} />
                </Field>
                <Field label="City" htmlFor={`${p}.cityId`} required error={err(`${p}.cityId`)} help={!c.cityId && fc?.city ? `Website form: ${fc.city}` : undefined}>
                  <NativeSelect
                    id={`${p}.cityId`}
                    value={c.cityId}
                    disabled={readOnly}
                    onChange={(e) => {
                      const city = options.cities.find((x) => x.id === e.target.value);
                      setClinic(i, { cityId: e.target.value, areaId: "", state: city?.state ?? c.state });
                    }}
                  >
                    <option value="" />
                    {options.cities.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Area" htmlFor={`${p}.areaId`} required error={err(`${p}.areaId`)}>
                  <MasterSelect
                    id={`${p}.areaId`}
                    kind="area"
                    noun="area"
                    value={c.areaId}
                    options={areas}
                    scope={{ cityId: c.cityId }}
                    disabled={readOnly}
                    invalid={Boolean(err(`${p}.areaId`))}
                    hint={fc?.area}
                    onChange={(areaId) => setClinic(i, { areaId })}
                  />
                </Field>
                <Field label="State" htmlFor={`${p}.state`}>
                  <Input id={`${p}.state`} value={c.state} disabled={readOnly} onChange={(e) => setClinic(i, { state: e.target.value })} />
                </Field>
                <Field label="Pincode" htmlFor={`${p}.pincode`} required error={err(`${p}.pincode`)}>
                  <Input
                    id={`${p}.pincode`}
                    inputMode="numeric"
                    maxLength={6}
                    value={c.pincode}
                    disabled={readOnly}
                    onChange={(e) => setClinic(i, { pincode: e.target.value.replace(/\D/g, "") })}
                  />
                </Field>
              </div>

              <Field
                label="Google Maps link"
                htmlFor={`${p}.mapsUrl`}
                help="Paste the clinic's Maps link; we pick up the map location from it when we can."
                error={err(`${p}.mapsUrl`)}
              >
                <Input
                  id={`${p}.mapsUrl`}
                  type="url"
                  inputMode="url"
                  value={c.mapsUrl}
                  disabled={readOnly}
                  onChange={(e) => {
                    const coords = coordsFromMapsUrl(e.target.value);
                    setClinic(i, { mapsUrl: e.target.value, ...(coords && !c.lat ? coords : {}) });
                  }}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" htmlFor={`${p}.lat`} error={err(`${p}.lat`)}>
                  <Input id={`${p}.lat`} inputMode="decimal" value={c.lat} disabled={readOnly} onChange={(e) => setClinic(i, { lat: e.target.value })} />
                </Field>
                <Field label="Longitude" htmlFor={`${p}.lng`} error={err(`${p}.lng`)}>
                  <Input id={`${p}.lng`} inputMode="decimal" value={c.lng} disabled={readOnly} onChange={(e) => setClinic(i, { lng: e.target.value })} />
                </Field>
              </div>
              {!readOnly && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Map location</p>
                  <LocationField
                    id={`${p}.location`}
                    value={c.lat && c.lng ? `${c.lat},${c.lng}` : ""}
                    hint={[c.name, c.addressLine1, options.areas.find((a) => a.id === c.areaId)?.name, options.cities.find((x) => x.id === c.cityId)?.name].filter(Boolean).join(", ")}
                    onChange={(v) => {
                      const loc = parseLocation(v);
                      setClinic(i, loc ? { lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), ...(c.mapsUrl ? {} : { mapsUrl: mapsLinkFor(loc) }) } : { lat: "", lng: "" });
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">{hospital ? "Days and timings they visit" : "Timings"}</p>
                <TimingEditor idPrefix={p} value={c.timings} disabled={readOnly} onChange={(timings) => setClinic(i, { timings })} />
                {err(`${p}.timings`) && <p className="text-sm text-clay-text">{err(`${p}.timings`)}</p>}
              </div>

              <Field label="Appointment note (optional)" htmlFor={`${p}.appointmentNote`} help="e.g. “By appointment”, “Walk-ins welcome”." error={err(`${p}.appointmentNote`)}>
                <Input id={`${p}.appointmentNote`} value={c.appointmentNote} disabled={readOnly} onChange={(e) => setClinic(i, { appointmentNote: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                <Field label="Consultation fee (₹)" htmlFor={`${p}.fee`} error={err(`${p}.fee`)}>
                  <NumberInput id={`${p}.fee`} value={c.fee} disabled={readOnly} onChange={(fee) => setClinic(i, { fee })} />
                </Field>
                <SwitchField label="Show fee on the page" checked={c.showFee} disabled={readOnly} onCheckedChange={(showFee) => setClinic(i, { showFee })} />
              </div>
            </RepeatItem>
        );
        // Visiting hospitals sit inside their own group; clinics get a group each.
        return hospital ? (
          <div key={c.key}>{card}</div>
        ) : (
          <Group key={c.key} title={i === 0 ? "Primary clinic" : `Clinic ${k + 1}`}>
            {card}
          </Group>
        );
  }
}
