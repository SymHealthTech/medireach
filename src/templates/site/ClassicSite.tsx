import Image from "next/image";
import {
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  Car,
  Clock,
  Landmark,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Siren,
  Users,
  Wrench,
} from "lucide-react";
import { ClinicHours } from "@/components/public/ClinicHours";
import { Gallery } from "@/components/public/Gallery";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { absUrl } from "@/lib/site";
import { ShowAfter } from "@/templates/portfolio/classic/ShowAfter";
import { SiteNav, type NavLink } from "@/templates/portfolio/classic/SiteNav";
import type { PublicEstablishment, PublicSiteDoctor, SiteTemplateProps } from "@/templates/types";
import { THEME_ICONS } from "@/themes/icons";
import { getTheme, sectionLabel, sectionsFor, themeCssVars, type SiteSection } from "@/themes/specialty";

/**
 * Classic clinic / small-hospital site (design 1), skinned by the specialty
 * theme (DESIGN_BRIEF.md §5 and §8): colours come from CSS variables, the
 * section order and labels from the theme. Hospitals add the sticky 24×7 bar,
 * departments, beds, insurance and visiting hours. Every section hides itself
 * when empty.
 *
 * Presentation only: H1, intro, breadcrumbs, quick facts and JSON-LD come from
 * the shared wrapper. NMC: no ratings, reviews, testimonials or before/after.
 */

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  googleBusiness: "Google Business Profile",
  practo: "Practo",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

// Theme colours (set as CSS variables on the page root).
const T = {
  primaryBg: "bg-[var(--theme-primary)]",
  primaryText: "text-[var(--theme-primary)]",
  softBg: "bg-[var(--theme-soft)]",
  accentBg: "bg-[var(--theme-accent)]",
};

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function Section({ id, label, tone = "plain", children }: { id: string; label: string; tone?: "plain" | "soft" | "white"; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-16 px-4 py-14 sm:px-6 sm:py-20 lg:scroll-mt-[72px]", tone === "soft" ? T.softBg : tone === "white" ? "bg-surface" : "bg-paper")}
    >
      <div className="mx-auto max-w-content">
        <h2 id={`${id}-title`} className={cn("flex items-center gap-3 font-display text-3xl font-semibold leading-tight sm:text-[38px]", T.primaryText)}>
          <span aria-hidden className={cn("h-8 w-1.5 rounded-full", T.accentBg)} />
          {label}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function DoctorCard({ d }: { d: PublicSiteDoctor }) {
  const body = (
    <>
      {d.photo ? (
        <Image src={d.photo.url} alt={d.photo.alt} width={72} height={72} className="size-16 shrink-0 rounded-full object-cover" />
      ) : (
        <span className={cn("flex size-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-semibold text-white", T.primaryBg)}>
          {initials(d.name)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold text-ink">{d.name}</span>
        {d.specialty && <span className={cn("block text-sm font-semibold", T.primaryText)}>{d.specialty}</span>}
        {d.qualifications && <span className="block text-sm text-muted-foreground">{d.qualifications}</span>}
        {d.role && <span className="mt-1 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-body">{d.role}</span>}
        {d.url && (
          <span className={cn("mt-2 flex items-center gap-1 text-sm font-semibold", T.primaryText)}>
            View profile <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </span>
    </>
  );
  const cls = "flex items-start gap-4 rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5";
  return d.url ? (
    <a href={d.url} {...(d.external ? { target: "_blank", rel: "noopener nofollow" } : {})} className={cn(cls, "transition hover:-translate-y-1 hover:shadow-lift")}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function ItemList({ items, icon: Icon }: { items: { name: string; description?: string }[]; icon: typeof Wrench }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((x) => (
        <li key={x.name} className="flex gap-3 rounded-xl bg-surface p-4 shadow-soft ring-1 ring-ink/5">
          <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
          <span>
            <span className="block font-semibold text-ink">{x.name}</span>
            {x.description && <span className="block text-sm text-body/80">{x.description}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function contactActions(s: PublicEstablishment) {
  const phone = s.phones[0];
  const actions: { label: string; href: string; icon: typeof Phone; external?: boolean }[] = [];
  if (phone) actions.push({ label: "Call", href: `tel:+${phone}`, icon: Phone });
  if (s.whatsapp) {
    const text = `Hello ${s.name}, I found your website on MediReach.`;
    actions.push({ label: "WhatsApp", href: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}`, icon: MessageCircle, external: true });
  }
  actions.push({ label: "Directions", href: s.directionsUrl, icon: MapPin, external: true });
  return actions;
}

/** Services grouped as the theme defines (anything ungrouped goes last). */
function groupedServices(s: PublicEstablishment, groups: readonly string[]) {
  if (!groups.length) return [{ group: "", items: s.services }];
  const out = groups.map((g) => ({ group: g, items: s.services.filter((x) => x.group === g) }));
  const rest = s.services.filter((x) => !x.group || !groups.includes(x.group));
  return [...out, { group: out.some((o) => o.items.length) ? "Other services" : "", items: rest }].filter((g) => g.items.length);
}

export function ClassicSite({ site: s, seo }: SiteTemplateProps) {
  const theme = getTheme(s.themeKey, s.kind);
  const Icon = THEME_ICONS[theme.icon];
  const hospital = s.kind === "hospital";
  const actions = contactActions(s);
  const emergency = s.emergencyPhone ?? (hospital ? s.phones[0] : undefined);

  const has: Record<SiteSection, boolean> = {
    about: true,
    services: s.services.length > 0,
    doctors: s.doctors.length > 0,
    timings: s.is24x7 || s.timings.length > 0 || Boolean(s.appointmentNote),
    facilities: s.facilities.length > 0 || s.equipment.length > 0,
    gallery: s.gallery.length > 0,
    location: true,
    faq: true,
    departments: s.departments.length > 0,
    beds: Boolean(s.beds),
    insurance: Boolean(s.insurance),
    visitingHours: Boolean(s.visitingHours),
  };
  const sections = sectionsFor(theme, s.kind).filter((x) => has[x]);
  const label = (x: SiteSection) => {
    const l = sectionLabel(theme, x);
    return hospital && x === "about" && l === "About the clinic" ? "About the hospital" : l;
  };
  const nav: NavLink[] = sections
    .filter((x) => ["about", "services", "doctors", "departments", "timings", "facilities", "gallery", "location"].includes(x))
    .map((x) => ({ label: label(x).replace(/ and .*$/, ""), href: `#${x}` }));

  const tone = (i: number): "plain" | "white" => (i % 2 === 0 ? "white" : "plain");

  const render = (x: SiteSection, i: number) => {
    switch (x) {
      case "about":
        return (
          <Section key={x} id="about" label={label(x)} tone={tone(i)}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
              <div className="space-y-4 text-[17px] leading-relaxed text-body">
                <div>{seo.intro}</div>
                {s.aboutHtml ? <div className="prose-bio" dangerouslySetInnerHTML={{ __html: s.aboutHtml }} /> : s.shortDescription && <p>{s.shortDescription}</p>}
              </div>
              <ul className="space-y-3 self-start text-sm">
                {s.registration?.number && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <BadgeCheck aria-hidden className="size-5 shrink-0 text-leaf-text" strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">Registration</span>
                      <span className="font-semibold text-ink">{[s.registration.authority, s.registration.number].filter(Boolean).join(" · ")}</span>
                    </span>
                  </li>
                )}
                {s.languages.length > 0 && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <Languages aria-hidden className={cn("size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">Languages</span>
                      <span className="font-semibold text-ink">{s.languages.join(", ")}</span>
                    </span>
                  </li>
                )}
                {s.doctors.length > 0 && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <Users aria-hidden className={cn("size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">Doctors</span>
                      <span className="font-semibold text-ink">{s.doctors.length}</span>
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </Section>
        );
      case "services":
        return (
          <Section key={x} id="services" label={label(x)} tone={tone(i)}>
            <div className="space-y-8">
              {groupedServices(s, theme.serviceGroups).map((g) => (
                <div key={g.group || "all"}>
                  {g.group && <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{g.group}</h3>}
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((svc) => (
                      <li key={svc.name} className="rounded-xl bg-surface p-4 shadow-soft ring-1 ring-ink/5">
                        <span className="flex items-center gap-2 font-semibold text-ink">
                          <span aria-hidden className={cn("size-2 shrink-0 rounded-full", T.accentBg)} />
                          {svc.name}
                        </span>
                        {svc.description && <span className="mt-1 block text-sm text-body/80">{svc.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        );
      case "doctors":
        return (
          <Section key={x} id="doctors" label={label(x)} tone={tone(i)}>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.doctors.map((d) => (
                <li key={d.id ?? d.name}>
                  <DoctorCard d={d} />
                </li>
              ))}
            </ul>
          </Section>
        );
      case "departments":
        return (
          <Section key={x} id="departments" label={label(x)} tone={tone(i)}>
            <ul className="grid gap-4 md:grid-cols-2">
              {s.departments.map((dep) => (
                <li key={dep.name} className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5">
                  <h3 className="font-display text-xl font-semibold text-ink">{dep.name}</h3>
                  {dep.description && <p className="mt-1 text-sm text-body/80">{dep.description}</p>}
                  {dep.doctors.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {dep.doctors.map((d) => (
                        <li key={d.id ?? d.name}>
                          {d.url ? (
                            <a href={d.url} className={cn("font-semibold hover:underline", T.primaryText)}>
                              {d.name}
                            </a>
                          ) : (
                            <span className="font-semibold text-ink">{d.name}</span>
                          )}
                          {d.specialty && <span className="text-muted-foreground"> · {d.specialty}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        );
      case "timings":
        return (
          <Section key={x} id="timings" label={label(x)} tone={tone(i)}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5 sm:p-6">
                {s.is24x7 ? (
                  <p className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
                    <Clock aria-hidden className={cn("size-6", T.primaryText)} strokeWidth={1.75} /> Open 24 hours, all 7 days
                  </p>
                ) : (
                  <ClinicHours timings={s.timings} expandable={false} />
                )}
              </div>
              {s.appointmentNote && <p className={cn("self-start rounded-2xl p-5 text-body", T.softBg)}>{s.appointmentNote}</p>}
            </div>
          </Section>
        );
      case "facilities":
        return (
          <Section key={x} id="facilities" label={label(x)} tone={tone(i)}>
            <div className="space-y-8">
              {s.facilities.length > 0 && (
                <div>
                  {s.equipment.length > 0 && <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Facilities</h3>}
                  <ItemList items={s.facilities} icon={ShieldCheck} />
                </div>
              )}
              {s.equipment.length > 0 && (
                <div>
                  {s.facilities.length > 0 && <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Equipment</h3>}
                  <ItemList items={s.equipment} icon={Wrench} />
                </div>
              )}
            </div>
          </Section>
        );
      case "beds":
        return (
          <Section key={x} id="beds" label={label(x)} tone={tone(i)}>
            <div className="flex flex-wrap gap-4">
              <div className={cn("flex items-center gap-4 rounded-2xl p-5", T.softBg)}>
                <BedDouble aria-hidden className={cn("size-8", T.primaryText)} strokeWidth={1.5} />
                <span>
                  <span className={cn("block font-display text-3xl font-semibold", T.primaryText)}>{s.beds!.total}</span>
                  <span className="text-sm text-body">beds in total</span>
                </span>
              </div>
              {s.beds!.types.map((b) => (
                <div key={b.type} className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5">
                  <span className="block font-display text-2xl font-semibold text-ink">{b.count}</span>
                  <span className="text-sm text-body">{b.type}</span>
                </div>
              ))}
            </div>
          </Section>
        );
      case "insurance":
        return (
          <Section key={x} id="insurance" label={label(x)} tone={tone(i)}>
            {s.insurance!.cashless && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-leaf/15 px-3 py-1 text-sm font-semibold text-leaf-text">
                <ShieldCheck aria-hidden className="size-4" /> Cashless treatment available
              </p>
            )}
            {s.insurance!.providers.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {s.insurance!.providers.map((p) => (
                  <li key={p} className="rounded-full border border-ink/10 bg-surface px-3.5 py-1.5 text-sm font-medium text-ink">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      case "visitingHours":
        return (
          <Section key={x} id="visiting-hours" label={label(x)} tone={tone(i)}>
            <p className="text-lg text-body">{s.visitingHours}</p>
          </Section>
        );
      case "gallery":
        return (
          <Section key={x} id="gallery" label={label(x)} tone={tone(i)}>
            <Gallery images={s.gallery} />
          </Section>
        );
      case "location":
        return (
          <Section key={x} id="location" label={label(x)} tone={tone(i)}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="space-y-4">
                <address className="flex gap-3 not-italic text-lg text-body">
                  <MapPin aria-hidden className={cn("mt-1 size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
                  {s.address.fullAddress}
                </address>
                {s.address.landmark && (
                  <p className="flex gap-3 text-body">
                    <Landmark aria-hidden className={cn("mt-0.5 size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
                    {s.address.landmark}
                  </p>
                )}
                {s.address.parkingNote && (
                  <p className="flex gap-3 text-body">
                    <Car aria-hidden className={cn("mt-0.5 size-5 shrink-0", T.primaryText)} strokeWidth={1.75} />
                    {s.address.parkingNote}
                  </p>
                )}
                <a
                  href={s.directionsUrl}
                  target="_blank"
                  rel="noopener"
                  className={cn("inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold text-white", T.primaryBg)}
                >
                  <MapPin aria-hidden className="size-5" strokeWidth={1.75} /> Get directions
                </a>
              </div>
              <iframe
                title={`Map showing ${s.name}`}
                src={s.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full rounded-2xl border-0 shadow-soft ring-1 ring-ink/5 sm:h-80"
              />
            </div>
          </Section>
        );
      case "faq":
        return (
          <Section key={x} id="quick-facts" label={label(x)} tone={tone(i)}>
            {seo.quickFacts}
          </Section>
        );
    }
  };

  return (
    <div id="top" className="bg-paper" style={themeCssVars(theme)}>
      {hospital && emergency && (
        <div className={cn("sticky top-0 z-50 text-white", T.primaryBg)}>
          <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6">
            <span className="flex items-center gap-2 font-semibold">
              <Siren aria-hidden className="size-4 shrink-0" />
              <span className="sm:hidden">{s.is24x7 ? "24×7 emergency" : "Emergency"}</span>
              <span className="hidden sm:inline">{s.is24x7 ? "24×7 emergency and contact" : "Emergency contact"}</span>
            </span>
            <a href={`tel:+${emergency}`} className="whitespace-nowrap rounded-full bg-white px-3 py-1 font-semibold text-ink">
              {formatPhone(emergency)}
            </a>
          </div>
        </div>
      )}

      <SiteNav name={s.name} tagline={[s.kind === "hospital" ? "Hospital" : s.category?.name, s.address.area.name].filter(Boolean).join(" · ")} links={nav} {...(s.cardUrl ? { cardHref: s.cardUrl } : {})} />

      <main>
        <section className={cn("relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:pb-20", T.softBg)}>
          <div className="relative mx-auto max-w-content space-y-6">
            {seo.breadcrumbs}
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
              <div className="min-w-0 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  {s.logo && <Image src={s.logo.url} alt={s.logo.alt} width={64} height={64} className="size-14 rounded-xl bg-white object-cover shadow-soft" />}
                  <span className={cn("inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold", T.primaryText)}>
                    <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                    {s.kind === "hospital" ? "Hospital" : (s.category?.name ?? "Clinic")}
                  </span>
                  {s.is24x7 && <span className="rounded-full bg-leaf px-3 py-1 text-sm font-semibold text-white">Open 24×7</span>}
                </div>
                {seo.heading}
                {(s.tagline || s.shortDescription) && <p className="max-w-2xl text-lg leading-relaxed text-body">{s.tagline ?? s.shortDescription}</p>}
                {!s.is24x7 && s.timings.length > 0 && (
                  <div className="max-w-md rounded-2xl bg-white/80 p-4 shadow-soft">
                    <ClinicHours timings={s.timings} />
                  </div>
                )}
                <div id="hero-actions" className="flex flex-wrap gap-3">
                  {actions.map((a, i) => (
                    <a
                      key={a.label}
                      href={a.href}
                      {...(a.external ? { target: "_blank", rel: "noopener" } : {})}
                      className={cn(
                        "inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold transition active:scale-[.98]",
                        i === 0 ? cn(T.primaryBg, "text-white") : "bg-white text-ink ring-1 ring-ink/10 hover:ring-ink/30",
                      )}
                    >
                      <a.icon aria-hidden className="size-5" strokeWidth={1.75} /> {a.label}
                    </a>
                  ))}
                </div>
              </div>
              <div className="relative mx-auto hidden w-[340px] lg:block">
                {s.coverPhoto ? (
                  <Image src={s.coverPhoto.url} alt={s.coverPhoto.alt} width={680} height={520} priority className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-lift" />
                ) : (
                  <div aria-hidden className="relative flex aspect-square items-center justify-center rounded-full bg-white/70">
                    <span className={cn("absolute inset-6 rounded-full border-2 border-dashed opacity-60", "border-[var(--theme-accent)]")} />
                    <Icon className={cn("size-36", T.primaryText)} strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>
            {s.coverPhoto && (
              <Image src={s.coverPhoto.url} alt={s.coverPhoto.alt} width={800} height={400} className="aspect-[16/9] w-full rounded-2xl object-cover shadow-soft lg:hidden" />
            )}
          </div>
        </section>

        {sections.map((x, i) => render(x, i))}
      </main>

      <footer className={cn("px-4 text-white sm:px-6", T.primaryBg)}>
        <div className="mx-auto max-w-content pb-8 pt-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr]">
            <div className="space-y-3">
              <p className="font-display text-2xl font-semibold">{s.name}</p>
              <p className="text-white/80">{[s.kind === "hospital" ? "Hospital" : s.category?.name, `${s.address.area.name}, ${s.address.city.name}`].filter(Boolean).join(" · ")}</p>
              {Object.keys(s.links).length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(s.links).map(([key, href]) => (
                    <li key={key}>
                      <a href={href} target="_blank" rel="noopener me" className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-sm text-white/90 hover:border-white/60">
                        {LINK_LABELS[key] ?? key}
                        <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="space-y-3 text-sm text-white/90">
              {s.phones.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <Phone aria-hidden className="size-4" strokeWidth={1.75} />
                  <a href={`tel:+${p}`} className="hover:underline">
                    {formatPhone(p)}
                  </a>
                </li>
              ))}
              {s.email && (
                <li className="flex items-center gap-2.5">
                  <Mail aria-hidden className="size-4" strokeWidth={1.75} />
                  <a href={`mailto:${s.email}`} className="break-all hover:underline">
                    {s.email}
                  </a>
                </li>
              )}
              <li className="flex gap-2.5">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                {s.address.fullAddress}
              </li>
            </ul>
            <nav aria-label="Footer">
              <ul className="space-y-2 text-sm">
                {nav.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-white/85 hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="mt-12 space-y-2 border-t border-white/15 pt-6 text-sm text-white/75">
            <p>
              Information provided by {s.name}.
              {s.registration?.number && <> Registration: {[s.registration.authority, s.registration.number].filter(Boolean).join(" ")}.</>}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                © {new Date().getFullYear()} {s.name}
              </span>
              <span>
                Website by{" "}
                <a href={absUrl("/")} className="underline underline-offset-2 hover:text-white">
                  MediReach
                </a>
              </span>
              <a href={absUrl("/login")} rel="nofollow" className="underline underline-offset-2 hover:text-white">
                Owner login
              </a>
            </p>
          </div>
        </div>
        <div aria-hidden className="h-20 sm:hidden" />
      </footer>

      <ShowAfter targetId="hero-actions">
        <nav aria-label="Contact" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-3 py-2 backdrop-blur sm:hidden">
          <ul className="grid grid-cols-3 gap-2">
            {actions.map((a) => (
              <li key={a.label}>
                <a
                  href={a.href}
                  {...(a.external ? { target: "_blank", rel: "noopener" } : {})}
                  className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold text-ink"
                >
                  <a.icon aria-hidden className={cn("size-5", T.primaryText)} strokeWidth={1.75} />
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </ShowAfter>
    </div>
  );
}
