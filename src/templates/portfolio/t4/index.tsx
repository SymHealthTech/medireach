import Image from "next/image";
import {
  Activity,
  Apple,
  ArrowRight,
  ArrowUpRight,
  Award,
  Baby,
  BadgeCheck,
  Bone,
  Brain,
  CalendarHeart,
  ClipboardCheck,
  Droplet,
  Eye,
  Flame,
  HeartPulse,
  House,
  IdCard,
  Languages,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  UserPlus,
  Users,
  Wind,
} from "lucide-react";
import { Gallery } from "@/components/public/Gallery";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { absUrl } from "@/lib/site";
import { DAY_SHORT, formatSlots, openDaysSummary, slotsForDay, WEEK_ORDER } from "@/lib/timings";
import { describeService, type ServiceIcon } from "@/content/service-descriptions";
import { AppointmentForm } from "@/templates/portfolio/t2/AppointmentForm";
import { HealthTipsSection } from "@/templates/portfolio/t2/HealthTipsSection";
import { CountUp, RevealObserver } from "@/templates/portfolio/t2/Motion";
import { BgSlides } from "@/templates/shared/BgSlides";
import { specialtyPhotos } from "@/templates/shared/specialty-photos";
import { splitClinics } from "@/templates/shared/clinic-split";
import { VisitingHospitals } from "@/templates/shared/VisitingHospitals";
import type { PortfolioTemplateProps, PublicDoctor } from "@/templates/types";
import { ClinicCards } from "./ClinicCards";
import { Nav, type NavLink } from "./Nav";
import { Divider, Mandala, Rosette } from "./Ornaments";

/**
 * Portfolio design 4 — "Warm Heritage". A warm, traditional one-page website:
 * forest green, terracotta, saffron and cream paper, Fraunces headings, line
 * mandalas and scalloped edges.
 *
 * letterhead nav (name centred) → hero over a photo carousel where each photo
 * opens in a widening circle, round portrait, all centred → scalloped edge →
 * three info medallions → about (framed portrait, facts) → services (rosette tiles) → numbers (forest band) → conditions →
 * education (centred path) → clinics (first open, others open on request) → appointment →
 * recognition (medallions) → beyond medicine (tilted photo) → health tips →
 * gallery → FAQ → footer, plus a mobile bar.
 *
 * Every section hides itself when its data is empty. Photos follow the
 * specialty (templates/shared/specialty-photos.ts). Presentation only: H1,
 * intro, and JSON-LD come from the shared wrapper. Shared
 * widgets from design 2 are re-coloured by `.wh-theme` (globals.css).
 *
 * NMC: no ratings, reviews, testimonials, patient counts or superlatives.
 */

const SERVICE_ICONS: Record<ServiceIcon, typeof Stethoscope> = {
  stethoscope: Stethoscope,
  droplet: Droplet,
  heart: HeartPulse,
  syringe: Syringe,
  clipboard: ClipboardCheck,
  thermometer: Thermometer,
  apple: Apple,
  users: Users,
  activity: Activity,
  baby: Baby,
  bone: Bone,
  eye: Eye,
  smile: Smile,
  brain: Brain,
  wind: Wind,
  sparkles: Sparkles,
  home: House,
  pill: Pill,
};

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  googleBusiness: "Google",
  practo: "Practo",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

function initials(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

const delay = (ms: number) => ({ ["--cm-delay" as string]: `${ms}ms` });

function Section({ id, className, children, labelled = true }: { id: string; className?: string; children: React.ReactNode; labelled?: boolean }) {
  return (
    <section id={id} {...(labelled ? { "aria-labelledby": `${id}-title` } : {})} className={cn("relative scroll-mt-20 overflow-hidden px-4 py-20 sm:px-6 lg:py-28", className)}>
      <div className="relative mx-auto max-w-[1180px]">{children}</div>
    </section>
  );
}

function Heading({
  id,
  eyebrow,
  title,
  lead,
  light,
  left,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  light?: boolean;
  left?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("cm-reveal max-w-2xl", !left && "mx-auto text-center", className)}>
      <p className={cn("text-xs font-semibold uppercase tracking-[0.3em]", light ? "text-wh-saffron" : "text-wh-terra")}>{eyebrow}</p>
      <h2 id={`${id}-title`} className={cn("mt-3 font-display text-[34px] font-semibold leading-[1.12] sm:text-[44px]", light ? "text-wh-cream" : "text-wh-forest")}>
        {title}
      </h2>
      <Divider center={!left} className="mt-4" />
      {lead && <p className={cn("mt-4 text-[17px] leading-relaxed", light ? "text-wh-cream/75" : "text-wh-muted")}>{lead}</p>}
    </div>
  );
}

function faqs(d: PublicDoctor): { q: string; a: string }[] {
  const c = d.clinics[0];
  const out: { q: string; a: string }[] = [];
  if (c) {
    const hours = openDaysSummary(c.timings).replace(/ \| /g, "; ");
    out.push({
      q: `Where does ${d.fullName} consult?`,
      a: `${c.name}, ${c.fullAddress}.${
        d.clinics.length > 1
          ? ` Also at ${d.clinics
              .slice(1)
              .map((x) => `${x.name}, ${x.area.name}`)
              .join(" and ")}.`
          : ""
      }`,
    });
    if (hours) out.push({ q: "What are the clinic timings?", a: `${c.name}: ${hours}.${c.appointmentNote ? ` ${c.appointmentNote}` : ""}` });
  }
  out.push({
    q: "How do I book an appointment?",
    a: `Send a request with the form on this page and the clinic will call you back to fix a time.${d.phone ? ` You can also call the clinic${d.whatsapp ? " or send a WhatsApp message" : ""}.` : ""}`,
  });
  if (c && typeof c.fee === "number")
    out.push({
      q: "What is the consultation fee?",
      a: `The consultation fee at ${c.name} is ₹${c.fee.toLocaleString("en-IN")}. Tests, vaccines and medicines are charged separately.`,
    });
  if (d.languages.length) out.push({ q: `Which languages does ${d.fullName} speak?`, a: `${d.languages.join(", ")}.` });
  return out;
}

export default function WarmHeritagePortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const photos = specialtyPhotos(d);
  const { main: mainClinics, visiting } = splitClinics(d.clinics);
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const cardHref = d.cardUrl ?? `${d.url}/card`;
  const firstName = d.fullName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0];
  const years = d.practiceSinceYear ? new Date().getFullYear() - d.practiceSinceYear : undefined;
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const regMore = [d.registration.year ? `Registered in ${d.registration.year}` : "", d.registration.nmrId ? `NMR ID ${d.registration.nmrId}` : ""].filter(Boolean).join(" · ");
  const tips = d.healthTips ?? [];
  const story = d.interestsStory;
  const waHref = d.whatsapp ? `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(`Hello ${d.fullName}, I would like to book an appointment.`)}` : undefined;
  const faq = faqs(d);
  const hasRecognition = d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0;
  const services = d.services.map((s) => ({ name: s.name, ...describeService(s.name, s.description) }));
  const formClinics = d.clinics.map((c) => ({ id: c.id, name: c.name, area: c.area.name }));
  const aboutPhoto = d.photo ?? (d.gallery[0] ? { url: d.gallery[0].url, alt: d.gallery[0].alt } : { url: photos.feature.src, alt: photos.feature.alt });

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(services.length ? [{ label: "Services", href: "#services" }] : []),
    ...(d.qualifications.length ? [{ label: "Education", href: "#education" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    ...(tips.length ? [{ label: "Health tips", href: "#health-tips" }] : []),
    { label: "Contact", href: "#appointment" },
  ];

  const stats = [
    years && years > 0 ? { value: years, suffix: "+", label: "Years in practice" } : null,
    d.services.length ? { value: d.services.length, suffix: "", label: "Services" } : null,
    d.conditionsTreated.length ? { value: d.conditionsTreated.length, suffix: "+", label: "Conditions treated" } : null,
    d.languages.length ? { value: d.languages.length, suffix: "", label: "Languages" } : null,
  ].filter(Boolean) as { value: number; suffix: string; label: string }[];

  const facts = [
    reg ? { icon: BadgeCheck, label: "Registration", value: reg, more: regMore } : null,
    { icon: Stethoscope, label: "Practice", value: d.practitionerType === "consultant" ? "Consultant" : "General practitioner" },
    d.systemLabel ? { icon: Sparkles, label: "System of medicine", value: d.systemLabel } : null,
    d.primarySpecialty || d.secondarySpecialties.length
      ? {
          icon: HeartPulse,
          label: "Specialties",
          value: [d.primarySpecialty, ...d.secondarySpecialties]
            .filter(Boolean)
            .map((s) => s!.name)
            .join(", "),
        }
      : null,
    d.languages.length ? { icon: Languages, label: "Languages", value: d.languages.join(", ") } : null,
  ].filter(Boolean) as { icon: typeof Stethoscope; label: string; value: string; more?: string }[];

  return (
    <div id="wh-top" className="wh-theme wh-paper overflow-x-clip font-sans text-wh-text">
      <RevealObserver rootId="wh-top" />
      <Nav name={d.fullName} tagline={d.primarySpecialty?.name} links={nav} phone={phone} />

      <main>
        {/* ── Hero ── */}
        <section
          id="top"
          aria-label="Introduction"
          className="relative isolate -mt-[76px] flex min-h-[760px] items-center overflow-hidden bg-wh-forest pb-28 pt-32 lg:min-h-[860px]"
        >
          <BgSlides slides={photos.hero} variant="wh" />
          <div aria-hidden className="absolute inset-0 z-[3] bg-gradient-to-b from-wh-forest/85 via-wh-forest/70 to-wh-forest/90" />
          <div aria-hidden className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(31_74_58/0.55)_80%)]" />
          <Mandala className="wh-spin pointer-events-none absolute -left-40 -top-40 z-[3] size-[520px] text-wh-saffron/15" />
          <Mandala className="wh-spin-rev pointer-events-none absolute -bottom-48 -right-40 z-[3] size-[560px] text-wh-saffron/15" />

          <div className="relative z-10 mx-auto flex w-full max-w-[880px] flex-col items-center px-4 text-center sm:px-6">
            <div className="cm-rise relative size-40 sm:size-48">
              <div className="absolute inset-0 overflow-hidden rounded-full border-4 border-wh-cream bg-wh-forest-2 shadow-wh-lg">
                {d.photo ? (
                  <Image src={d.photo.url} alt={d.photo.alt} fill priority sizes="210px" className="object-cover object-top" />
                ) : (
                  <span aria-hidden className="flex h-full items-center justify-center font-display text-6xl text-wh-cream/50">
                    {initials(d.fullName)}
                  </span>
                )}
              </div>
            </div>
            <p className="cm-rise mt-8 text-sm font-semibold uppercase tracking-[0.32em] text-wh-saffron" style={delay(100)}>
              Namaste · <span lang="hi">नमस्ते</span>
            </p>
            <div
              className="cm-rise mt-4 [&_h1]:!font-display [&_h1]:!text-[42px] [&_h1]:!font-semibold [&_h1]:!leading-[1.05] [&_h1]:!text-wh-cream sm:[&_h1]:!text-[58px] lg:[&_h1]:!text-[68px] [&_div]:!justify-center [&_p]:!justify-center [&_p]:!text-wh-cream/80 [&_p:first-of-type]:!text-wh-saffron [&_svg]:!text-wh-saffron"
              style={delay(160)}
            >
              {seo.heading}
            </div>
            {d.degreesLine && (
              <p className="cm-rise mt-4 text-lg font-medium text-wh-cream/90" style={delay(240)}>
                {d.degreesLine}
                {d.systemLabel && <span className="ml-2 rounded-full bg-wh-cream/15 px-3 py-0.5 text-sm">{d.systemLabel}</span>}
              </p>
            )}
            {d.shortBio && (
              <p className="cm-rise mt-5 max-w-2xl text-[17px] leading-relaxed text-wh-cream/75" style={delay(320)}>
                {d.shortBio}
              </p>
            )}
            <div id="wh-hero-actions" className="cm-rise mt-9 flex flex-wrap justify-center gap-3" style={delay(400)}>
              <a
                href="#appointment"
                className="inline-flex min-h-[54px] items-center gap-2 rounded-full bg-wh-terra px-7 font-semibold text-white shadow-[0_16px_34px_-14px_rgb(180_82_44/0.95)] transition hover:-translate-y-0.5 hover:bg-wh-terra-2"
              >
                <CalendarHeart aria-hidden className="size-5" /> Book an appointment
              </a>
              {phone && (
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex min-h-[54px] items-center gap-2 rounded-full px-6 font-semibold text-wh-cream ring-1 ring-wh-cream/40 transition hover:bg-wh-cream hover:text-wh-forest"
                >
                  <Phone aria-hidden className="size-5" /> Call the clinic
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener"
                  aria-label="WhatsApp"
                  className="inline-flex size-[54px] items-center justify-center rounded-full bg-[#25D366] text-white transition hover:-translate-y-0.5"
                >
                  <MessageCircle aria-hidden className="size-6" />
                </a>
              )}
            </div>
          </div>
          <div aria-hidden className="wh-scallop absolute inset-x-0 bottom-0 z-10" />
        </section>

        {/* ── Info medallions ── */}
        {clinic && (
          <div className="relative z-10 px-4 pt-10 sm:px-6">
            <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-3">
              {[
                {
                  icon: CalendarHeart,
                  title: "Clinic hours",
                  body: openDaysSummary(clinic.timings).split(" | ").filter(Boolean).slice(0, 3).join(" · "),
                },
                { icon: Phone, title: "Appointments", body: clinic.appointmentNote ?? "Call the clinic, or send a request on this page." },
                { icon: MapPin, title: clinic.name, body: [clinic.addressLine1, clinic.area.name, clinic.city.name].join(", "), href: clinic.directionsUrl },
              ].map((x, i) => (
                <div key={x.title} className="cm-reveal group flex flex-col items-center text-center" style={delay(i * 120)}>
                  <span className="relative flex size-20 items-center justify-center text-wh-terra">
                    <Rosette className="absolute inset-0 size-full text-wh-saffron transition duration-700 group-hover:rotate-45" />
                    <span className="relative flex size-12 items-center justify-center rounded-full bg-wh-cream shadow-wh">
                      <x.icon aria-hidden className="size-5" strokeWidth={1.8} />
                    </span>
                  </span>
                  <p className="mt-4 font-display text-xl font-semibold text-wh-forest">{x.title}</p>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-wh-muted">{x.body}</p>
                  {x.href && (
                    <a href={x.href} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-wh-terra hover:underline">
                      Get directions <ArrowUpRight aria-hidden className="size-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── About ── */}
        <Section id="about">
          <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div className="cm-reveal cm-left mx-auto w-full max-w-[440px]">
              <div className="relative">
                <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full rounded-[22px] border-2 border-wh-saffron" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-wh-sand shadow-wh-lg">
                  <Image src={aboutPhoto.url} alt={aboutPhoto.alt} fill sizes="(min-width: 1024px) 440px, 90vw" className="object-cover object-top" />
                </div>
                {years && years > 0 ? (
                  <div className="cm-float absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-wh-forest px-6 py-3 text-wh-cream shadow-wh-lg">
                    <span className="font-display text-3xl font-semibold text-wh-saffron">{years}+</span>
                    <span className="text-xs font-semibold uppercase leading-tight tracking-wider">
                      years
                      <br />
                      in practice
                    </span>
                  </div>
                ) : null}
              </div>
              <dl className="mt-14 space-y-4">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-4 border-b border-dashed border-wh-line pb-4">
                    <f.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-wh-terra" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-wh-muted">{f.label}</dt>
                      <dd className="mt-0.5 font-semibold text-wh-forest">{f.value}</dd>
                      {f.more && <dd className="text-sm text-wh-muted">{f.more}</dd>}
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="min-w-0">
              <Heading id="about" eyebrow="About the doctor" title={`Meet ${d.fullName}`} left />
              <div className="cm-reveal mt-8 border-l-2 border-wh-saffron pl-6 font-display text-xl leading-relaxed text-wh-forest">{seo.intro}</div>
              {d.fullBioHtml && (
                <div
                  className="cm-reveal prose-bio mt-7 text-[17px] leading-[1.85] text-wh-text/85 [&>p:first-child]:first-letter:float-left [&>p:first-child]:first-letter:mr-3 [&>p:first-child]:first-letter:mt-1 [&>p:first-child]:first-letter:font-display [&>p:first-child]:first-letter:text-[62px] [&>p:first-child]:first-letter:leading-[0.8] [&>p:first-child]:first-letter:text-wh-terra [&_li]:relative [&_li]:pl-7 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:size-2.5 [&_li]:before:rotate-45 [&_li]:before:bg-wh-saffron [&_li]:before:content-[''] [&_ul]:mt-5 [&_ul]:grid [&_ul]:!list-none [&_ul]:gap-2.5 [&_ul]:!pl-0 sm:[&_ul]:grid-cols-2"
                  dangerouslySetInnerHTML={{ __html: d.fullBioHtml }}
                />
              )}
              <p className="cm-reveal mt-8 font-display text-2xl text-wh-terra">— {d.fullName}</p>
              <div className="cm-reveal mt-8 flex flex-wrap gap-3">
                <a
                  href="#appointment"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-wh-forest px-6 font-semibold text-wh-cream transition hover:-translate-y-0.5 hover:bg-wh-forest-2"
                >
                  Book a visit <ArrowRight aria-hidden className="size-4" />
                </a>
                <a href={cardHref} className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold text-wh-forest ring-1 ring-wh-line transition hover:bg-white">
                  <IdCard aria-hidden className="size-5" strokeWidth={1.8} /> Digital visiting card
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Services ── */}
        {services.length > 0 && (
          <Section id="services" className="bg-wh-paper">
            <Mandala className="pointer-events-none absolute -right-48 top-10 size-[520px] text-wh-terra/[0.07]" />
            <Heading
              id="services"
              eyebrow="Services"
              title="Care at the clinic"
              lead={`What ${firstName} looks after, explained simply. Ask the clinic if you don't see what you need.`}
            />
            <ul className="mt-14 flex flex-wrap justify-center gap-5">
              {services.map((s, i) => {
                const Icon = SERVICE_ICONS[s.icon];
                return (
                  <li
                    key={s.name}
                    className="cm-reveal group relative w-full overflow-hidden rounded-[22px] bg-wh-cream p-7 text-center sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] shadow-wh ring-1 ring-wh-line transition duration-500 hover:-translate-y-1 hover:bg-wh-forest"
                    style={delay((i % 3) * 90)}
                  >
                    <span className="relative mx-auto flex size-20 items-center justify-center text-wh-terra transition-colors group-hover:text-wh-saffron">
                      <Rosette className="absolute inset-0 size-full text-wh-saffron/70 transition duration-700 group-hover:rotate-90" />
                      <Icon aria-hidden className="relative size-7" strokeWidth={1.6} />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-semibold text-wh-forest transition-colors group-hover:text-wh-cream">{s.name}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-wh-muted transition-colors group-hover:text-wh-cream/75">{s.text}</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {/* ── Numbers ── */}
        {stats.length > 0 && (
          <section aria-label="At a glance" className="relative isolate overflow-hidden bg-wh-forest px-4 py-16 text-wh-cream sm:px-6">
            <Image src={photos.band.src} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-15" />
            <div aria-hidden className="wh-scallop absolute inset-x-0 top-0 rotate-180 [--wh-scallop:var(--color-wh-paper)]" />
            <dl className={cn("mx-auto grid max-w-[1080px] gap-10 text-center sm:grid-cols-2", stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "")}>
              {stats.map((s, i) => (
                <div key={s.label} className="cm-reveal" style={delay(i * 110)}>
                  <dd className="font-display text-5xl font-semibold text-wh-saffron sm:text-6xl">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </dd>
                  <Divider center className="mt-3" />
                  <dt className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-wh-cream/80">{s.label}</dt>
                </div>
              ))}
            </dl>
            <div aria-hidden className="wh-scallop absolute inset-x-0 bottom-0" />
          </section>
        )}

        {/* ── Conditions ── */}
        {d.conditionsTreated.length > 0 && (
          <Section id="conditions">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
              <div>
                <Heading id="conditions" eyebrow="Conditions" title="What I see and treat" lead="If yours is not listed, please ask the clinic." left />
                <ul className="mt-10 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {d.conditionsTreated.map((c, i) => (
                    <li
                      key={c}
                      className="cm-reveal flex items-center gap-3 border-b border-wh-line pb-3 text-[16px] font-medium text-wh-forest"
                      style={delay(Math.min(i, 12) * 40)}
                    >
                      <Leaf aria-hidden className="size-4 shrink-0 text-wh-terra" strokeWidth={2} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cm-reveal cm-right relative mx-auto hidden w-full max-w-[420px] lg:block">
                <div aria-hidden className="absolute -bottom-3 -left-3 h-full w-full rounded-[22px] border-2 border-wh-terra/60" />
                <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] shadow-wh-lg">
                  <Image src={photos.side.src} alt={photos.side.alt} fill sizes="420px" className="object-cover" />
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ── Education: centred path ── */}
        {d.qualifications.length > 0 && (
          <Section id="education" className="bg-wh-paper">
            <Heading
              id="education"
              eyebrow="Education"
              title="Training and qualifications"
              lead={d.registration.council ? `Registered with the ${d.registration.council}${d.registration.year ? ` since ${d.registration.year}` : ""}.` : undefined}
            />
            <ol className="relative mx-auto mt-14 max-w-4xl before:absolute before:bottom-4 before:left-6 before:top-4 before:w-px before:bg-gradient-to-b before:from-wh-saffron before:via-wh-terra/50 before:to-wh-saffron md:before:left-1/2">
              {d.qualifications.map((q, i) => (
                <li
                  key={`${q.degree}-${i}`}
                  className={cn("cm-reveal relative mb-10 pl-16 last:mb-0 md:w-1/2 md:pl-0", i % 2 === 0 ? "md:pr-14 md:text-right" : "md:ml-auto md:pl-14")}
                  style={delay(i * 120)}
                >
                  <span
                    className={cn(
                      "absolute left-1.5 top-1 flex size-9 items-center justify-center rounded-full bg-wh-terra text-wh-cream ring-4 ring-wh-paper md:left-auto",
                      i % 2 === 0 ? "md:-right-[18px]" : "md:-left-[18px]",
                    )}
                  >
                    <Flame aria-hidden className="size-4" strokeWidth={2} />
                  </span>
                  {q.year && <p className="font-display text-3xl font-semibold text-wh-saffron">{q.year}</p>}
                  <p className="mt-1 font-display text-2xl font-semibold text-wh-forest">
                    {q.degree}
                    {q.specialization && !q.degree.includes(q.specialization) && <span className="block text-lg font-medium text-wh-terra">{q.specialization}</span>}
                  </p>
                  {q.institute && <p className="mt-1 text-wh-muted">{q.institute}</p>}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ── Clinics ── */}
        {d.clinics.length > 0 && (
          <Section id="clinics">
            <Heading
              id="clinics"
              eyebrow="Visit"
              title={mainClinics.length > 1 ? "Where to find me" : "Visit the clinic"}
              lead={mainClinics.length > 1 ? `${firstName} consults at ${mainClinics.length} clinics.` : "Timings, directions and whether the clinic is open right now."}
            />
            <div className="mt-14">
              <ClinicCards clinics={mainClinics} />
            </div>
            <VisitingHospitals hospitals={visiting} />
          </Section>
        )}

        {/* ── Appointment ── */}
        <section
          id="appointment"
          aria-labelledby="appointment-title"
          className="relative isolate scroll-mt-20 overflow-hidden bg-wh-forest px-4 py-24 text-wh-cream sm:px-6 lg:py-28"
        >
          <div aria-hidden className="wh-scallop absolute inset-x-0 top-0 rotate-180" />
          <Mandala className="wh-spin pointer-events-none absolute -left-52 top-1/2 -z-10 size-[620px] -translate-y-1/2 text-wh-saffron/10" />
          <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Heading
                id="appointment"
                eyebrow="Appointments"
                title="Book a visit"
                lead="Send a request and the clinic will call you back to confirm a time that suits you."
                light
                left
              />
              <ol className="cm-reveal mt-10 space-y-6">
                {[
                  { t: "Send your request", s: "Name, mobile number and a preferred day." },
                  { t: "The clinic calls you back", s: "To confirm the time and anything to bring." },
                  { t: "Visit the clinic", s: clinic ? `${clinic.name}, ${clinic.area.name}.` : "At the time you agreed." },
                ].map((step, i) => (
                  <li key={step.t} className="flex gap-4">
                    <span className="flex size-11 shrink-0 rotate-45 items-center justify-center border border-wh-saffron">
                      <span className="-rotate-45 font-display text-lg text-wh-saffron">{i + 1}</span>
                    </span>
                    <span>
                      <span className="block font-semibold">{step.t}</span>
                      <span className="block text-sm text-wh-cream/70">{step.s}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <ul className="cm-reveal mt-10 space-y-2.5 text-sm">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
                      <Phone aria-hidden className="size-4 text-wh-saffron" /> <span className="font-semibold">{formatPhone(phone)}</span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/[0.12]"
                    >
                      <MessageCircle aria-hidden className="size-4 text-[#4ade80]" /> <span className="font-semibold">WhatsApp the clinic</span>
                    </a>
                  </li>
                )}
                {d.email && (
                  <li>
                    <a href={`mailto:${d.email}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
                      <Mail aria-hidden className="size-4 shrink-0 text-wh-saffron" /> <span className="truncate font-semibold">{d.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="cm-reveal cm-zoom rounded-[26px] bg-wh-cream p-6 text-wh-text shadow-wh-lg ring-4 ring-wh-saffron/30 sm:p-10">
              <h3 className="font-display text-2xl font-semibold text-wh-forest">Request an appointment</h3>
              <p className="mb-7 mt-1 text-sm text-wh-muted">Fields marked * are needed. The clinic replies during clinic hours.</p>
              <AppointmentForm doctorId={d.id} doctorName={d.fullName} clinics={formClinics} />
            </div>
          </div>
          <div aria-hidden className="wh-scallop absolute inset-x-0 bottom-0" />
        </section>

        {/* ── Recognition ── */}
        {hasRecognition && (
          <Section id="recognition">
            <Heading id="recognition" eyebrow="Recognition" title="Awards and memberships" />
            {d.awards.length > 0 && (
              <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {d.awards.map((a, i) => (
                  <li key={`${a.title}-${a.year}`} className="cm-reveal flex flex-col items-center text-center" style={delay(i * 110)}>
                    <span className="relative flex size-28 items-center justify-center">
                      <Mandala className="absolute inset-0 size-full text-wh-saffron" strokeWidth={1.2} />
                      <span className="relative flex size-16 flex-col items-center justify-center rounded-full bg-wh-forest text-wh-cream shadow-wh">
                        <Award aria-hidden className="size-5 text-wh-saffron" />
                        <span className="text-xs font-semibold">{a.year}</span>
                      </span>
                    </span>
                    <p className="mt-4 font-display text-lg font-semibold text-wh-forest">{a.title}</p>
                    <p className="mt-1 text-sm text-wh-muted">{a.awardingBody}</p>
                  </li>
                ))}
              </ul>
            )}
            {(d.memberships.length > 0 || d.publications.length > 0) && (
              <div className="cm-reveal mx-auto mt-14 max-w-4xl rounded-[26px] bg-wh-paper p-8 ring-1 ring-wh-line">
                <div className={cn("grid gap-8", d.memberships.length > 0 && d.publications.length > 0 && "md:grid-cols-2")}>
                  {d.memberships.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wh-terra">Memberships</p>
                      <ul className="mt-4 space-y-3">
                        {d.memberships.map((m) => (
                          <li key={m.name} className="flex gap-3">
                            <span aria-hidden className="mt-2 size-2 shrink-0 rotate-45 bg-wh-saffron" />
                            <span>
                              <span className="block font-semibold text-wh-forest">{m.name}</span>
                              {m.since && <span className="block text-sm text-wh-muted">Member since {m.since}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.publications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wh-terra">Publications</p>
                      <ul className="mt-4 space-y-3 text-sm">
                        {d.publications.map((p) => (
                          <li key={p.title}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener" className="font-semibold text-wh-forest hover:underline">
                                {p.title}
                              </a>
                            ) : (
                              <span className="font-semibold text-wh-forest">{p.title}</span>
                            )}
                            <span className="block text-wh-muted">{[p.journal, p.year].filter(Boolean).join(", ")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── Beyond medicine ── */}
        {(d.interests.length > 0 || d.interestsPhoto || story) && (
          <Section id="beyond" className="bg-wh-paper">
            <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
              <div className="lg:sticky lg:top-28">
                <Heading id="beyond" eyebrow="Beyond medicine" title="A little about me" lead={`What keeps ${firstName} going outside clinic hours.`} left />
                {d.interestsPhoto && (
                  <figure className="cm-reveal relative mt-10 rotate-[-2.5deg] bg-white p-3 pb-12 shadow-wh-lg transition duration-500 hover:rotate-0">
                    <div className="relative aspect-[4/3.4] overflow-hidden">
                      <Image src={d.interestsPhoto.url} alt={d.interestsPhoto.alt} fill sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
                    </div>
                    {d.interestsPhoto.caption && (
                      <figcaption className="absolute inset-x-3 bottom-3 text-center font-display text-lg text-wh-forest">{d.interestsPhoto.caption}</figcaption>
                    )}
                  </figure>
                )}
              </div>
              <div>
                {d.interests.length > 0 && (
                  <ul className="cm-reveal flex flex-wrap gap-2.5">
                    {d.interests.map((it) => (
                      <li key={it} className="inline-flex items-center gap-2 rounded-full bg-wh-cream px-4 py-2.5 font-semibold text-wh-forest ring-1 ring-wh-line">
                        <Sparkles aria-hidden className="size-4 text-wh-saffron" />
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
                {story && (
                  <article aria-labelledby="beyond-story" className="cm-reveal mt-8">
                    <h3 id="beyond-story" className="font-display text-3xl font-semibold leading-tight text-wh-forest sm:text-[34px]">
                      {story.title}
                    </h3>
                    <Divider className="mt-4" />
                    <div className="mt-6 space-y-5 text-[17px] leading-[1.85] text-wh-text/85">
                      {story.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </article>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Health tips ── */}
        {tips.length > 0 && (
          <Section id="health-tips">
            <Heading id="health-tips" eyebrow="Health tips" title="Good to know" lead="Short, general health information for families. Not a substitute for a consultation." />
            <HealthTipsSection tips={tips} />
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery" className="bg-wh-paper">
            <Heading id="gallery" eyebrow="Gallery" title="Inside the clinic" />
            <div className="cm-reveal mt-12">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <Section id="faq">
            <Heading id="faq" eyebrow="Questions" title="Before your visit" />
            <div className="mx-auto mt-12 max-w-3xl divide-y divide-wh-line border-y border-wh-line">
              {faq.map((f, i) => (
                <details key={f.q} className="cm-reveal group [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-xl text-wh-forest">
                    {f.q}
                    <span className="flex size-9 shrink-0 rotate-45 items-center justify-center border border-wh-saffron text-wh-terra transition group-open:bg-wh-terra group-open:text-wh-cream">
                      <Plus aria-hidden className="size-4 -rotate-45 transition group-open:rotate-0" strokeWidth={2.5} />
                    </span>
                  </summary>
                  <p className="pb-6 pr-12 leading-relaxed text-wh-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-[#173a2d] px-4 text-wh-cream sm:px-6">
        <div aria-hidden className="wh-scallop absolute inset-x-0 top-0 rotate-180" />
        <Mandala className="pointer-events-none absolute -right-40 -top-24 size-[460px] text-wh-saffron/10" />
        <div className="relative mx-auto max-w-[1180px] pt-24">
          <div className="flex flex-col items-center text-center">
            <Mandala className="size-14 text-wh-saffron" />
            <p className="mt-5 font-display text-4xl font-semibold sm:text-5xl">Planning a visit?</p>
            <p className="mt-3 max-w-xl text-wh-cream/70">Call {clinic ? clinic.name : "the clinic"} or send a request, and the clinic will call you back.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#appointment"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-wh-terra px-6 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-wh-terra-2"
              >
                <CalendarHeart aria-hidden className="size-[18px]" /> Book appointment
              </a>
              {phone && (
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold ring-1 ring-wh-cream/30 transition hover:bg-wh-cream/10"
                >
                  <Phone aria-hidden className="size-[18px]" /> Call now
                </a>
              )}
            </div>
          </div>

          <div className="mt-16 grid gap-10 border-t border-wh-cream/10 py-14 md:grid-cols-2 lg:grid-cols-[1.15fr_0.65fr_1.45fr_1.05fr]">
            <div>
              <p className="font-display text-2xl font-semibold">{d.fullName}</p>
              {d.primarySpecialty && <p className="text-sm text-wh-saffron">{d.primarySpecialty.name}</p>}
              {d.degreesLine && <p className="mt-4 text-sm text-wh-cream/60">{d.degreesLine}</p>}
              {Object.keys(d.links).length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {Object.entries(d.links).map(([k, href]) => (
                    <li key={k}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener me"
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-wh-cream/80 ring-1 ring-wh-cream/20 hover:bg-wh-cream/10"
                      >
                        {LINK_LABELS[k] ?? k} <ArrowUpRight aria-hidden className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <nav aria-label="Footer">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wh-saffron">Explore</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {nav.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-wh-cream/70 hover:text-wh-cream">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={cardHref} className="text-wh-cream/70 hover:text-wh-cream">
                    Visiting card
                  </a>
                </li>
                <li>
                  <a href={d.vcfUrl} download="" className="inline-flex items-center gap-1.5 text-wh-cream/70 hover:text-wh-cream">
                    <UserPlus aria-hidden className="size-3.5" /> Save contact
                  </a>
                </li>
              </ul>
            </nav>
            {clinic && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wh-saffron">Clinic hours</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {WEEK_ORDER.map((day) => {
                    const slots = slotsForDay(clinic.timings, day);
                    return (
                      <li key={day} className="flex justify-between gap-4">
                        <span className="text-wh-cream/55">{DAY_SHORT[day]}</span>
                        <span className={slots.length ? "whitespace-nowrap text-right text-wh-cream/85" : "text-wh-cream/40"}>{slots.length ? formatSlots(slots) : "Closed"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wh-saffron">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-wh-cream/80">
                {phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone aria-hidden className="size-4 text-wh-saffron" />
                    <a href={`tel:+${phone}`} className="hover:text-wh-cream">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 shrink-0 text-wh-saffron" />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-wh-cream">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-wh-saffron" />
                    <span>
                      <span className="block font-semibold text-wh-cream">{clinic.name}</span>
                      {clinic.fullAddress}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-2 border-t border-wh-cream/10 py-7 text-sm text-wh-cream/50">
            <p>Information provided by the doctor. In a medical emergency, call 108 or go to the nearest hospital.</p>
            <p className="flex flex-wrap gap-x-5 gap-y-1">
              <span>
                © {new Date().getFullYear()} {d.fullName}
              </span>
              <span>
                Website by{" "}
                <a href={absUrl("/")} className="underline underline-offset-2 hover:text-wh-cream">
                  MediReach
                </a>
              </span>
              {/* Absolute: the login lives on the apex domain, not the doctor's subdomain. */}
              <a href={d.loginUrl ?? absUrl(`/doctor-login?d=${d.id}`)} rel="nofollow" className="underline underline-offset-2 hover:text-wh-cream">
                Doctor login
              </a>
            </p>
          </div>
        </div>
      </footer>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={`WhatsApp ${d.fullName}'s clinic`}
          className="fixed bottom-6 left-6 z-30 hidden size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-wh-lg transition hover:scale-105 sm:flex"
        >
          <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-[#25D366]/50" />
          <MessageCircle aria-hidden className="relative size-7" />
        </a>
      )}

    </div>
  );
}
