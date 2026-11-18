"use client";

import { ArrowDown, ArrowUp, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { emptyClinic, type ClinicForm } from "@/lib/doctors/form";
import { TimingEditor } from "../TimingEditor";
import { AddButton, Group, grid2, RepeatItem, removeAt, updateAt, type StepProps } from "../shared";

/** Pull lat/lng out of a pasted Google Maps link ("…@18.50,73.80,17z" or "?q=18.5,73.8"). */
function coordsFromMapsUrl(url: string): { lat: string; lng: string } | null {
  const m = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url) ?? /[?&](?:q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(url);
  return m ? { lat: m[1]!, lng: m[2]! } : null;
}

export function ClinicsStep({ form: f, set, err, options, readOnly }: StepProps) {
  const defaultCity = options.cities.find((c) => c.slug === "pune")?.id ?? options.cities[0]?.id ?? "";
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
      {f.clinics.length === 0 && (
        <p className="rounded-lg border border-dashed border-line bg-card p-4 text-sm text-muted-foreground">
          Add the doctor&apos;s clinic. The first clinic is the primary one: it sets the city and area in the page address and Google title.
        </p>
      )}
      {f.clinics.map((c, i) => {
        const p = `clinics.${i}`;
        const areas = options.areas.filter((a) => a.cityId === c.cityId);
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
                <Field label="City" htmlFor={`${p}.cityId`} required error={err(`${p}.cityId`)}>
                  <NativeSelect
                    id={`${p}.cityId`}
                    value={c.cityId}
                    disabled={readOnly}
                    onChange={(e) => {
                      const city = options.cities.find((x) => x.id === e.target.value);
                      setClinic(i, { cityId: e.target.value, areaId: "", state: city?.state ?? c.state });
                    }}
                  >
                    <option value="">Choose…</option>
                    {options.cities.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Area" htmlFor={`${p}.areaId`} required error={err(`${p}.areaId`)}>
                  <NativeSelect id={`${p}.areaId`} value={c.areaId} disabled={readOnly || !c.cityId} onChange={(e) => setClinic(i, { areaId: e.target.value })}>
                    <option value="">Choose…</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </NativeSelect>
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
