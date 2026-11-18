"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { saveSiteAccountAction } from "@/app/account/actions";
import { TimingEditor } from "@/components/admin/doctor-editor/TimingEditor";
import { Field, SwitchField } from "@/components/admin/form/fields";
import { Input } from "@/components/ui/input";
import type { OwnerSiteForm } from "@/lib/establishments/owner";

const grid2 = "grid gap-4 sm:grid-cols-2";

/**
 * A clinic/hospital owner's editor for one site: timings (or Open 24×7),
 * phones, WhatsApp, emergency number, appointment note, visiting hours and
 * address. Saved with one button; errors show beside the field; the live site
 * updates within seconds.
 */
export function SiteAccountEditor({ initial }: { initial: OwnerSiteForm }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const hospital = form.kind === "hospital";
  const id = (path: string) => `site-${form.id}-${path}`;
  const err = (path: string) => errors[path];

  const update = (patch: Partial<OwnerSiteForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMessage(null);
  };
  const setAddress = (patch: Partial<OwnerSiteForm["address"]>) => update({ address: { ...form.address, ...patch } });

  const save = () =>
    start(async () => {
      const { name: _n, area: _a, kind: _k, ...payload } = form;
      const res = await saveSiteAccountAction(payload);
      if (res.ok) {
        setErrors({});
        setDirty(false);
        setMessage({ ok: true, text: "Saved. Your site is updated." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.getElementById(id(first))?.focus();
      }
    });

  const textField = (path: string, label: string, value: string, onChange: (v: string) => void, opts: { help?: string; required?: boolean; max?: number; type?: string; inputMode?: "tel" | "numeric" | "url" } = {}) => (
    <Field label={label} htmlFor={id(path)} help={opts.help} required={opts.required} error={err(path)}>
      <Input
        id={id(path)}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        maxLength={opts.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(err(path))}
      />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
      noValidate
    >
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Timings</h3>
        <SwitchField label="Open 24×7" checked={form.is24x7} onCheckedChange={(is24x7) => update({ is24x7 })} />
        {!form.is24x7 && <TimingEditor idPrefix={id("timings")} value={form.timings} onChange={(timings) => update({ timings })} />}
        {Object.entries(errors)
          .filter(([k]) => k.startsWith("timings"))
          .slice(0, 1)
          .map(([k, v]) => (
            <p key={k} className="text-sm text-clay-text" role="alert">
              {v}
            </p>
          ))}
        {textField("appointmentNote", "Appointment note", form.appointmentNote, (appointmentNote) => update({ appointmentNote }), {
          help: "e.g. Walk-ins welcome. Call ahead for procedures.",
          max: 200,
        })}
        {hospital &&
          textField("visitingHours", "Visiting hours", form.visitingHours, (visitingHours) => update({ visitingHours }), {
            help: "e.g. 11 am – 1 pm and 5 – 7 pm, two visitors at a time.",
            max: 200,
          })}
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-ink">Phone numbers</h3>
        <div className={grid2}>
          {form.phones.map((p, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                {textField(`phones.${i}`, i === 0 ? "Phone" : `Phone ${i + 1}`, p, (v) => update({ phones: form.phones.map((x, j) => (j === i ? v : x)) }), { type: "tel", inputMode: "tel" })}
              </div>
              {form.phones.length > 1 && (
                <button
                  type="button"
                  onClick={() => update({ phones: form.phones.filter((_, j) => j !== i) })}
                  aria-label={`Remove phone ${i + 1}`}
                  className="mb-1 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {form.phones.length < 4 && (
          <button type="button" onClick={() => update({ phones: [...form.phones, ""] })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-ink">
            <Plus className="size-4" /> Add a phone number
          </button>
        )}
        <div className={grid2}>
          {textField("whatsapp", "WhatsApp", form.whatsapp, (whatsapp) => update({ whatsapp }), { type: "tel", inputMode: "tel", help: "Leave empty to use the first phone." })}
          {hospital &&
            textField("emergencyPhone", "24×7 emergency number", form.emergencyPhone, (emergencyPhone) => update({ emergencyPhone }), {
              type: "tel",
              inputMode: "tel",
              help: "Shown in the bar at the top of every page.",
            })}
        </div>
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-ink">Address</h3>
        <div className={grid2}>
          {textField("address.line1", "Address line 1", form.address.line1, (line1) => setAddress({ line1 }), { required: true, max: 200 })}
          {textField("address.line2", "Address line 2", form.address.line2, (line2) => setAddress({ line2 }), { max: 200 })}
          {textField("address.landmark", "Landmark", form.address.landmark, (landmark) => setAddress({ landmark }), { max: 120 })}
          {textField("address.pincode", "Pincode", form.address.pincode, (pincode) => setAddress({ pincode }), { required: true, max: 6, inputMode: "numeric" })}
          {textField("address.parkingNote", "Parking note", form.address.parkingNote, (parkingNote) => setAddress({ parkingNote }), { max: 200 })}
          {textField("mapsUrl", "Google Maps link", form.mapsUrl, (mapsUrl) => update({ mapsUrl }), { type: "url", inputMode: "url", help: "Used for the Directions button." })}
        </div>
        <p className="text-xs text-muted-foreground">To change the name, area, services, doctors or photos, message us and our team updates it.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Save {form.name}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
            {message.ok && <CheckCircle2 className="size-4" />} {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
