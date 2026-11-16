"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { saveAccountAction, signDoctorUploadAction } from "@/app/account/actions";
import { InterestsPhotoFields, InterestsStoryFields } from "@/components/admin/doctor-editor/BeyondMedicineFields";
import { TimingEditor } from "@/components/admin/doctor-editor/TimingEditor";
import { Field, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { Input } from "@/components/ui/input";
import type { AccountClinic, AccountForm } from "@/lib/doctors/account";

const card = "space-y-4 rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-6";
const grid2 = "grid gap-4 sm:grid-cols-2";

/**
 * The doctor's own editor: timings, phones, address, fees, appointment note,
 * and the "Beyond medicine" photo and story. Everything is saved together with one button; errors show beside the
 * field. Saving updates the live page within seconds.
 */
export function AccountEditor({ initial }: { initial: AccountForm }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const err = (path: string) => errors[path];
  const update = (patch: Partial<AccountForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMessage(null);
  };
  const updateClinic = (i: number, patch: Partial<AccountClinic>) => {
    setForm((f) => ({ ...f, clinics: f.clinics.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
    setDirty(true);
    setMessage(null);
  };

  const save = () =>
    start(async () => {
      const res = await saveAccountAction({
        mobile: form.mobile,
        whatsapp: form.whatsapp,
        clinics: form.clinics.map(({ name: _n, area: _a, ...c }) => c),
        interestsStory: form.interestsStory,
        interestsPhoto: form.interestsPhoto ?? null,
      });
      if (res.ok) {
        setErrors({});
        setDirty(false);
        setMessage({ ok: true, text: "Saved. Your page is updated." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.getElementById(first)?.focus();
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5"
      noValidate
    >
      <section className={card}>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Phone and WhatsApp</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Patients use these for the Call and WhatsApp buttons on your page.</p>
        </div>
        <div className={grid2}>
          <Field label="Mobile" htmlFor="mobile" error={err("mobile")}>
            <Input id="mobile" type="tel" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(e) => update({ mobile: e.target.value })} aria-invalid={Boolean(err("mobile"))} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" help="Leave empty to use your mobile." error={err("whatsapp")}>
            <Input id="whatsapp" type="tel" inputMode="tel" placeholder="Same as mobile" value={form.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })} aria-invalid={Boolean(err("whatsapp"))} />
          </Field>
        </div>
      </section>

      {form.clinics.map((c, i) => (
        <section key={c.key} className={card} aria-labelledby={`clinic-${i}`}>
          <div>
            <h2 id={`clinic-${i}`} className="font-display text-xl font-semibold text-ink">
              {c.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{c.area}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">Timings</h3>
            <TimingEditor idPrefix={`clinics.${i}.timings`} value={c.timings} onChange={(timings) => updateClinic(i, { timings })} />
            {Object.entries(errors)
              .filter(([k]) => k.startsWith(`clinics.${i}.timings`))
              .slice(0, 1)
              .map(([k, v]) => (
                <p key={k} className="text-sm text-clay-text" role="alert">
                  {v}
                </p>
              ))}
          </div>

          <div className={grid2}>
            <Field label="Clinic phone" htmlFor={`clinics.${i}.phone`} error={err(`clinics.${i}.phone`)}>
              <Input id={`clinics.${i}.phone`} type="tel" inputMode="tel" value={c.phone} onChange={(e) => updateClinic(i, { phone: e.target.value })} aria-invalid={Boolean(err(`clinics.${i}.phone`))} />
            </Field>
            <Field label="Appointment note" htmlFor={`clinics.${i}.appointmentNote`} help="e.g. Walk-ins welcome. Call ahead for home visits." error={err(`clinics.${i}.appointmentNote`)}>
              <Input
                id={`clinics.${i}.appointmentNote`}
                maxLength={200}
                value={c.appointmentNote}
                onChange={(e) => updateClinic(i, { appointmentNote: e.target.value })}
                aria-invalid={Boolean(err(`clinics.${i}.appointmentNote`))}
              />
            </Field>
            <Field label="Address line 1" htmlFor={`clinics.${i}.addressLine1`} required error={err(`clinics.${i}.addressLine1`)}>
              <Input id={`clinics.${i}.addressLine1`} value={c.addressLine1} onChange={(e) => updateClinic(i, { addressLine1: e.target.value })} aria-invalid={Boolean(err(`clinics.${i}.addressLine1`))} />
            </Field>
            <Field label="Address line 2" htmlFor={`clinics.${i}.addressLine2`} error={err(`clinics.${i}.addressLine2`)}>
              <Input id={`clinics.${i}.addressLine2`} value={c.addressLine2} onChange={(e) => updateClinic(i, { addressLine2: e.target.value })} aria-invalid={Boolean(err(`clinics.${i}.addressLine2`))} />
            </Field>
            <Field label="Pincode" htmlFor={`clinics.${i}.pincode`} required error={err(`clinics.${i}.pincode`)}>
              <Input id={`clinics.${i}.pincode`} inputMode="numeric" maxLength={6} value={c.pincode} onChange={(e) => updateClinic(i, { pincode: e.target.value })} aria-invalid={Boolean(err(`clinics.${i}.pincode`))} />
            </Field>
            <Field label="Google Maps link" htmlFor={`clinics.${i}.mapsUrl`} help="Used for the Directions button." error={err(`clinics.${i}.mapsUrl`)}>
              <Input id={`clinics.${i}.mapsUrl`} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…" value={c.mapsUrl} onChange={(e) => updateClinic(i, { mapsUrl: e.target.value })} aria-invalid={Boolean(err(`clinics.${i}.mapsUrl`))} />
            </Field>
            <Field label="Consultation fee (₹)" htmlFor={`clinics.${i}.fee`} error={err(`clinics.${i}.fee`)}>
              <NumberInput id={`clinics.${i}.fee`} value={c.fee} onChange={(fee) => updateClinic(i, { fee })} aria-invalid={Boolean(err(`clinics.${i}.fee`))} />
            </Field>
            <div className="sm:pt-6">
              <SwitchField label="Show fee on my page" checked={c.showFee} onCheckedChange={(showFee) => updateClinic(i, { showFee })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">To change the clinic name or area, use “Request a change” below.</p>
        </section>
      ))}

      <section className={card} aria-labelledby="blog-heading">
        <div>
          <h2 id="blog-heading" className="font-display text-xl font-semibold text-ink">
            Beyond medicine
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A photo and a story about something you love or achieved outside medicine. They appear side by side on your page.
          </p>
        </div>

        <InterestsPhotoFields
          value={form.interestsPhoto}
          error={err("interestsPhoto.caption")}
          sign={signDoctorUploadAction}
          onUploadError={(text) => setMessage({ ok: false, text })}
          onChange={(interestsPhoto) => update({ interestsPhoto })}
        />

        <div className="border-t border-line pt-4">
          <InterestsStoryFields value={form.interestsStory} err={err} onChange={(interestsStory) => update({ interestsStory })} />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Save changes
          </button>
          {message && (
            <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
              {message.ok && <CheckCircle2 className="size-4" />} {message.text}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
