import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  IdCard,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { Gallery } from "@/components/public/Gallery";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { absUrl } from "@/lib/site";
import { DAY_SHORT, formatSlots, openDaysSummary, slotsForDay, WEEK_ORDER } from "@/lib/timings";
import { describeService } from "@/content/service-descriptions";
import { ShowAfter } from "@/templates/portfolio/classic/ShowAfter";
import { AppointmentForm } from "@/templates/portfolio/t2/AppointmentForm";
import { HealthTipsSection } from "@/templates/portfolio/t2/HealthTipsSection";
import { CountUp, RevealObserver } from "@/templates/portfolio/t2/Motion";
import { BgSlides } from "@/templates/shared/BgSlides";
import { specialtyPhotos } from "@/templates/shared/specialty-photos";
import { splitClinics } from "@/templates/shared/clinic-split";
import { VisitingHospitals } from "@/templates/shared/VisitingHospitals";
import type { PortfolioTemplateProps, PublicDoctor } from "@/templates/types";
import { ClinicPanels } from "./ClinicPanels";
import { ConditionsFilter, ServiceTabs } from "./Interactive";
import { Nav, type NavLink } from "./Nav";

/**
 * Portfolio design 5 — "Specialist Pro". A crisp, clinical one-page website
 * for consultants: deep slate, crimson for actions, ice-white panels, cyan
 * for data, rounded-xl cards and a beating heart mark.
 *
 * white nav (+ section-dot rail on very wide screens) → hero over a photo
 * carousel that comes into focus from a blur, with a heartbeat line and a
 * credentials card → KPI strip → about (portrait + credentials table) →
 * services as tabs → searchable conditions → credentials (education, awards,
 * memberships in columns) → clinics (one open at a time with its own timetable;
 * visited hospitals listed briefly) →
 * appointment → beyond medicine (magazine columns) → health tips → gallery →
 * FAQ → footer, plus a mobile bar.
 *
 * Every section hides itself when its data is empty. Photos follow the
 * specialty (templates/shared/specialty-photos.ts). Presentation only: H1,
 * intro, and JSON-LD come from the shared wrapper. Shared
 * widgets from design 2 are re-coloured by `.sp-theme` (globals.css).
 *
 * NMC: no ratings, reviews, testimonials, patient counts or superlatives.
 */

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
    <section id={id} {...(labelled ? { "aria-labelledby": `${id}-title` } : {})} className={cn("relative scroll-mt-20 px-4 py-20 sm:px-6 lg:py-24", className)}>
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
  className,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  light?: boolean;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("cm-reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]",
            light ? "bg-white/10 text-white/80" : "bg-sp-blush text-sp-crimson",
          )}
        >
          <HeartPulse aria-hidden className="size-3.5" strokeWidth={2.4} />
          {eyebrow}
        </p>
        <h2 id={`${id}-title`} className={cn("mt-4 text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[42px]", light ? "text-white" : "text-sp-slate")}>
          {title}
        </h2>
        {lead && <p className={cn("mt-3 text-[17px] leading-relaxed", light ? "text-white/70" : "text-sp-muted")}>{lead}</p>}
      </div>
      {action}
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
    if (hours) out.push({ q: "What are the consultation timings?", a: `${c.name}: ${hours}.${c.appointmentNote ? ` ${c.appointmentNote}` : ""}` });
  }
  out.push({
    q: "How do I book an appointment?",
    a: "Send a request with the form on this page and the clinic will call you back to fix a time. You can also call or WhatsApp the clinic.",
  });
  out.push({ q: "What should I bring?", a: "Earlier prescriptions, test reports, ECGs, scans and a list of the medicines you take, with doses." });
  if (c && typeof c.fee === "number")
    out.push({ q: "What is the consultation fee?", a: `The consultation fee at ${c.name} is ₹${c.fee.toLocaleString("en-IN")}. Tests and procedures are charged separately.` });
  if (d.languages.length) out.push({ q: `Which languages does ${d.fullName} speak?`, a: `${d.languages.join(", ")}.` });
  return out;
}

export default function SpecialistProPortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
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
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";
  const services = d.services.map((s) => ({ name: s.name, ...describeService(s.name, s.description) }));
  const formClinics = d.clinics.map((c) => ({ id: c.id, name: c.name, area: c.area.name }));
  const hasCredentials = d.qualifications.length > 0 || d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0;

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(services.length ? [{ label: "Services", href: "#services" }] : []),
    ...(d.conditionsTreated.length ? [{ label: "Conditions", href: "#conditions" }] : []),
    ...(hasCredentials ? [{ label: "Credentials", href: "#credentials" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    { label: "Contact", href: "#appointment" },
  ];

  const kpis = [
    years && years > 0 ? { value: years, suffix: "+", label: "Years in practice" } : null,
    d.services.length ? { value: d.services.length, suffix: "", label: "Services" } : null,
    d.conditionsTreated.length ? { value: d.conditionsTreated.length, suffix: "+", label: "Conditions treated" } : null,
    d.clinics.length ? { value: d.clinics.length, suffix: "", label: d.clinics.length > 1 ? "Places to consult" : "Clinic" } : null,
  ].filter(Boolean) as { value: number; suffix: string; label: string }[];

  const facts = [
    reg ? { label: "Registration", value: reg, more: regMore } : null,
    { label: "Practice", value: d.practitionerType === "consultant" ? "Consultant" : "General practitioner" },
    d.systemLabel ? { label: "System of medicine", value: d.systemLabel } : null,
    d.primarySpecialty || d.secondarySpecialties.length
      ? {
          label: "Specialties",
          value: [d.primarySpecialty, ...d.secondarySpecialties]
            .filter(Boolean)
            .map((s) => s!.name)
            .join(", "),
        }
      : null,
    d.languages.length ? { label: "Languages", value: d.languages.join(", ") } : null,
  ].filter(Boolean) as { label: string; value: string; more?: string }[];

  return (
    <div id="sp-top" className="sp-theme overflow-x-clip bg-sp-ice font-sans text-sp-text">
      <RevealObserver rootId="sp-top" />
      <Nav name={d.fullName} tagline={d.primarySpecialty?.name} links={nav} />

      <main>
        {/* ── Hero ── */}
        <section id="top" aria-label="Introduction" className="relative isolate flex min-h-[700px] items-center overflow-hidden bg-sp-slate pb-36 pt-20 lg:min-h-[780px]">
          <BgSlides slides={photos.hero} variant="sp" interval={6000} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-sp-slate via-sp-slate/80 to-sp-slate/10" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:40px_40px]"
          />
          <svg aria-hidden viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-40 h-20 w-full opacity-40">
            <path
              className="cm-ecg"
              d="M0 60 H420 L440 60 L452 18 L470 102 L486 34 L498 60 H760 L778 60 L790 8 L808 112 L824 40 L836 60 H1200"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative z-10 mx-auto grid w-full max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="min-w-0">
              <p className="cm-rise inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur">
                <span className="relative flex size-2">
                  <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-rose-400" />
                  <span className="relative size-2 rounded-full bg-rose-400" />
                </span>
                {[d.primarySpecialty?.name, place].filter(Boolean).join(" · ") || "Doctor"}
              </p>
              <div
                className="cm-rise mt-6 [&_h1]:!font-sans [&_h1]:!text-[42px] [&_h1]:!font-bold [&_h1]:!leading-[1.04] [&_h1]:!tracking-tight [&_h1]:!text-white sm:[&_h1]:!text-[56px] lg:[&_h1]:!text-[64px] [&_p]:!text-white/75 [&_p:first-of-type]:!text-rose-300 [&_svg]:!text-rose-300"
                style={delay(120)}
              >
                {seo.heading}
              </div>
              {d.degreesLine && (
                <p className="cm-rise mt-4 text-lg font-semibold text-white/90" style={delay(200)}>
                  {d.degreesLine}
                  {d.systemLabel && <span className="ml-2 rounded-md bg-white/15 px-2 py-0.5 text-sm">{d.systemLabel}</span>}
                </p>
              )}
              {d.shortBio && (
                <p className="cm-rise mt-4 max-w-xl text-[17px] leading-relaxed text-white/70" style={delay(280)}>
                  {d.shortBio}
                </p>
              )}
              <div id="sp-hero-actions" className="cm-rise mt-8 flex flex-wrap gap-3" style={delay(360)}>
                <a
                  href="#appointment"
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-sp-crimson px-6 font-semibold text-white shadow-[0_16px_34px_-14px_rgb(194_30_58/0.9)] transition hover:-translate-y-0.5 hover:bg-sp-crimson-2"
                >
                  <CalendarCheck aria-hidden className="size-5" /> Book a consultation
                </a>
                {phone && (
                  <a
                    href={`tel:+${phone}`}
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-white/10 px-5 font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
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
                    className="inline-flex size-[52px] items-center justify-center rounded-xl bg-[#25D366] text-white transition hover:-translate-y-0.5"
                  >
                    <MessageCircle aria-hidden className="size-6" />
                  </a>
                )}
              </div>
            </div>

            {/* Credentials card */}
            <div
              className="cm-rise relative mx-auto w-full max-w-[360px] rounded-2xl bg-white/[0.08] p-5 text-white ring-1 ring-white/15 backdrop-blur-xl lg:mr-0"
              style={delay(260)}
            >
              <div className="flex items-center gap-4">
                <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-2 ring-white/30">
                  {d.photo ? (
                    <Image src={d.photo.url} alt={d.photo.alt} fill priority sizes="80px" className="object-cover object-top" />
                  ) : (
                    <span aria-hidden className="flex h-full items-center justify-center text-2xl font-bold text-white/60">
                      {initials(d.fullName)}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{d.fullName}</span>
                  {d.primarySpecialty && <span className="block text-sm text-rose-200">{d.primarySpecialty.name}</span>}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {d.registration.council && (
                  <li className="flex items-start gap-2.5">
                    <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-300" /> Registered, {d.registration.council}
                  </li>
                )}
                {d.languages.length > 0 && (
                  <li className="flex items-start gap-2.5">
                    <Languages aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-300" /> {d.languages.join(", ")}
                  </li>
                )}
                {clinic && (
                  <li className="flex items-start gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-300" /> {clinic.name}, {clinic.area.name}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ── KPI strip ── */}
        {kpis.length > 0 && (
          <div className="relative z-10 -mt-20 px-4 sm:px-6">
            <dl
              className={cn(
                "mx-auto grid max-w-[1180px] grid-cols-2 gap-px overflow-hidden rounded-2xl bg-sp-line shadow-sp-lg ring-1 ring-sp-line",
                kpis.length >= 4 ? "lg:grid-cols-4" : kpis.length === 3 ? "lg:grid-cols-3" : "",
              )}
            >
              {kpis.map((k, i) => (
                <div key={k.label} className="cm-reveal bg-white p-6" style={delay(i * 90)}>
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-sp-muted">{k.label}</dt>
                  <dd className="mt-2 flex items-end justify-between gap-3">
                    <span className="text-4xl font-bold tracking-tight text-sp-slate">
                      <CountUp value={k.value} suffix={k.suffix} />
                    </span>
                    <svg aria-hidden viewBox="0 0 60 20" className="h-6 w-16 text-sp-crimson">
                      <path d="M0 10 H18 L22 10 L25 3 L29 17 L32 7 L34 10 H60" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ── About ── */}
        <Section id="about">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div className="cm-reveal cm-left mx-auto w-full max-w-[440px]">
              <div className="relative">
                <div aria-hidden className="absolute -left-3 bottom-8 top-8 w-1.5 rounded-full bg-sp-crimson" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-sp-lg">
                  {d.photo ? (
                    <Image src={d.photo.url} alt={d.photo.alt} fill sizes="(min-width: 1024px) 440px, 90vw" className="object-cover object-top" />
                  ) : (
                    <span aria-hidden className="flex h-full items-center justify-center text-7xl font-bold text-sp-slate/15">
                      {initials(d.fullName)}
                    </span>
                  )}
                </div>
              </div>
              <dl className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sp ring-1 ring-sp-line">
                {facts.map((f, i) => (
                  <div key={f.label} className={cn("grid grid-cols-[120px_1fr] gap-4 px-5 py-3.5 text-sm", i > 0 && "border-t border-sp-line")}>
                    <dt className="font-semibold text-sp-muted">{f.label}</dt>
                    <dd className="font-semibold text-sp-slate">
                      {f.value}
                      {f.more && <span className="block font-normal text-sp-muted">{f.more}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="min-w-0">
              <Heading id="about" eyebrow="About" title={`Meet ${d.fullName}`} />
              <div className="cm-reveal mt-6 rounded-2xl border-l-4 border-sp-crimson bg-white p-6 text-lg font-medium leading-relaxed text-sp-slate shadow-sp">{seo.intro}</div>
              {d.fullBioHtml && (
                <div
                  className="cm-reveal prose-bio mt-6 text-[17px] leading-[1.8] text-sp-text/85 [&_li]:flex [&_li]:items-center [&_li]:gap-2.5 [&_li]:rounded-xl [&_li]:bg-white [&_li]:px-4 [&_li]:py-3 [&_li]:font-semibold [&_li]:text-sp-slate [&_li]:ring-1 [&_li]:ring-sp-line [&_li]:before:size-2 [&_li]:before:shrink-0 [&_li]:before:rounded-full [&_li]:before:bg-sp-crimson [&_li]:before:content-[''] [&_ul]:mt-6 [&_ul]:grid [&_ul]:!list-none [&_ul]:gap-2.5 [&_ul]:!pl-0 sm:[&_ul]:grid-cols-2"
                  dangerouslySetInnerHTML={{ __html: d.fullBioHtml }}
                />
              )}
              <div className="cm-reveal mt-8 flex flex-wrap gap-3">
                <a href="#appointment" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sp-slate px-5 font-semibold text-white transition hover:bg-sp-slate-2">
                  Book a consultation <ArrowRight aria-hidden className="size-4" />
                </a>
                <a
                  href={cardHref}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-sp-slate ring-1 ring-sp-line transition hover:bg-sp-blush"
                >
                  <IdCard aria-hidden className="size-5" /> Digital visiting card
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Services: tabs ── */}
        {services.length > 0 && (
          <Section id="services" className="bg-white">
            <Heading
              id="services"
              eyebrow="Services"
              title="Consultations and procedures"
              lead="Pick a service to read what it involves."
            />
            <div className="mt-12">
              <ServiceTabs services={services} />
            </div>
          </Section>
        )}

        {/* ── Conditions ── */}
        {d.conditionsTreated.length > 0 && (
          <Section id="conditions">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
              <div>
                <Heading id="conditions" eyebrow="Conditions" title="Conditions treated" lead="Search the list, or ask the clinic if yours is not there." />
                <div className="cm-reveal relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-2xl shadow-sp-lg lg:block">
                  <Image src={photos.side.src} alt={photos.side.alt} fill sizes="440px" className="object-cover" />
                </div>
              </div>
              <ConditionsFilter conditions={d.conditionsTreated} />
            </div>
          </Section>
        )}

        {/* ── Credentials ── */}
        {hasCredentials && (
          <Section id="credentials" className="bg-sp-slate text-white">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:40px_40px]"
            />
            <Heading
              id="credentials"
              eyebrow="Credentials"
              title="Training and recognition"
              lead={d.registration.council ? `Registered with the ${d.registration.council}${d.registration.year ? ` since ${d.registration.year}` : ""}.` : undefined}
              light
            />
            <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
              {d.qualifications.length > 0 && (
                <div className="cm-reveal rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
                    <GraduationCap aria-hidden className="size-4" /> Education
                  </p>
                  <ol className="mt-5 space-y-5 border-l border-white/15 pl-5">
                    {d.qualifications.map((q, i) => (
                      <li key={`${q.degree}-${i}`} className="relative">
                        <span aria-hidden className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-sp-crimson ring-4 ring-sp-slate" />
                        <p className="font-bold">
                          {q.degree}
                          {q.specialization && !q.degree.includes(q.specialization) && <span className="font-semibold text-rose-200"> · {q.specialization}</span>}
                        </p>
                        <p className="text-sm text-white/60">
                          {q.institute}
                          {q.year ? `, ${q.year}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {d.awards.length > 0 && (
                <div className="cm-reveal rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10" style={delay(100)}>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
                    <Award aria-hidden className="size-4" /> Awards
                  </p>
                  <ul className="mt-5 space-y-4">
                    {d.awards.map((a) => (
                      <li key={`${a.title}-${a.year}`} className="flex gap-4">
                        <span className="rounded-md bg-sp-crimson px-2 py-0.5 text-xs font-bold tabular-nums">{a.year}</span>
                        <span>
                          <span className="block font-semibold">{a.title}</span>
                          <span className="block text-sm text-white/60">{a.awardingBody}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(d.memberships.length > 0 || d.publications.length > 0) && (
                <div className="cm-reveal rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10" style={delay(200)}>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
                    <Users aria-hidden className="size-4" /> Memberships
                  </p>
                  <ul className="mt-5 space-y-4">
                    {d.memberships.map((m) => (
                      <li key={m.name}>
                        <span className="block font-semibold">{m.name}</span>
                        {m.since && <span className="block text-sm text-white/60">Since {m.since}</span>}
                      </li>
                    ))}
                    {d.publications.map((p) => (
                      <li key={p.title}>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noopener" className="font-semibold underline-offset-4 hover:underline">
                            {p.title}
                          </a>
                        ) : (
                          <span className="font-semibold">{p.title}</span>
                        )}
                        <span className="block text-sm text-white/60">{[p.journal, p.year].filter(Boolean).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Clinics ── */}
        {d.clinics.length > 0 && (
          <Section id="clinics">
            <Heading
              id="clinics"
              eyebrow="Clinics"
              title="When and where to consult"
              lead={mainClinics.length > 1 ? `${firstName} consults at ${mainClinics.length} clinics. Open one to see its timings.` : "Clinic details and the week's timings, with today highlighted."}
            />
            <div className="mt-10">
              <ClinicPanels clinics={mainClinics} />
            </div>
            <VisitingHospitals hospitals={visiting} />
          </Section>
        )}

        {/* ── Appointment ── */}
        <section id="appointment" aria-labelledby="appointment-title" className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto grid max-w-[1180px] overflow-hidden rounded-3xl shadow-sp-lg ring-1 ring-sp-line lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="relative isolate overflow-hidden bg-sp-slate p-8 text-white sm:p-10">
              <Image src={photos.band.src} alt="" fill sizes="(min-width: 1024px) 480px, 100vw" className="-z-10 object-cover opacity-15" />
              <Heading id="appointment" eyebrow="Appointments" title="Book a consultation" lead="Send a request and the clinic will call you back to confirm a time." light />
              <ol className="cm-reveal mt-8 space-y-4">
                {["Send your request", "The clinic calls you back", "Bring your reports to the visit"].map((t, i) => (
                  <li key={t} className="flex items-center gap-4 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sp-crimson font-bold">{i + 1}</span>
                    <span className="font-semibold">{t}</span>
                  </li>
                ))}
              </ol>
              <ul className="cm-reveal mt-8 space-y-2.5 text-sm">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-white/15 transition hover:bg-white/10">
                      <Phone aria-hidden className="size-4 text-rose-300" /> <span className="font-semibold">{formatPhone(phone)}</span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a href={waHref} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-white/15 transition hover:bg-white/10">
                      <MessageCircle aria-hidden className="size-4 text-[#4ade80]" /> <span className="font-semibold">WhatsApp the clinic</span>
                    </a>
                  </li>
                )}
                {d.email && (
                  <li>
                    <a href={`mailto:${d.email}`} className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-white/15 transition hover:bg-white/10">
                      <Mail aria-hidden className="size-4 shrink-0 text-rose-300" /> <span className="truncate font-semibold">{d.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="bg-white p-6 sm:p-10">
              <h3 className="text-2xl font-bold text-sp-slate">Request an appointment</h3>
              <p className="mb-7 mt-1 text-sm text-sp-muted">Fields marked * are needed. The clinic replies during clinic hours.</p>
              <AppointmentForm doctorId={d.id} doctorName={d.fullName} clinics={formClinics} />
            </div>
          </div>
        </section>

        {/* ── Beyond medicine: magazine layout ── */}
        {(d.interests.length > 0 || d.interestsPhoto || story) && (
          <Section id="beyond">
            <Heading id="beyond" eyebrow="Beyond medicine" title={story?.title ?? "Away from the clinic"} lead={`What keeps ${firstName} going outside clinic hours.`} />
            {d.interestsPhoto && (
              <figure className="cm-reveal relative mt-10 aspect-[21/9] overflow-hidden rounded-2xl shadow-sp-lg">
                <Image
                  src={d.interestsPhoto.url}
                  alt={d.interestsPhoto.alt}
                  fill
                  sizes="(min-width: 1200px) 1180px, 100vw"
                  className="object-cover transition duration-[1.5s] hover:scale-105"
                />
                {d.interestsPhoto.caption && (
                  <figcaption className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-sp-slate backdrop-blur">
                    {d.interestsPhoto.caption}
                  </figcaption>
                )}
              </figure>
            )}
            {d.interests.length > 0 && (
              <ul className="cm-reveal mt-8 flex flex-wrap gap-2">
                {d.interests.map((it) => (
                  <li key={it} className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-sp-slate ring-1 ring-sp-line">
                    {it}
                  </li>
                ))}
              </ul>
            )}
            {story && (
              <article aria-label={story.title} className="cm-reveal mt-8 gap-10 text-[17px] leading-[1.85] text-sp-text/85 md:columns-2 [&>p+p]:mt-5">
                {story.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className={cn(
                      "break-inside-avoid",
                      i === 0 &&
                        "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[56px] first-letter:font-bold first-letter:leading-[0.8] first-letter:text-sp-crimson",
                    )}
                  >
                    {p}
                  </p>
                ))}
              </article>
            )}
          </Section>
        )}

        {/* ── Health tips ── */}
        {tips.length > 0 && (
          <Section id="health-tips" className="bg-white">
            <Heading id="health-tips" eyebrow="Health tips" title="Good to know" lead="Short, general health information. Not a substitute for a consultation." />
            <HealthTipsSection tips={tips} />
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery">
            <Heading id="gallery" eyebrow="Gallery" title="The clinic" />
            <div className="cm-reveal mt-10">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <Section id="faq" className="bg-white">
            <Heading id="faq" eyebrow="FAQ" title="Before your consultation" />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {faq.map((f, i) => (
                <details
                  key={f.q}
                  className="cm-reveal group h-fit rounded-2xl bg-sp-ice px-5 ring-1 ring-sp-line open:bg-white open:shadow-sp [&_summary::-webkit-details-marker]:hidden"
                  open={i < 2}
                  style={delay((i % 2) * 80)}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-sp-slate">
                    {f.q}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sp-crimson ring-1 ring-sp-line transition group-open:rotate-45 group-open:bg-sp-crimson group-open:text-white">
                      <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 leading-relaxed text-sp-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-sp-slate px-4 text-white sm:px-6">
        <div className="relative mx-auto max-w-[1180px] pt-16">
          <div className="flex flex-col gap-6 rounded-2xl bg-gradient-to-r from-sp-crimson to-sp-crimson-2 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-2xl font-bold sm:text-3xl">Planning a consultation?</p>
              <p className="mt-2 text-white/85">Call {clinic ? clinic.name : "the clinic"} or send a request and the clinic will call you back.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#appointment" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-sp-slate transition hover:-translate-y-0.5">
                <CalendarCheck aria-hidden className="size-[18px]" /> Book
              </a>
              {phone && (
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10"
                >
                  <Phone aria-hidden className="size-[18px]" /> Call now
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.15fr_0.65fr_1.45fr_1.05fr]">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-sp-crimson">
                  <HeartPulse className="size-5" />
                </span>
                <span>
                  <span className="block text-lg font-bold">{d.fullName}</span>
                  {d.primarySpecialty && <span className="block text-sm text-rose-200">{d.primarySpecialty.name}</span>}
                </span>
              </div>
              {d.degreesLine && <p className="mt-4 text-sm text-white/60">{d.degreesLine}</p>}
              {Object.keys(d.links).length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {Object.entries(d.links).map(([k, href]) => (
                    <li key={k}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener me"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"
                      >
                        {LINK_LABELS[k] ?? k} <ArrowUpRight aria-hidden className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <nav aria-label="Footer">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Explore</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {nav.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-white/70 hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={cardHref} className="text-white/70 hover:text-white">
                    Visiting card
                  </a>
                </li>
                <li>
                  <a href={d.vcfUrl} download="" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
                    <UserPlus aria-hidden className="size-3.5" /> Save contact
                  </a>
                </li>
              </ul>
            </nav>
            {clinic && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Clinic hours</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {WEEK_ORDER.map((day) => {
                    const slots = slotsForDay(clinic.timings, day);
                    return (
                      <li key={day} className="flex justify-between gap-4">
                        <span className="text-white/55">{DAY_SHORT[day]}</span>
                        <span className={slots.length ? "whitespace-nowrap text-right text-white/85" : "text-white/40"}>{slots.length ? formatSlots(slots) : "Closed"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                {phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone aria-hidden className="size-4 text-rose-300" />
                    <a href={`tel:+${phone}`} className="hover:text-white">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 shrink-0 text-rose-300" />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-white">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-rose-300" />
                    <span>
                      <span className="block font-semibold text-white">{clinic.name}</span>
                      {clinic.fullAddress}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-2 border-t border-white/10 py-7 text-sm text-white/50">
            <p>Information provided by the doctor. In a medical emergency, call 108 or go to the nearest hospital.</p>
            <p className="flex flex-wrap gap-x-5 gap-y-1">
              <span>
                © {new Date().getFullYear()} {d.fullName}
              </span>
              <span>
                Website by{" "}
                <a href={absUrl("/")} className="underline underline-offset-2 hover:text-white">
                  MediReach
                </a>
              </span>
              {/* Absolute: the login lives on the apex domain, not the doctor's subdomain. */}
              <a href={d.loginUrl ?? absUrl(`/doctor-login?d=${d.id}`)} rel="nofollow" className="underline underline-offset-2 hover:text-white">
                Doctor login
              </a>
            </p>
          </div>
        </div>
        <div aria-hidden className="h-20 sm:hidden" />
      </footer>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={`WhatsApp ${d.fullName}'s clinic`}
          className="fixed bottom-6 right-6 z-30 hidden size-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sp-lg transition hover:scale-105 sm:flex"
        >
          <MessageCircle aria-hidden className="size-7" />
        </a>
      )}

      <ShowAfter targetId="sp-hero-actions">
        <nav
          aria-label="Contact"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-sp-line bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 backdrop-blur transition-transform duration-300 group-data-[hidden]/show:translate-y-full sm:hidden"
        >
          {phone ? (
            <a href={`tel:+${phone}`} className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-sp-ice text-sm font-semibold text-sp-slate">
              <Phone aria-hidden className="size-4" /> Call
            </a>
          ) : (
            <span />
          )}
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white"
            >
              <MessageCircle aria-hidden className="size-4" /> WhatsApp
            </a>
          ) : (
            <span />
          )}
          <a href="#appointment" className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-sp-crimson text-sm font-semibold text-white">
            <CalendarCheck aria-hidden className="size-4" /> Book
          </a>
        </nav>
      </ShowAfter>
    </div>
  );
}
