"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { saveProfileAction } from "@/app/account/actions";
import { Field } from "@/components/admin/form/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/constants";
import type { ProfileForm } from "@/lib/doctors/self-profile";

const card = "space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6";

const LINKS: { key: keyof ProfileForm["links"]; label: string; placeholder: string }[] = [
  { key: "googleBusiness", label: "Google Business Profile", placeholder: "https://g.page/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/…" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@…" },
  { key: "website", label: "Other website", placeholder: "https://…" },
];

/**
 * The doctor edits their own page text: short bio, about, services,
 * conditions, languages, interests, public email and links. One Save button;
 * the NMC wording check runs on the server and errors show beside the field.
 */
export function ProfileEditor({ initial }: { initial: ProfileForm }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const update = (patch: Partial<ProfileForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMessage(null);
  };
  const setService = (i: number, patch: Partial<ProfileForm["services"][number]>) =>
    update({ services: form.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const moveService = (i: number, by: number) => {
    const next = [...form.services];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it!);
    update({ services: next });
  };

  const save = () =>
    start(async () => {
      const res = await saveProfileAction(form);
      if (res.ok) {
        setErrors({});
        setDirty(false);
        setMessage({ ok: true, text: "Saved. Your website is updated." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.getElementById(first)?.focus();
      }
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className={card} aria-labelledby="about-h">
        <div>
          <h2 id="about-h" className="font-display text-xl font-semibold text-ink">
            About you
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Factual and in your own words. Avoid words like “best”, “leading” or “guaranteed”: NMC rules don&apos;t allow them.</p>
        </div>
        <Field label="Short bio" htmlFor="shortBio" help={`One or two lines under your name. ${form.shortBio.length}/${LIMITS.shortBio}`} error={errors.shortBio}>
          <Textarea id="shortBio" rows={2} maxLength={LIMITS.shortBio} value={form.shortBio} onChange={(e) => update({ shortBio: e.target.value })} aria-invalid={errors.shortBio ? true : undefined} />
        </Field>
        <Field
          label="About"
          htmlFor="about"
          help="Leave a blank line between paragraphs. Start lines with “- ” for a bulleted list."
          error={errors.about}
        >
          <Textarea id="about" rows={10} maxLength={5000} value={form.about} onChange={(e) => update({ about: e.target.value })} aria-invalid={errors.about ? true : undefined} />
        </Field>
      </section>

      <section className={card} aria-labelledby="services-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="services-h" className="font-display text-xl font-semibold text-ink">
              Services
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Shown as cards with photos on your website, in this order.</p>
          </div>
          <span className="text-sm text-muted-foreground">{form.services.length}/30</span>
        </div>
        {errors.services && <p className="text-sm text-clay-text">{errors.services}</p>}
        <ol className="space-y-3">
          {form.services.map((s, i) => (
            <li key={i} className="rounded-xl border border-line bg-paper p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <span className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-lagoon text-xs font-bold text-white">{i + 1}</span>
                <div className="grid min-w-0 flex-1 gap-2">
                  <Field label="Service" htmlFor={`services.${i}.name`} error={errors[`services.${i}.name`]}>
                    <Input id={`services.${i}.name`} maxLength={80} value={s.name} onChange={(e) => setService(i, { name: e.target.value })} placeholder="e.g. Diabetes care" />
                  </Field>
                  <Field label="Short description" htmlFor={`services.${i}.description`} error={errors[`services.${i}.description`]}>
                    <Textarea id={`services.${i}.description`} rows={2} maxLength={200} value={s.description} onChange={(e) => setService(i, { description: e.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveService(i, -1)} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-mist disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === form.services.length - 1}
                    onClick={() => moveService(i, 1)}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-mist disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" aria-label={`Remove ${s.name || "service"}`} onClick={() => update({ services: form.services.filter((_, j) => j !== i) })} className="flex size-9 items-center justify-center rounded-lg text-clay-text hover:bg-clay/10">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {form.services.length < 30 && (
          <button
            type="button"
            onClick={() => update({ services: [...form.services, { name: "", description: "" }] })}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-ink/25 px-4 text-sm font-semibold text-ink hover:border-ink/50"
          >
            <Plus className="size-4" /> Add a service
          </button>
        )}
      </section>

      <section className={card} aria-labelledby="more-h">
        <h2 id="more-h" className="font-display text-xl font-semibold text-ink">
          Conditions, languages and interests
        </h2>
        <Field label="Conditions treated" htmlFor="conditions" help="One per line (or separated by commas)." error={errors.conditions}>
          <Textarea id="conditions" rows={6} value={form.conditions} onChange={(e) => update({ conditions: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Languages you speak" htmlFor="languages" help="e.g. English, Hindi, Marathi" error={errors.languages}>
            <Input id="languages" value={form.languages} onChange={(e) => update({ languages: e.target.value })} />
          </Field>
          <Field label="Interests outside medicine" htmlFor="interests" help="One per line or comma separated." error={errors.interests}>
            <Textarea id="interests" rows={3} value={form.interests} onChange={(e) => update({ interests: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className={card} aria-labelledby="links-h">
        <div>
          <h2 id="links-h" className="font-display text-xl font-semibold text-ink">
            Email and links
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">The public email appears on your website. Appointment requests are sent to your login email.</p>
        </div>
        <Field label="Public email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="clinic@example.com" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Field key={l.key} label={l.label} htmlFor={`links.${l.key}`} error={errors[`links.${l.key}`]}>
              <Input id={`links.${l.key}`} inputMode="url" value={form.links[l.key]} placeholder={l.placeholder} onChange={(e) => update({ links: { ...form.links, [l.key]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Save profile
          </button>
          {message ? (
            <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
              {message.ok && <CheckCircle2 className="size-4" />} {message.text}
            </p>
          ) : (
            dirty && <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
          )}
        </div>
      </div>
    </form>
  );
}
