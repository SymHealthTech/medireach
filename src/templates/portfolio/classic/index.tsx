import Image from "next/image";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Clock,
  GraduationCap,
  HeartHandshake,
  IdCard,
  IndianRupee,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Stethoscope,
  Trophy,
} from "lucide-react";
import { ClinicHours } from "@/components/public/ClinicHours";
import { Gallery } from "@/components/public/Gallery";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { absUrl } from "@/lib/site";
import type { PortfolioTemplateProps, PublicClinic, PublicDoctor } from "@/templates/types";
import { actionsFor, ContactActions } from "./ContactActions";
import { ShowAfter } from "./ShowAfter";
import { SiteNav, type NavLink } from "./SiteNav";

/**
 * Classic portfolio template (design 1): the doctor's own one-page website.
 * Navbar → hero (photo + details + contact buttons) → about → qualifications
 * → clinics and timings → services → awards, memberships and publications →
 * beyond medicine (interests, photo + personal story) → gallery → footer. Every section
 * hides itself when empty.
 *
 * Presentation only: the H1, intro sentence, nearby doctors and JSON-LD come
 * from the shared wrapper, so every template emits identical SEO markup.
 *
 * NMC: no ratings, stars, review counts or testimonials anywhere.
 */

const CLINIC_TYPE_LABEL: Record<PublicClinic["type"], string> = {
  own_clinic: "Own clinic",
  hospital_visiting: "Visiting consultant",
  other: "Clinic",
};

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  googleBusiness: "Google Business Profile",
  practo: "Practo",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20 lg:scroll-mt-[72px] lg:py-24", className)}>
      <div className="mx-auto max-w-content">{children}</div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  tone = "light",
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className={cn("flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]", dark ? "text-marigold" : "text-lagoon")}>
        <span aria-hidden className="h-px w-8 bg-marigold" />
        {eyebrow}
      </p>
      <h2 id={`${id}-title`} className={cn("mt-3 font-display text-3xl font-semibold leading-tight sm:text-[40px]", dark ? "text-paper" : "text-ink")}>
        {title}
      </h2>
      {lead && <p className={cn("mt-4 text-[17px] leading-relaxed", dark ? "text-paper/75" : "text-body/80")}>{lead}</p>}
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li className={cn("rounded-full border border-ink/10 bg-surface px-3.5 py-1.5 text-sm font-medium text-ink", className)}>{children}</li>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroPhoto({ d }: { d: PublicDoctor }) {
  return (
    <div className="relative mx-auto size-[260px] sm:size-[300px] lg:ml-7 lg:size-[340px]">
      {/* Marigold halo and a dashed orbit behind the photo. */}
      <div aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-br from-marigold/70 via-marigold/25 to-sage" />
      <div aria-hidden className="absolute -inset-7 rounded-full border border-dashed border-ink/15" />

      <div className="relative size-full overflow-hidden rounded-full bg-sage shadow-lift ring-[6px] ring-paper">
        {d.photo ? (
          <Image
            src={d.photo.url}
            alt={d.photo.alt}
            fill
            priority
            sizes="(min-width: 1024px) 340px, (min-width: 640px) 300px, 260px"
            className="object-cover"
          />
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center font-display text-[96px] font-semibold text-ink/70">
            {initials(d.fullName)}
          </span>
        )}
      </div>

    </div>
  );
}

function HeroButtons({ d, cardHref }: { d: PublicDoctor; cardHref: string }) {
  // Call lives in the navbar and the mobile contact bar; the hero keeps four actions in one row.
  const actions = [
    ...actionsFor(d).filter((a) => a.label !== "Call"),
    { label: "Digital visiting card", mid: "Visiting card", short: "Card", href: cardHref, icon: IdCard },
  ];
  const style = (label: string) =>
    label === "WhatsApp"
      ? "bg-leaf-text text-white shadow-soft hover:bg-[#185c3a]"
      : label === "Digital visiting card"
        ? "border border-marigold/60 bg-marigold/10 text-ink hover:bg-marigold/20"
        : "border border-ink/15 bg-surface text-ink hover:border-ink/40";
  return (
    <div className="grid grid-cols-4 gap-2 md:flex md:gap-3 lg:grid lg:gap-2.5 xl:flex xl:gap-2.5">
      {actions.map(({ label, short, href, icon: Icon, ...a }) => {
        const mid = "mid" in a ? a.mid : label;
        const external = "external" in a && a.external;
        const download = "download" in a && a.download;
        return (
          <a
            key={label}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener" } : {})}
            {...(download ? { download: "" } : {})}
            aria-label={label}
            className={cn(
              // Stacked (icon over label) on phones and small laptops, one inline row otherwise.
              "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition active:scale-[.98]",
              "md:min-h-[48px] md:flex-row md:gap-2 md:whitespace-nowrap md:px-4 md:text-[15px]",
              "lg:min-h-[60px] lg:flex-col lg:gap-1 lg:px-2 lg:text-[13px] xl:min-h-[48px] xl:flex-row xl:gap-2 xl:px-4 xl:text-sm",
              style(label),
            )}
          >
            <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.9} />
            <span className="md:hidden">{short ?? label}</span>
            <span className="hidden lg:inline xl:hidden">{mid}</span>
            <span className="hidden md:inline lg:hidden xl:inline">{label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clinics
// ---------------------------------------------------------------------------

function ClinicCard({ clinic }: { clinic: PublicClinic }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-ink/5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-mint to-surface px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
            <Building2 aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              {clinic.site ? (
                <a href={clinic.site.url} className="underline-offset-4 hover:underline">
                  {clinic.name}
                </a>
              ) : (
                clinic.name
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {clinic.area.name}, {clinic.city.name}
            </p>
            {clinic.site && (
              <a href={clinic.site.url} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-lagoon hover:text-ink">
                Practises at {clinic.site.name}: visit website
                <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
              </a>
            )}
          </div>
        </div>
        <span className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-ink">{CLINIC_TYPE_LABEL[clinic.type]}</span>
      </div>

      <div className="grid flex-1 gap-6 px-5 py-5 sm:px-6 md:grid-cols-2">
        <div className="space-y-3 text-sm">
          <address className="flex gap-2.5 not-italic text-body">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={1.75} />
            {clinic.fullAddress}
          </address>
          {clinic.phone && (
            <p className="flex items-center gap-2.5">
              <Phone aria-hidden className="size-4 shrink-0 text-lagoon" strokeWidth={1.75} />
              <a href={`tel:+${clinic.phone}`} className="font-medium text-ink underline-offset-2 hover:underline">
                {formatPhone(clinic.phone)}
              </a>
            </p>
          )}
          {typeof clinic.fee === "number" && (
            <p className="flex items-center gap-2.5 text-body">
              <IndianRupee aria-hidden className="size-4 shrink-0 text-lagoon" strokeWidth={1.75} />
              Consultation fee <strong className="font-semibold text-ink">₹{clinic.fee.toLocaleString("en-IN")}</strong>
            </p>
          )}
          {clinic.appointmentNote && (
            <p className="rounded-xl bg-paper px-3.5 py-2.5 text-body">{clinic.appointmentNote}</p>
          )}
          <a
            href={clinic.directionsUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-ink/15 px-4 font-semibold text-ink transition hover:border-ink/40"
          >
            <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
            Get directions
          </a>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Clock aria-hidden className="size-3.5" strokeWidth={2} />
            Timings
          </p>
          <ClinicHours timings={clinic.timings} expandable={false} />
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClassicPortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const years = d.practiceSinceYear ? new Date().getFullYear() - d.practiceSinceYear : undefined;
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const cardHref = d.cardUrl ?? `${d.url}/card`;
  const firstName = d.fullName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0];
  const services = d.services;
  const hasRecognition = d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0;
  const story = d.interestsStory;

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(d.qualifications.length ? [{ label: "Education", href: "#qualifications" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    ...(services.length || d.conditionsTreated.length ? [{ label: "Services", href: "#services" }] : []),
    ...(hasRecognition ? [{ label: "Awards", href: "#recognition" }] : []),
    ...(d.gallery.length ? [{ label: "Gallery", href: "#gallery" }] : []),
  ];

  const stats = [
    years && years > 0 ? { value: `${years}+`, label: "Years of practice" } : null,
    d.languages.length ? { value: String(d.languages.length), label: d.languages.length > 1 ? "Languages spoken" : "Language spoken" } : null,
    d.clinics.length ? { value: String(d.clinics.length), label: d.clinics.length > 1 ? "Clinics" : "Clinic" } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <div id="top" className="bg-paper">
      <SiteNav
        name={d.fullName}
        tagline={d.primarySpecialty?.name}
        links={nav}
        cardHref={cardHref}
      />

      <main>
        {/* ── Hero ── */}
        <section className="mr-hero-bg relative overflow-hidden px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:pb-24 lg:pt-16">
          <div aria-hidden className="pointer-events-none absolute -right-40 top-10 hidden size-[520px] rounded-full border border-ink/[0.06] lg:block" />
          <div aria-hidden className="pointer-events-none absolute -right-20 top-32 hidden size-[360px] rounded-full border border-ink/[0.06] lg:block" />

          <div className="relative mx-auto grid max-w-content items-center gap-12 sm:gap-14 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-20 xl:gap-32">
            <HeroPhoto d={d} />

            <div className="min-w-0 space-y-6">
              {seo.heading}
              {d.degreesLine && <p className="text-lg font-semibold text-ink/85">{d.degreesLine}</p>}

              {stats.length > 0 && (
                <dl className="grid max-w-lg grid-cols-3 divide-x divide-ink/10 rounded-2xl bg-surface/80 py-4 shadow-soft ring-1 ring-ink/5">
                  {stats.map((s) => (
                    <div key={s.label} className="px-3 text-center sm:px-4">
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="font-display text-2xl font-semibold text-ink sm:text-3xl">{s.value}</dd>
                      <dd aria-hidden className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {s.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div id="hero-actions">
                <HeroButtons d={d} cardHref={cardHref} />
              </div>
            </div>
          </div>
        </section>

        {/* ── About + bio ── */}
        <Section id="about" className="bg-surface">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="space-y-6">
              <SectionHeading id="about" eyebrow="About" title={`Meet ${d.fullName}`} />
              <div className="text-[17px] leading-relaxed text-body/85">{seo.intro}</div>
              <ul className="space-y-3 text-sm">
                {d.languages.length > 0 && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <Languages aria-hidden className="size-5 shrink-0 text-lagoon" strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">Languages</span>
                      <span className="font-semibold text-ink">{d.languages.join(", ")}</span>
                    </span>
                  </li>
                )}
                {reg && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <BadgeCheck aria-hidden className="size-5 shrink-0 text-leaf-text" strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">Registration</span>
                      <span className="font-semibold text-ink">{reg}</span>
                    </span>
                  </li>
                )}
                {d.practiceSinceYear && (
                  <li className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3">
                    <Clock aria-hidden className="size-5 shrink-0 text-lagoon" strokeWidth={1.75} />
                    <span>
                      <span className="block text-xs text-muted-foreground">In practice since</span>
                      <span className="font-semibold text-ink">{d.practiceSinceYear}</span>
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="relative self-start overflow-hidden rounded-[28px] bg-paper p-6 ring-1 ring-ink/5 sm:p-10">
              <Stethoscope aria-hidden className="absolute -right-6 -top-6 size-40 text-ink/[0.04]" strokeWidth={1.25} />
              <h3 className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
                <span aria-hidden className="h-8 w-1 rounded-full bg-marigold" />
                Bio
              </h3>
              <div className="relative mt-5 space-y-4 text-[17px] leading-relaxed text-body">
                {d.fullBioHtml ? (
                  <div className="prose-bio" dangerouslySetInnerHTML={{ __html: d.fullBioHtml }} />
                ) : d.shortBio ? (
                  <p>{d.shortBio}</p>
                ) : (
                  seo.intro
                )}
              </div>
              {d.secondarySpecialties.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {[d.primarySpecialty, ...d.secondarySpecialties].filter(Boolean).map((s) => (
                    <Chip key={s!.slug}>{s!.name}</Chip>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        {/* ── Qualifications ── */}
        {d.qualifications.length > 0 && (
          <Section id="qualifications">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <SectionHeading
                id="qualifications"
                eyebrow="Qualifications"
                title="Education and training"
                lead={d.registration.council ? `Registered with the ${d.registration.council}.` : undefined}
                className="lg:sticky lg:top-28 lg:self-start"
              />
              <ol className="relative space-y-5 before:absolute before:bottom-6 before:left-[23px] before:top-6 before:w-px before:bg-gradient-to-b before:from-marigold before:to-sage">
                {d.qualifications.map((q, i) => (
                  <li key={`${q.degree}-${i}`} className="relative flex gap-5">
                    <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper ring-4 ring-paper">
                      <GraduationCap aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5 transition hover:shadow-lift sm:p-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="font-display text-2xl font-semibold text-ink">
                          {q.degree}
                          {q.specialization && !q.degree.includes("(") && (
                            <span className="font-medium text-lagoon"> · {q.specialization}</span>
                          )}
                        </p>
                        {q.year && (
                          <span className="rounded-full bg-marigold/15 px-3 py-1 text-xs font-semibold text-[#155e93]">{q.year}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-body/80">{q.institute}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        )}

        {/* ── Clinics and timings ── */}
        {d.clinics.length > 0 && (
          <Section id="clinics" className="bg-mist">
            <SectionHeading
              id="clinics"
              eyebrow="Clinic and timings"
              title={d.clinics.length > 1 ? "Where to find me" : "Visit the clinic"}
              lead={d.clinics.length > 1 ? `${firstName} consults at ${d.clinics.length} locations.` : undefined}
            />
            <div className={cn("mt-10 grid gap-6", d.clinics.length > 1 && "xl:grid-cols-2")}>
              {d.clinics.map((c) => (
                <ClinicCard key={c.id} clinic={c} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Services ── */}
        {(services.length > 0 || d.conditionsTreated.length > 0) && (
          <Section id="services" className="bg-surface">
            <SectionHeading id="services" eyebrow="Services" title="How I can help" />
            {services.length > 0 && (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <li key={s.name} className="flex gap-4 rounded-2xl border border-line bg-paper p-5 transition hover:border-lagoon/30 hover:bg-mint">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                      <Stethoscope aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 self-center">
                      <span className="block font-semibold text-ink">{s.name}</span>
                      {s.description && <span className="mt-1 block text-sm text-body/75">{s.description}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {d.conditionsTreated.length > 0 && (
              <div className="mt-8 rounded-2xl bg-sage/60 p-6 sm:p-8">
                <h3 className="font-display text-xl font-semibold text-ink">Conditions treated</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {d.conditionsTreated.map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* ── Awards and memberships ── */}
        {hasRecognition && (
          <Section id="recognition" className="mr-ink-bg">
            <SectionHeading id="recognition" eyebrow="Recognition" title="Awards and memberships" tone="dark" />
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {d.awards.length > 0 && (
                <div className="rounded-2xl bg-paper/[0.06] p-6 ring-1 ring-paper/10 sm:p-8">
                  <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-paper">
                    <Trophy aria-hidden className="size-5 text-marigold" strokeWidth={1.75} />
                    Awards
                  </h3>
                  <ul className="mt-5 space-y-4">
                    {d.awards.map((a) => (
                      <li key={`${a.title}-${a.year}`} className="flex gap-4">
                        <span className="w-14 shrink-0 pt-0.5 font-display text-lg font-semibold text-marigold">{a.year}</span>
                        <span>
                          <span className="block font-semibold text-paper">{a.title}</span>
                          <span className="block text-sm text-paper/65">{a.awardingBody}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.memberships.length > 0 && (
                <div className="rounded-2xl bg-paper/[0.06] p-6 ring-1 ring-paper/10 sm:p-8">
                  <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-paper">
                    <Building2 aria-hidden className="size-5 text-marigold" strokeWidth={1.75} />
                    Memberships
                  </h3>
                  <ul className="mt-5 space-y-4">
                    {d.memberships.map((m) => (
                      <li key={m.name} className="flex gap-4">
                        <span className="w-14 shrink-0 pt-0.5 font-display text-lg font-semibold text-marigold">{m.since ?? "—"}</span>
                        <span>
                          <span className="block font-semibold text-paper">{m.name}</span>
                          {m.since && <span className="block text-sm text-paper/65">Member since {m.since}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.publications.length > 0 && (
                <div className="rounded-2xl bg-paper/[0.06] p-6 ring-1 ring-paper/10 sm:p-8 lg:col-span-2">
                  <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-paper">
                    <Newspaper aria-hidden className="size-5 text-marigold" strokeWidth={1.75} />
                    Publications
                  </h3>
                  <ul className="mt-5 grid gap-4 md:grid-cols-2">
                    {d.publications.map((pub) => (
                      <li key={pub.title} className="flex gap-4">
                        <span className="w-14 shrink-0 pt-0.5 font-display text-lg font-semibold text-marigold">{pub.year ?? "—"}</span>
                        <span>
                          {pub.url ? (
                            <a href={pub.url} target="_blank" rel="noopener" className="inline-flex items-start gap-1 font-semibold text-paper underline-offset-4 hover:underline">
                              {pub.title}
                              <ArrowUpRight aria-hidden className="mt-1 size-3.5 shrink-0" strokeWidth={2} />
                            </a>
                          ) : (
                            <span className="block font-semibold text-paper">{pub.title}</span>
                          )}
                          {pub.journal && <span className="block text-sm text-paper/65">{pub.journal}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Beyond medicine: interests, then a photo beside a personal story ── */}
        {(d.interests.length > 0 || d.interestsPhoto || story) && (
          <Section id="interests" className="bg-mint">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <SectionHeading
                id="interests"
                eyebrow="Beyond medicine"
                title="Away from the clinic"
                lead={`What keeps ${firstName} busy outside consulting hours.`}
              />
              {d.interests.length > 0 && (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {d.interests.map((interest) => (
                    <li key={interest} className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-ink/5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marigold/15 text-[#155e93]">
                        <HeartHandshake aria-hidden className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="font-display text-lg font-semibold text-ink">{interest}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(d.interestsPhoto || story) && (
              <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
                {d.interestsPhoto && (
                  <figure
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-[28px] bg-sage shadow-lift sm:aspect-[3/2] lg:sticky lg:top-28 lg:aspect-[4/5] lg:self-start",
                      !story && "lg:col-span-2 lg:aspect-[21/9]",
                    )}
                  >
                    <Image
                      src={d.interestsPhoto.url}
                      alt={d.interestsPhoto.alt}
                      fill
                      sizes={story ? "(min-width: 1024px) 460px, 100vw" : "100vw"}
                      className="object-cover"
                    />
                    {d.interestsPhoto.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/85 to-transparent px-6 pb-5 pt-16 text-sm font-medium text-paper">
                        {d.interestsPhoto.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
                {story && (
                  <article
                    aria-labelledby="interests-story"
                    className={cn("rounded-[28px] bg-surface p-7 shadow-soft ring-1 ring-ink/5 sm:p-10 lg:p-12", !d.interestsPhoto && "lg:col-span-2")}
                  >
                    <h3 id="interests-story" className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl lg:text-[34px]">
                      {story.title}
                    </h3>
                    <span aria-hidden className="mt-5 block h-1 w-14 rounded-full bg-marigold" />
                    {story.paragraphs.length > 0 && (
                      <div className="mt-6 space-y-5 text-[17px] leading-[1.8] text-body/90">
                        {story.paragraphs.map((para, i) => (
                          <p
                            key={i}
                            className={cn(
                              i === 0 &&
                                "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[64px] first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-lagoon",
                            )}
                          >
                            {para}
                          </p>
                        ))}
                      </div>
                    )}
                  </article>
                )}
              </div>
            )}
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery">
            <SectionHeading id="gallery" eyebrow="Gallery" title="Inside the practice" />
            <div className="mt-10">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {seo.nearby && (
          <section className="px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-content">{seo.nearby}</div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-ink-900 px-4 text-paper sm:px-6">
        {phone && (
          <div className="mx-auto max-w-content pt-14">
            <div className="mr-ink-bg relative flex flex-col gap-6 overflow-hidden rounded-[28px] p-7 ring-1 ring-paper/10 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <span aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full border-[28px] border-paper/[0.04]" />
              <div className="relative max-w-xl">
                <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Planning a visit?</p>
                <p className="mt-3 text-paper/75">
                  Call or message {clinic ? clinic.name : "the clinic"} to check timings and book an appointment.
                </p>
              </div>
              <div className="relative flex flex-wrap gap-3">
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-marigold px-5 font-semibold text-white transition hover:brightness-105"
                >
                  <Phone aria-hidden className="size-[18px]" strokeWidth={1.9} />
                  Call {formatPhone(phone)}
                </a>
                {d.whatsapp && (
                  <a
                    href={`https://wa.me/${d.whatsapp}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-paper/25 px-5 font-semibold text-paper transition hover:border-paper/60"
                  >
                    <MessageCircle aria-hidden className="size-[18px]" strokeWidth={1.9} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-content pb-8 pt-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
            <div className="space-y-3">
              <p className="font-display text-2xl font-semibold">{d.fullName}</p>
              {d.primarySpecialty && <p className="text-marigold">{d.primarySpecialty.name}</p>}
              {d.degreesLine && <p className="text-sm text-paper/70">{d.degreesLine}</p>}
              {Object.keys(d.links).length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(d.links).map(([key, href]) => (
                    <li key={key}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener me"
                        className="inline-flex items-center gap-1 rounded-full border border-paper/20 px-3 py-1 text-sm text-paper/85 hover:border-paper/50"
                      >
                        {LINK_LABELS[key] ?? key}
                        <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <nav aria-label="Footer">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/50">Explore</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {nav.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-paper/80 hover:text-paper">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={cardHref} className="text-paper/80 hover:text-paper">
                    Visiting card
                  </a>
                </li>
              </ul>
            </nav>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/50">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-paper/85">
                {phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone aria-hidden className="size-4 text-marigold" strokeWidth={1.75} />
                    <a href={`tel:+${phone}`} className="hover:text-paper">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.whatsapp && (
                  <li className="flex items-center gap-2.5">
                    <MessageCircle aria-hidden className="size-4 text-marigold" strokeWidth={1.75} />
                    <a href={`https://wa.me/${d.whatsapp}`} target="_blank" rel="noopener" className="hover:text-paper">
                      WhatsApp
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 text-marigold" strokeWidth={1.75} />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-paper">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-marigold" strokeWidth={1.75} />
                    <span>
                      <span className="block font-semibold text-paper">{clinic.name}</span>
                      {clinic.fullAddress}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 space-y-2 border-t border-paper/10 pt-6 text-sm text-paper/60">
            <p>
              Information provided by the doctor.
              {d.registration.number && <> Registration: {reg}.</>}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                © {new Date().getFullYear()} {d.fullName}
              </span>
              <span>
                Website by{" "}
                <a href={absUrl("/")} className="underline underline-offset-2 hover:text-paper">
                  MediReach
                </a>
              </span>
              {/* Absolute: /login is blocked on doctor subdomains. */}
              <a href={absUrl("/login")} rel="nofollow" className="underline underline-offset-2 hover:text-paper">
                Doctor login
              </a>
            </p>
          </div>
        </div>
        {/* Room for the sticky contact bar on mobile. */}
        <div aria-hidden className="h-20 sm:hidden" />
      </footer>

      <ShowAfter targetId="hero-actions">
        <ContactActions doctor={d} variant="sticky" />
      </ShowAfter>
    </div>
  );
}
