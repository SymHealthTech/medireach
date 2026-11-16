"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SwitchField } from "@/components/admin/form/fields";
import { checkUrlKeyAction } from "@/app/admin/(dash)/doctors/actions";
import { profileDescription, profileTitle } from "@/lib/seo/profile";
import { absUrl, paths, ROOT_HOSTNAME } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";
import type { DoctorForm } from "@/lib/doctors/form";
import type { EditorOptions } from "@/lib/doctors/options";
import type { PublicDoctor } from "@/templates/types";
import { Group, type StepProps } from "../shared";

type Kind = "slug" | "shortSlug" | "subdomain";

/** Debounced server check that a URL key is free. */
function useAvailability(kind: Kind, value: string, doctorId: string | undefined, citySlug: string) {
  const [state, setState] = useState<{ status: "idle" | "checking" | "ok" | "bad"; message?: string }>({ status: "idle" });
  useEffect(() => {
    if (!value) return setState({ status: "idle" });
    setState({ status: "checking" });
    const t = setTimeout(async () => {
      const res = await checkUrlKeyAction({ id: doctorId, kind, value, citySlug: citySlug || undefined });
      if (!res.ok) return setState({ status: "bad", message: res.error });
      setState({ status: res.data.available ? "ok" : "bad", message: res.data.message });
    }, 400);
    return () => clearTimeout(t);
  }, [kind, value, doctorId, citySlug]);
  return state;
}

function Availability({ state }: { state: ReturnType<typeof useAvailability> }) {
  if (state.status === "idle") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        state.status === "ok" ? "text-leaf-text" : state.status === "bad" ? "text-clay-text" : "text-muted-foreground",
      )}
    >
      {state.status === "checking" ? <Loader2 className="size-3.5 animate-spin" /> : state.status === "ok" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {state.status === "checking" ? "Checking…" : state.message}
    </span>
  );
}

/** Just enough of a PublicDoctor to compute the Google title/description preview. */
export function previewDoctor(f: DoctorForm, o: EditorOptions): PublicDoctor {
  const spec = o.specialties.find((s) => s.id === f.primarySpecialtyId);
  const c = f.clinics[0];
  const area = c ? o.areas.find((a) => a.id === c.areaId) : undefined;
  const city = c ? o.cities.find((x) => x.id === c.cityId) : undefined;
  const degreesLine = f.qualifications
    .map((q) => {
      const name = o.degrees.find((d) => d.id === q.degreeId)?.name;
      return name ? (q.specialization && !name.includes("(") ? `${name} (${q.specialization})` : name) : null;
    })
    .filter(Boolean)
    .join(", ");
  return {
    fullName: f.displayName || [f.title || "Dr.", f.firstName, f.lastName].filter(Boolean).join(" "),
    degreesLine,
    shortBio: f.shortBio || undefined,
    primarySpecialty: spec ? { name: spec.name, slug: spec.slug, plural: spec.plural } : undefined,
    clinics: c && area && city ? [{ name: c.name, area: { name: area.name, slug: area.slug }, city: { name: city.name, slug: city.slug } }] : [],
    seo: { titleOverride: f.seo.titleOverride || undefined, descriptionOverride: f.seo.descriptionOverride || undefined, noindex: f.seo.noindex },
  } as unknown as PublicDoctor;
}

export function SeoStep({ form: f, set, err, options, readOnly, doctorId }: StepProps) {
  const citySlug = f.citySlug || options.cities.find((c) => c.id === f.clinics[0]?.cityId)?.slug || "";
  const slugState = useAvailability("slug", f.slug, doctorId, citySlug);
  const shortState = useAvailability("shortSlug", f.shortSlug, doctorId, citySlug);
  const subState = useAvailability("subdomain", f.subdomain, doctorId, citySlug);

  const doctor = previewDoctor(f, options);
  const title = profileTitle(doctor);
  const description = profileDescription(doctor);
  const pageUrl = f.slug && citySlug ? absUrl(paths.doctor(citySlug, f.slug)) : absUrl(`/${citySlug || "city"}/doctor/…`);
  const suggestions = [slugify(f.firstName), slugify(`${f.firstName} ${f.lastName}`)].filter((x, i, a) => x.length >= 3 && a.indexOf(x) === i);

  return (
    <div className="space-y-5">
      <Group title="Google preview" description="How the page should look in search results. Google may vary it.">
        <div className="rounded-xl border border-line bg-white p-4 font-[arial,sans-serif] text-[#202124]">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#f1f3f4] text-[10px] font-bold text-[#0e3b3c]">M</span>
            <span>
              <span className="block text-sm">MediReach</span>
              <span className="block text-[#4d5156]">{pageUrl.replace(/^https?:\/\//, "").replace(/\//g, " › ")}</span>
            </span>
          </div>
          <p className="mt-2 text-xl leading-snug text-[#1a0dab]">{title}</p>
          <p className="mt-1 text-sm leading-normal text-[#4d5156]">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Title {title.length}/60 · Description {description.length}/155
        </p>
      </Group>

      <Group title="Page addresses" description="Filled in automatically. Change them only if needed — once published, changing them breaks old links.">
        <Field label="Page address" htmlFor="slug" help={<>{absUrl(`/${citySlug || "pune"}/doctor/`)}<strong>{f.slug || "…"}</strong></>} error={err("slug")}>
          <div className="flex items-center gap-3">
            <Input id="slug" value={f.slug} disabled={readOnly} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} />
            <Availability state={slugState} />
          </div>
        </Field>
        <Field label="Short link" htmlFor="shortSlug" help={<>{absUrl("/")}<strong>{f.shortSlug || "dr-…"}</strong> — redirects to the page.</>} error={err("shortSlug")}>
          <div className="flex items-center gap-3">
            <Input id="shortSlug" value={f.shortSlug} disabled={readOnly} onChange={(e) => set({ shortSlug: e.target.value.toLowerCase() })} />
            <Availability state={shortState} />
          </div>
        </Field>
        <Field
          label="Website address (subdomain)"
          htmlFor="subdomain"
          help={<><strong>{f.subdomain || "name"}</strong>.{ROOT_HOSTNAME} — used on the visiting card and QR code.</>}
          error={err("subdomain")}
        >
          <div className="flex items-center gap-3">
            <Input id="subdomain" value={f.subdomain} disabled={readOnly} placeholder="e.g. amit" onChange={(e) => set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
            <Availability state={subState} />
          </div>
          {!f.subdomain && suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" disabled={readOnly} onClick={() => set({ subdomain: s })} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs hover:border-ink/40">
                  Use {s}
                </button>
              ))}
            </div>
          )}
        </Field>
      </Group>

      <Group title="Overrides (optional)" description="Leave empty to use the automatic title and description.">
        <Field label="Title override" htmlFor="seo.titleOverride" help={`${f.seo.titleOverride.length}/70`} error={err("seo.titleOverride")}>
          <Input id="seo.titleOverride" maxLength={70} value={f.seo.titleOverride} disabled={readOnly} onChange={(e) => set((f) => ({ seo: { ...f.seo, titleOverride: e.target.value } }))} />
        </Field>
        <Field label="Description override" htmlFor="seo.descriptionOverride" help={`${f.seo.descriptionOverride.length}/160`} error={err("seo.descriptionOverride")}>
          <Textarea id="seo.descriptionOverride" rows={2} maxLength={160} value={f.seo.descriptionOverride} disabled={readOnly} onChange={(e) => set((f) => ({ seo: { ...f.seo, descriptionOverride: e.target.value } }))} />
        </Field>
        <SwitchField
          label="Hide from Google (noindex)"
          description="The page stays reachable by link but won't appear in search or the sitemap."
          checked={f.seo.noindex}
          disabled={readOnly}
          onCheckedChange={(noindex) => set((f) => ({ seo: { ...f.seo, noindex } }))}
        />
      </Group>
    </div>
  );
}
