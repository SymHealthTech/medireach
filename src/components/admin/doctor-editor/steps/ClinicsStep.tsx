"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Loader2, MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { addMaster, MasterSelect } from "@/components/admin/form/MasterSelect";
import { emptyClinic, type ClinicForm } from "@/lib/doctors/form";
import type { FormClinic } from "@/lib/intake/hints";
import { mapsLinkFor, parseLocation } from "@/lib/intake/form";
import { parseTimingsText } from "@/lib/timings";
import { toast } from "sonner";
import { TimingEditor } from "../TimingEditor";
import { AddButton, Group, grid2, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

/** Pull lat/lng out of a pasted Google Maps link ("…@18.50,73.80,17z" or "?q=18.5,73.8"). */
function coordsFromMapsUrl(url: string): { lat: string; lng: string } | null {
  const m = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url) ?? /[?&](?:q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(url);
  return m ? { lat: m[1]!, lng: m[2]! } : null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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
      name: fc.name,
      addressLine1: fc.address.replace(/\s*\n\s*/g, ", "),
      areaId: area?.id ?? "",
      state: city?.state ?? "Maharashtra",
      pincode: /^\d{6}$/.test(fc.pincode) ? fc.pincode : "",
      phone: fc.phone.split(/[,/;]/)[0]?.trim() ?? "",
      mapsUrl: fc.mapsUrl || (geo ? mapsLinkFor(geo) : ""),
      lat: geo ? String(geo.lat) : "",
      lng: geo ? String(geo.lng) : "",
      appointmentNote: fc.appointmentNote,
      fee: /^\d+$/.test(fc.fee) ? Number(fc.fee) : undefined,
      ...(timings ? { timings } : {}),
    };
  }

  /** Add a clinic from the website form. */
  async function importClinic(fc: FormClinic, i: number) {
    setImporting(i);
    try {
      const clinic = await fromForm(fc);
      set((prev) => ({ clinics: [...prev.clinics, clinic].slice(0, 6) }));
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
          cityId: c.cityId || v.cityId,
          areaId: c.areaId || (sameCity ? v.areaId : ""),
          pincode: keep("pincode"),
          phone: keep("phone"),
          mapsUrl: keep("mapsUrl"),
          lat: keep("lat"),
          lng: keep("lng"),
          appointmentNote: keep("appointmentNote"),
          fee: c.fee ?? v.fee,
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
  const move = (i: number, dir: -1 | 1) =>
    set((prev) => {
      const next = [...prev.clinics];
      const [item] = next.splice(i, 1);
      next.splice(i + dir, 0, item!);
      return { clinics: next };
    });

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
                  {[c.address, c.area, c.city, c.pincode].filter(Boolean).length > 0 && ` · ${[c.address, c.area, c.city, c.pincode].filter(Boolean).join(", ")}`}
                </span>
                <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={readOnly || importing !== null || f.clinics.length >= 6} onClick={() => void importClinic(c, i)}>
                  {importing === i ? <Loader2 className="animate-spin" /> : <Plus />} Add this clinic
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {f.clinics.length === 0 && (
        <p className="rounded-lg border border-dashed border-line bg-card p-4 text-sm text-muted-foreground">
          Add the doctor&apos;s clinic. The first clinic is the primary one: it sets the city and area in the page address and Google title.
        </p>
      )}
      {f.clinics.map((c, i) => {
        const p = `clinics.${i}`;
        const areas = options.areas.filter((a) => a.cityId === c.cityId);
        // The website-form clinic for this one: same name, else the same position.
        const fc = hints?.clinics.find((x) => x.name && same(x.name, c.name)) ?? hints?.clinics[i];
        const sites = options.establishments.filter((e) => !e.cityId || e.cityId === c.cityId);
        return (
          <Group key={c.key} title={i === 0 ? "Primary clinic" : `Clinic ${i + 1}`}>
            <RepeatItem title={c.name || "New clinic"} disabled={readOnly} onRemove={() => set((f) => ({ clinics: removeAt(f.clinics, i) }))}>
              {f.clinics.length > 1 && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={readOnly || i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp /> Move up
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={readOnly || i === f.clinics.length - 1} onClick={() => move(i, 1)}>
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
                      <p className="text-muted-foreground">{[fc.address, fc.area, fc.city, fc.pincode].filter(Boolean).join(", ")}</p>
                      {fc.timings && <p className="whitespace-pre-line text-muted-foreground">Timings: {fc.timings}</p>}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={readOnly || importing !== null} onClick={() => void fillClinic(i, fc)}>
                    {importing === -1 - i ? <Loader2 className="animate-spin" /> : <ClipboardList />} Fill from website form
                  </Button>
                </div>
              )}
              <div className={grid2}>
                <Field label="Clinic type" htmlFor={`${p}.type`}>
                  <NativeSelect
                    id={`${p}.type`}
                    value={c.type}
                    disabled={readOnly}
                    onChange={(e) => setClinic(i, { type: e.target.value as ClinicForm["type"] })}
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
                <Field label="Clinic name" htmlFor={`${p}.name`} required error={err(`${p}.name`)}>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => setClinic(i, { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
                    () => undefined,
                    { enableHighAccuracy: true, timeout: 10000 },
                  )
                }
              >
                <MapPin /> Use my current location (at the clinic)
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium">Timings</p>
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
          </Group>
        );
      })}
      <AddButton disabled={readOnly || f.clinics.length >= 6} onClick={() => set((f) => ({ clinics: [...f.clinics, emptyClinic(defaultCity)] }))}>
        Add clinic
      </AddButton>
    </div>
  );
}
