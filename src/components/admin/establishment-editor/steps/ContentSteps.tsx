"use client";

import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput, Field, NativeSelect, SwitchField } from "@/components/admin/form/fields";
import { MasterSelect } from "@/components/admin/form/MasterSelect";
import { FormNote, SuggestionChips } from "@/components/admin/form/Suggestions";
import { LocationField } from "@/components/intake/LocationField";
import { GalleryEditor } from "@/components/admin/doctor-editor/GalleryEditor";
import { TimingEditor } from "@/components/admin/doctor-editor/TimingEditor";
import { AddButton, Group, grid2, removeAt, RepeatItem, updateAt } from "@/components/admin/doctor-editor/shared";
import { galleryMax, type EstablishmentForm, type NamedValue } from "@/lib/establishments/form";
import { coordsFromMapsUrl, mapsLinkFor, parseLocation } from "@/lib/intake/form";
import { equipmentSuggestions, facilitySuggestions, LANGUAGE_SUGGESTIONS, APPOINTMENT_NOTE_SUGGESTIONS, serviceSuggestions } from "@/lib/suggestions";
import { parseTimingsText, timingsToText } from "@/lib/timings";
import { getTheme } from "@/themes/specialty";
import type { EStepProps } from "../shared";

// ---------------------------------------------------------------- Location
const LINKS: { key: keyof EstablishmentForm["links"]; label: string }[] = [
  { key: "googleBusiness", label: "Google Business profile" },
  { key: "website", label: "Existing website" },
  { key: "practo", label: "Practo" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
];

export function LocationStep({ form: f, set, err, options, readOnly, hints }: EStepProps) {
  const areas = options.areas.filter((a) => a.cityId === f.address.cityId);
  const areaName = options.areas.find((a) => a.id === f.address.areaId)?.name;
  const cityName = options.cities.find((c) => c.id === f.address.cityId)?.name;
  const setAddress = (patch: Partial<EstablishmentForm["address"]>) => set((p) => ({ address: { ...p.address, ...patch } }));
  return (
    <div className="space-y-5">
      <Group title="Address">
        <div className={grid2}>
          <Field label="City" htmlFor="address.cityId" required error={err("address.cityId")} help={!f.address.cityId && hints?.city ? `Website form: ${hints.city}` : undefined}>
            <NativeSelect
              id="address.cityId"
              value={f.address.cityId}
              disabled={readOnly}
              onChange={(e) => {
                const city = options.cities.find((c) => c.id === e.target.value);
                setAddress({ cityId: e.target.value, areaId: "", ...(city ? { state: city.state } : {}) });
              }}
            >
              <option value="" />
              {options.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Area" htmlFor="address.areaId" required error={err("address.areaId")}>
            <MasterSelect
              id="address.areaId"
              kind="area"
              noun="area"
              value={f.address.areaId}
              options={areas}
              scope={{ cityId: f.address.cityId }}
              disabled={readOnly}
              invalid={Boolean(err("address.areaId"))}
              hint={hints?.area}
              onChange={(areaId) => setAddress({ areaId })}
            />
          </Field>
          <Field label="Address line 1" htmlFor="address.line1" required error={err("address.line1")}>
            <Input id="address.line1" value={f.address.line1} disabled={readOnly} onChange={(e) => setAddress({ line1: e.target.value })} />
          </Field>
          <Field label="Address line 2" htmlFor="address.line2">
            <Input id="address.line2" value={f.address.line2} disabled={readOnly} onChange={(e) => setAddress({ line2: e.target.value })} />
          </Field>
          <Field label="Pincode" htmlFor="address.pincode" required error={err("address.pincode")}>
            <Input id="address.pincode" inputMode="numeric" maxLength={6} value={f.address.pincode} disabled={readOnly} onChange={(e) => setAddress({ pincode: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Landmark" htmlFor="address.landmark">
            <Input id="address.landmark" value={f.address.landmark} disabled={readOnly} placeholder="e.g. Opposite Baner bus stop" onChange={(e) => setAddress({ landmark: e.target.value })} />
          </Field>
          <Field label="Parking note" htmlFor="address.parkingNote" error={err("address.parkingNote")} className="sm:col-span-2">
            <Input id="address.parkingNote" value={f.address.parkingNote} disabled={readOnly} placeholder="e.g. Two-wheeler parking in the basement" onChange={(e) => setAddress({ parkingNote: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Map location" description="Pin it on the map (search the area, then drag the pin to the entrance), use your current location at the site, or paste a Google Maps link.">
        {!readOnly && (
          <LocationField
            id="location"
            value={f.lat && f.lng ? `${f.lat},${f.lng}` : ""}
            hint={[f.name, f.address.line1, areaName, cityName].filter(Boolean).join(", ")}
            onChange={(v) => {
              const loc = parseLocation(v);
              set((p) => (loc ? { lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), mapsUrl: p.mapsUrl || mapsLinkFor(loc) } : { lat: "", lng: "" }));
            }}
          />
        )}
        <div className={grid2}>
          <Field label="Google Maps link" htmlFor="mapsUrl" error={err("mapsUrl")} className="sm:col-span-2" help="Paste the site's Maps link; the pin is picked up from it when the link has coordinates.">
            <Input
              id="mapsUrl"
              value={f.mapsUrl}
              disabled={readOnly}
              placeholder="https://maps.app.goo.gl/…"
              onChange={(e) => {
                const coords = coordsFromMapsUrl(e.target.value);
                set((p) => ({ mapsUrl: e.target.value, ...(coords && !p.lat ? coords : {}) }));
              }}
            />
          </Field>
          <Field label="Latitude" htmlFor="lat" error={err("lat")}>
            <Input id="lat" inputMode="decimal" value={f.lat} disabled={readOnly} onChange={(e) => set({ lat: e.target.value })} />
          </Field>
          <Field label="Longitude" htmlFor="lng" error={err("lng")}>
            <Input id="lng" inputMode="decimal" value={f.lng} disabled={readOnly} onChange={(e) => set({ lng: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Contact">
        <Field label="Phone numbers" required error={err("phones") ?? err("phones.0")} help="Up to 4. The first one is used for the Call button.">
          <div className="space-y-2">
            {f.phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  id={`phones.${i}`}
                  type="tel"
                  inputMode="tel"
                  value={p}
                  disabled={readOnly}
                  aria-invalid={Boolean(err(`phones.${i}`))}
                  onChange={(e) => set((prev) => ({ phones: prev.phones.map((x, j) => (j === i ? e.target.value : x)) }))}
                />
                {f.phones.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove number" disabled={readOnly} onClick={() => set((prev) => ({ phones: removeAt(prev.phones, i) }))}>
                    <X />
                  </Button>
                )}
              </div>
            ))}
            {f.phones.length < 4 && (
              <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => set((prev) => ({ phones: [...prev.phones, ""] }))}>
                <Plus /> Add number
              </Button>
            )}
          </div>
        </Field>
        <div className={grid2}>
          <Field label="WhatsApp" htmlFor="whatsapp" error={err("whatsapp")}>
            <Input id="whatsapp" type="tel" inputMode="tel" value={f.whatsapp} disabled={readOnly} onChange={(e) => set({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="email" error={err("email")}>
            <Input id="email" type="email" value={f.email} disabled={readOnly} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          {f.kind === "hospital" && (
            <Field label="Emergency number (24×7)" htmlFor="emergencyPhone" error={err("emergencyPhone")} help="Optional. When added, the website shows a 24×7 emergency bar with this number; without one it shows a plain call bar.">
              <Input id="emergencyPhone" type="tel" inputMode="tel" value={f.emergencyPhone} disabled={readOnly} onChange={(e) => set({ emergencyPhone: e.target.value })} />
            </Field>
          )}
          <Field label="Languages spoken" htmlFor="languages">
            <ChipInput id="languages" value={f.languages} onChange={(languages) => set({ languages })} suggestions={LANGUAGE_SUGGESTIONS} max={12} disabled={readOnly} />
          </Field>
        </div>
      </Group>

      <Group title="Links (optional)">
        <div className={grid2}>
          {LINKS.map((l) => (
            <Field key={l.key} label={l.label} htmlFor={`links.${l.key}`} error={err(`links.${l.key}`)}>
              <Input id={`links.${l.key}`} value={f.links[l.key]} disabled={readOnly} placeholder="https://…" onChange={(e) => set((p) => ({ links: { ...p.links, [l.key]: e.target.value } }))} />
            </Field>
          ))}
        </div>
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Timings
export function TimingsStep({ form: f, set, err, readOnly, hints }: EStepProps) {
  const formWeek = hints?.timings ? parseTimingsText(hints.timings) : null;
  const sameAsForm = formWeek ? timingsToText(formWeek) === timingsToText(f.timings) : false;
  return (
    <div className="space-y-5">
      {hints?.timings && (
        <FormNote
          action={
            formWeek &&
            !sameAsForm && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => {
                  set({ is24x7: false, timings: formWeek });
                  toast.success("Timings filled from the website form. Check them.");
                }}
              >
                Use these timings
              </Button>
            )
          }
        >
          Website form {hints.ref}: <span className="whitespace-pre-line">{hints.timings}</span>
          {!formWeek && " (couldn't be read: enter them below)"}
        </FormNote>
      )}
      <Group title="Opening hours">
        <SwitchField
          label="Open 24×7"
          description={f.kind === "hospital" ? "Most hospitals are. OPD hours can go in the appointment note." : "Only if the clinic never closes."}
          checked={f.is24x7}
          disabled={readOnly}
          onCheckedChange={(is24x7) => set({ is24x7 })}
        />
        {!f.is24x7 && <TimingEditor value={f.timings} onChange={(timings) => set({ timings })} disabled={readOnly} idPrefix="timings" />}
        <Field label="Appointment note (optional)" htmlFor="appointmentNote" error={err("appointmentNote")} help="e.g. “Walk-ins welcome; call ahead for procedures.”">
          <Input id="appointmentNote" maxLength={200} value={f.appointmentNote} disabled={readOnly} onChange={(e) => set({ appointmentNote: e.target.value })} />
        </Field>
        {!f.appointmentNote && (
          <SuggestionChips
            single
            label="Use"
            items={[...(hints?.appointmentNote ? [hints.appointmentNote] : []), ...APPOINTMENT_NOTE_SUGGESTIONS]}
            have={[]}
            disabled={readOnly}
            onAdd={([appointmentNote]) => set({ appointmentNote })}
          />
        )}
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Services
function NamedList({
  id,
  items,
  onChange,
  err,
  readOnly,
  addLabel,
  placeholder,
  suggestions,
  fromForm,
  formRef,
}: {
  id: "facilities" | "equipment";
  items: NamedValue[];
  onChange: (v: NamedValue[]) => void;
  err: EStepProps["err"];
  readOnly: boolean;
  addLabel: string;
  placeholder: string;
  suggestions: string[];
  fromForm?: string[];
  formRef?: string;
}) {
  const have = items.map((x) => x.name);
  const add = (names: string[]) => onChange([...items.filter((x) => x.name.trim()), ...names.map((name) => ({ name, description: "" }))]);
  return (
    <div className="space-y-2">
      {fromForm && fromForm.length > 0 && <SuggestionChips tone="form" label={`Website form ${formRef ?? ""}`.trim()} items={fromForm} have={have} disabled={readOnly} onAdd={add} />}
      <SuggestionChips items={suggestions} have={have} disabled={readOnly} onAdd={add} />
      {items.map((x, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <Input id={`${id}.${i}.name`} value={x.name} placeholder={placeholder} disabled={readOnly} aria-invalid={Boolean(err(`${id}.${i}.name`))} onChange={(e) => onChange(updateAt(items, i, { name: e.target.value }))} />
          <Input id={`${id}.${i}.description`} value={x.description} placeholder="Short description (optional)" disabled={readOnly} aria-invalid={Boolean(err(`${id}.${i}.description`))} onChange={(e) => onChange(updateAt(items, i, { description: e.target.value }))} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove" disabled={readOnly} onClick={() => onChange(removeAt(items, i))}>
            <X />
          </Button>
          {(err(`${id}.${i}.name`) || err(`${id}.${i}.description`)) && (
            <p className="text-sm text-clay-text sm:col-span-3">{err(`${id}.${i}.name`) ?? err(`${id}.${i}.description`)}</p>
          )}
        </div>
      ))}
      <AddButton disabled={readOnly} onClick={() => onChange([...items, { name: "", description: "" }])}>
        {addLabel}
      </AddButton>
    </div>
  );
}

export function ServicesStep({ form: f, set, err, readOnly, options, hints }: EStepProps) {
  const theme = getTheme(f.themeKey, f.kind);
  const type = options.categories.find((c) => c.id === f.categoryId)?.slug ?? f.themeKey;
  const groupOf = (name: string) => theme.suggestedServices.find((s) => s.name.toLowerCase() === name.toLowerCase())?.group ?? "";
  const addServices = (names: string[]) =>
    set((p) => ({ services: [...p.services.filter((x) => x.name.trim()), ...names.map((name) => ({ name, description: "", group: groupOf(name) }))] }));
  const have = f.services.map((x) => x.name);
  return (
    <div className="space-y-5">
      <Group title="Services" description={theme.serviceGroups.length ? `Grouped on the page as: ${theme.serviceGroups.join(" · ")}.` : "Listed on the page in this order."}>
        {hints && hints.services.length > 0 && <SuggestionChips tone="form" label={`Website form ${hints.ref}`} items={hints.services} have={have} disabled={readOnly} onAdd={addServices} />}
        <SuggestionChips items={serviceSuggestions(f.kind, type)} have={have} disabled={readOnly} onAdd={addServices} />
        {f.services.map((s, i) => (
          <RepeatItem key={i} title={s.name || `Service ${i + 1}`} disabled={readOnly} onRemove={() => set((p) => ({ services: removeAt(p.services, i) }))}>
            <div className={grid2}>
              <Field label="Name" htmlFor={`services.${i}.name`} required error={err(`services.${i}.name`)}>
                <Input id={`services.${i}.name`} value={s.name} disabled={readOnly} onChange={(e) => set((p) => ({ services: updateAt(p.services, i, { name: e.target.value }) }))} />
              </Field>
              {theme.serviceGroups.length > 0 && (
                <Field label="Group" htmlFor={`services.${i}.group`}>
                  <NativeSelect id={`services.${i}.group`} value={s.group} disabled={readOnly} onChange={(e) => set((p) => ({ services: updateAt(p.services, i, { group: e.target.value }) }))}>
                    <option value="">Other</option>
                    {theme.serviceGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field label="Description (optional)" htmlFor={`services.${i}.description`} error={err(`services.${i}.description`)} className="sm:col-span-2">
                <Textarea id={`services.${i}.description`} rows={2} value={s.description} disabled={readOnly} onChange={(e) => set((p) => ({ services: updateAt(p.services, i, { description: e.target.value }) }))} />
              </Field>
            </div>
          </RepeatItem>
        ))}
        <AddButton disabled={readOnly} onClick={() => set((p) => ({ services: [...p.services, { name: "", description: "", group: "" }] }))}>
          Add service
        </AddButton>
      </Group>

      <Group title="Facilities" description="Factual list: lab, pharmacy, X-ray, parking, lift, wheelchair access…">
        <NamedList
          id="facilities"
          items={f.facilities}
          onChange={(facilities) => set({ facilities })}
          err={err}
          readOnly={readOnly}
          addLabel="Add facility"
          placeholder="e.g. Pharmacy"
          suggestions={facilitySuggestions(f.kind)}
          fromForm={hints?.facilities}
          formRef={hints?.ref}
        />
      </Group>

      <Group title="Equipment" description="What you have, never how it compares.">
        <NamedList
          id="equipment"
          items={f.equipment}
          onChange={(equipment) => set({ equipment })}
          err={err}
          readOnly={readOnly}
          addLabel="Add equipment"
          placeholder="e.g. Digital X-ray"
          suggestions={equipmentSuggestions(f.kind, type)}
          fromForm={hints?.equipment}
          formRef={hints?.ref}
        />
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Gallery
export function GalleryStep({ form: f, set, err, readOnly }: EStepProps) {
  return (
    <Group title="Photos" description="Premises, equipment and team only. No patients and no before/after pictures, for any specialty.">
      <GalleryEditor
        value={f.gallery}
        onChange={(gallery) => set({ gallery })}
        maxPhotos={galleryMax(f.kind)}
        disabled={readOnly}
        errorFor={err}
        note="Reception, waiting area, rooms, equipment and signboard. Never patients or before/after pictures."
      />
    </Group>
  );
}
