import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  CalendarCheck,
  Clock,
  GraduationCap,
  IdCard,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Gallery } from "@/components/public/Gallery";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { absUrl } from "@/lib/site";
import { DAY_SHORT, formatSlots, openDaysSummary, slotsForDay, WEEK_ORDER } from "@/lib/timings";
import { describeService } from "@/content/service-descriptions";
import { AppointmentForm } from "@/templates/portfolio/t2/AppointmentForm";
import { HealthTipsSection } from "@/templates/portfolio/t2/HealthTipsSection";
import { CountUp, RevealObserver } from "@/templates/portfolio/t2/Motion";
import { specialtyPhotos } from "@/templates/shared/specialty-photos";
import { splitClinics } from "@/templates/shared/clinic-split";
import { VisitingHospitals } from "@/templates/shared/VisitingHospitals";
import type { PortfolioTemplateProps, PublicDoctor } from "@/templates/types";
import { ClinicList } from "./ClinicList";
import { HeroWipe } from "./HeroWipe";
import { Nav, type NavLink } from "./Nav";
import { ServicesRail } from "./ServicesRail";

/**
 * Portfolio design 3 — "Modern Edge". A bold, editorial one-page website:
 * near-black ink, cobalt blue and signal orange on warm ivory, square
 * corners, big uppercase type and numbered sections.
 *
 * dark nav with scroll progress → hero over a photo carousel that wipes in
 * from the right (photos chosen by specialty) → services ticker → bento "at a
 * glance" grid → about (framed portrait) → services rail → conditions
 * (numbered, dark) → training (stacking cards) → clinics (all open,
 * alternating) → appointment → recognition → beyond medicine (split screen)
 * → health tips → gallery → FAQ → footer.
 *
 * Every section hides itself when its data is empty. Presentation only: the
 * H1, intro sentence, and JSON-LD come from the shared
 * wrapper. Shared widgets from design 2 (form, timings, health tips) are
 * re-coloured by `.me-theme` (globals.css).
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
    <section id={id} {...(labelled ? { "aria-labelledby": `${id}-title` } : {})} className={cn("relative scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28", className)}>
      <div className="relative mx-auto max-w-[1280px]">{children}</div>
    </section>
  );
}

/** "02 / SERVICES" label above a large uppercase heading. */
function Heading({
  id,
  num,
  eyebrow,
  title,
  lead,
  dark,
  className,
}: {
  id: string;
  num?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("cm-reveal max-w-3xl", className)}>
      <p className={cn("flex items-center gap-3 text-xs font-bold uppercase tracking-[0.28em]", dark ? "text-white/60" : "text-me-muted")}>
        {num && <span className="text-me-orange">{num}</span>}
        <span aria-hidden className="h-px w-10 bg-me-orange" />
        {eyebrow}
      </p>
      <h2
        id={`${id}-title`}
        className={cn("mt-5 text-[36px] font-bold uppercase leading-[0.98] tracking-[-0.02em] sm:text-[52px] lg:text-[64px]", dark ? "text-white" : "text-me-ink")}
      >
        {title}
      </h2>
      {lead && <p className={cn("mt-5 max-w-xl text-[17px] leading-relaxed", dark ? "text-white/70" : "text-me-muted")}>{lead}</p>}
    </div>
  );
}

function faqs(d: PublicDoctor): { q: string; a: string }[] {
  const c = d.clinics[0];
  const out: { q: string; a: string }[] = [];
  if (c) {
    const hours = openDaysSummary(c.timings).replace(/ \| /g, "; ");
    out.push({
      q: `Where is ${c.name}?`,
      a: `${c.fullAddress}.${
        d.clinics.length > 1
          ? ` ${d.fullName} also consults at ${d.clinics
              .slice(1)
              .map((x) => `${x.name}, ${x.area.name}`)
              .join(" and ")}.`
          : ""
      }`,
    });
    if (hours)
      out.push({
        q: "What are the clinic timings?",
        a: `${c.name}: ${hours}.${c.appointmentNote ? ` ${c.appointmentNote}` : ""}`,
      });
  }
  out.push({
    q: "How do I book an appointment?",
    a: `Send a request with the form on this page and the clinic will call you back to fix a time.${d.phone ? ` You can also call ${formatPhone(d.phone)}${d.whatsapp ? " or send a WhatsApp message" : ""}.` : ""}`,
  });
  out.push({
    q: "What should I bring to my first visit?",
    a: "Any earlier prescriptions, X-rays, scans and test reports, and a list of the medicines you take.",
  });
  if (c && typeof c.fee === "number")
    out.push({
      q: "What is the consultation fee?",
      a: `The consultation fee at ${c.name} is ₹${c.fee.toLocaleString("en-IN")}. Tests, X-rays and procedures are charged separately.`,
    });
  if (d.languages.length)
    out.push({
      q: `Which languages does ${d.fullName} speak?`,
      a: `${d.languages.join(", ")}.`,
    });
  return out;
}

export default function ModernEdgePortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const photos = specialtyPhotos(d);
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const cardHref = d.cardUrl ?? `${d.url}/card`;
  const firstName = d.fullName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0];
  const years = d.practiceSinceYear ? new Date().getFullYear() - d.practiceSinceYear : undefined;
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const tips = d.healthTips ?? [];
  const story = d.interestsStory;
  const waHref = d.whatsapp ? `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(`Hello ${d.fullName}, I would like to book an appointment.`)}` : undefined;
  const { main: mainClinics, visiting } = splitClinics(d.clinics);
  const clinicPhotos = mainClinics.map((_, i) => d.gallery[i]?.url ?? photos.side.src);
  const faq = faqs(d);
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";
  const hasRecognition = d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0;
  const services = d.services.map((s) => ({
    name: s.name,
    ...describeService(s.name, s.description),
  }));
  const formClinics = d.clinics.map((c) => ({
    id: c.id,
    name: c.name,
    area: c.area.name,
  }));
  const hours = clinic ? openDaysSummary(clinic.timings).split(" | ").filter(Boolean).slice(0, 3) : [];
  const awards = [...d.awards].sort((a, b) => a.year - b.year);

  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(services.length ? [{ label: "Services", href: "#services" }] : []),
    ...(d.qualifications.length ? [{ label: "Training", href: "#education" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    ...(tips.length ? [{ label: "Health tips", href: "#health-tips" }] : []),
    { label: "Contact", href: "#appointment" },
  ];

  return (
    <div id="me-top" className="me-theme overflow-x-clip bg-me-ivory font-sans text-me-text">
      <RevealObserver rootId="me-top" />
      <Nav name={d.fullName} monogram={initials(d.fullName)} tagline={d.primarySpecialty?.name} links={nav} phone={phone} />

      <main>
        {/* ── Hero ── */}
        <section
          id="top"
          aria-label="Introduction"
          className="relative isolate -mt-[72px] flex min-h-[720px] items-end overflow-hidden bg-me-ink pb-20 pt-36 md:pb-28 lg:min-h-[880px]"
        >
          <HeroWipe slides={photos.hero} />
          <div aria-hidden className="absolute inset-0 z-[3] bg-gradient-to-r from-me-ink via-me-ink/80 to-me-ink/20" />
          <div aria-hidden className="absolute inset-0 z-[3] bg-gradient-to-t from-me-ink/90 via-transparent to-me-ink/50" />
          <div aria-hidden className="me-grid-bg absolute inset-0 z-[3]" />
          <div aria-hidden className="absolute -left-24 top-1/3 z-[3] size-[420px] rounded-full bg-me-cobalt/30 blur-[100px]" />

          <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 sm:px-6">
            <div className="max-w-[780px]">
              <p className="cm-rise flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.28em] text-white/80">
                <span className="bg-me-orange px-2.5 py-1 text-white">{d.primarySpecialty?.name ?? "Doctor"}</span>
                {place}
              </p>
              <div
                className="cm-rise mt-7 [&_h1]:!font-sans [&_h1]:!text-[44px] [&_h1]:!font-bold [&_h1]:!uppercase [&_h1]:!leading-[0.95] [&_h1]:!tracking-[-0.03em] [&_h1]:!text-white sm:[&_h1]:!text-[68px] lg:[&_h1]:!text-[88px] [&_p]:!text-white/75 [&_p:first-of-type]:!mt-5 [&_p:first-of-type]:!font-semibold [&_p:first-of-type]:!uppercase [&_p:first-of-type]:!tracking-[0.14em] [&_p:first-of-type]:!text-me-sky [&_svg]:!text-me-orange"
                style={delay(120)}
              >
                {seo.heading}
              </div>
              {d.degreesLine && (
                <p className="cm-rise mt-4 text-lg font-semibold text-white" style={delay(220)}>
                  {d.degreesLine}
                  {d.systemLabel && <span className="ml-2 bg-white/15 px-2 py-0.5 text-sm">{d.systemLabel}</span>}
                </p>
              )}
              {d.shortBio && (
                <p className="cm-rise mt-5 max-w-xl border-l-[3px] border-me-orange pl-5 text-[17px] leading-relaxed text-white/75" style={delay(300)}>
                  {d.shortBio}
                </p>
              )}
              <div id="me-hero-actions" className="cm-rise mt-9 flex flex-wrap gap-3" style={delay(400)}>
                <a
                  href="#appointment"
                  className="group inline-flex h-14 items-center gap-3 bg-me-orange px-7 font-bold uppercase tracking-wider text-white transition hover:bg-me-orange-2"
                >
                  Book an appointment
                  <ArrowRight aria-hidden className="size-5 transition group-hover:translate-x-1" strokeWidth={2.5} />
                </a>
                {phone && (
                  <a
                    href={`tel:+${phone}`}
                    className="inline-flex h-14 items-center gap-3 px-6 font-bold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white hover:text-me-ink"
                  >
                    <Phone aria-hidden className="size-5" strokeWidth={2} />
                    Call the clinic
                  </a>
                )}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener"
                    aria-label="WhatsApp"
                    className="inline-flex size-14 items-center justify-center bg-[#25D366] text-white transition hover:brightness-110"
                  >
                    <MessageCircle aria-hidden className="size-6" strokeWidth={2} />
                  </a>
                )}
              </div>
              <ul className="cm-rise mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/75" style={delay(500)}>
                {d.registration.council && (
                  <li className="inline-flex items-center gap-2">
                    <BadgeCheck aria-hidden className="size-5 text-me-sky" strokeWidth={2} />
                    Registered, {d.registration.council}
                  </li>
                )}
                {d.languages.length > 0 && (
                  <li className="inline-flex items-center gap-2">
                    <Languages aria-hidden className="size-5 text-me-sky" strokeWidth={2} />
                    {d.languages.join(" / ")}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Services ticker ── */}
        {services.length > 0 && (
          <div aria-hidden className="overflow-hidden bg-me-orange py-4 text-white">
            <div className="me-ticker flex w-max items-center gap-8 whitespace-nowrap">
              {[...services, ...services].map((s, i) => (
                <span key={`${s.name}-${i}`} className="flex items-center gap-8 text-lg font-bold uppercase tracking-tight sm:text-2xl">
                  {s.name}
                  <Zap className="size-5 fill-current text-me-ink" strokeWidth={0} />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── At a glance: bento ── */}
        <section aria-label="At a glance" className="px-4 pt-20 sm:px-6 lg:pt-28">
          <div className="mx-auto grid max-w-[1280px] auto-rows-[minmax(110px,auto)] gap-4 md:auto-rows-[minmax(170px,auto)] md:grid-cols-4">
            {years && years > 0 ? (
              <div className="cm-reveal flex flex-col justify-between bg-me-ink p-7 text-white md:col-span-1 md:row-span-2">
                <Clock aria-hidden className="size-7 text-me-orange" strokeWidth={1.8} />
                <div>
                  <p className="text-[88px] font-bold leading-none tracking-tighter">
                    <CountUp value={years} suffix="+" />
                  </p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-white/60">Years in practice</p>
                  {d.practiceSinceYear && <p className="mt-1 text-sm text-white/40">Since {d.practiceSinceYear}</p>}
                </div>
              </div>
            ) : null}
            <div className="cm-reveal group relative min-h-[260px] overflow-hidden md:col-span-2 md:row-span-2" style={delay(80)}>
              <Image
                src={photos.feature.src}
                alt={photos.feature.alt}
                fill
                sizes="(min-width: 768px) 640px, 100vw"
                className="object-cover transition duration-[1.4s] group-hover:scale-105"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-me-ink/85 to-transparent" />
              <p className="absolute inset-x-7 bottom-7 max-w-md text-2xl font-bold uppercase leading-tight tracking-tight text-white">
                {d.primarySpecialty?.name ?? "Consultations"}
                {place && <span className="block text-base font-semibold normal-case tracking-normal text-white/75">{place}</span>}
              </p>
            </div>
            {clinic && hours.length > 0 && (
              <div className="cm-reveal bg-me-cobalt p-7 text-white" style={delay(160)}>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">Clinic hours</p>
                <ul className="mt-3 space-y-1 text-sm font-semibold">
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {reg && (
              <div className="cm-reveal bg-white p-7 ring-1 ring-me-line" style={delay(220)}>
                <BadgeCheck aria-hidden className="size-6 text-me-cobalt" strokeWidth={1.8} />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-me-muted">Registration</p>
                <p className="mt-1 font-bold text-me-ink">{reg}</p>
              </div>
            )}
            <div className="cm-reveal bg-white p-7 ring-1 ring-me-line md:col-span-3" style={delay(120)}>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-me-muted">Numbers</p>
              <dl className="mt-3 grid grid-cols-3 gap-4">
                {[
                  { v: d.services.length, l: "Services" },
                  { v: d.conditionsTreated.length, l: "Conditions" },
                  {
                    v: d.clinics.length,
                    l: d.clinics.length === 1 ? "Clinic" : "Clinics",
                  },
                ].map((s) => (
                  <div key={s.l}>
                    <dd className="text-4xl font-bold tracking-tight text-me-ink">
                      <CountUp value={s.v} />
                    </dd>
                    <dt className="text-xs font-bold uppercase tracking-wider text-me-muted">{s.l}</dt>
                  </div>
                ))}
              </dl>
            </div>
            <a
              href="#appointment"
              className="cm-reveal group flex flex-col justify-between bg-me-orange p-7 text-white transition hover:bg-me-orange-2 md:col-span-1"
              style={delay(200)}
            >
              <ArrowUpRight aria-hidden className="size-8 self-end transition duration-500 group-hover:rotate-45" strokeWidth={2} />
              <span className="text-xl font-bold uppercase leading-tight tracking-tight">Request an appointment</span>
            </a>
          </div>
        </section>

        {/* ── About ── */}
        <Section id="about">
          <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="cm-reveal cm-left relative mx-auto w-full max-w-[460px] lg:sticky lg:top-24">
              <div className="relative">
                <div aria-hidden className="absolute -bottom-4 -right-4 h-full w-full border-[3px] border-me-orange" />
                <div className="relative aspect-[4/5] overflow-hidden bg-me-steel">
                  {d.photo ? (
                    <Image
                      src={d.photo.url}
                      alt={d.photo.alt}
                      fill
                      sizes="(min-width: 1024px) 460px, 90vw"
                      className="object-cover object-top grayscale-[15%] transition duration-700 hover:grayscale-0"
                    />
                  ) : (
                    <span aria-hidden className="flex h-full items-center justify-center text-[120px] font-bold text-me-ink/15">
                      {initials(d.fullName)}
                    </span>
                  )}
                </div>
              </div>
              <p className="relative mt-8 text-sm font-bold uppercase tracking-[0.22em] text-me-muted">
                {d.fullName}
                {d.primarySpecialty && <span className="block text-me-orange">{d.primarySpecialty.name}</span>}
              </p>
            </div>
            <div className="min-w-0">
              <Heading id="about" num={num()} eyebrow="About" title={`Meet ${d.fullName}`} />
              <div className="cm-reveal mt-8 space-y-4 text-[17px] leading-[1.8] text-me-text/85">
                <div className="text-xl font-semibold leading-relaxed text-me-ink">{seo.intro}</div>
                {d.fullBioHtml && (
                  <div
                    className="prose-bio [&_li]:border-l-[3px] [&_li]:border-me-orange [&_li]:bg-white [&_li]:px-4 [&_li]:py-3 [&_li]:font-semibold [&_li]:text-me-ink [&_ul]:mt-6 [&_ul]:grid [&_ul]:!list-none [&_ul]:gap-3 [&_ul]:!pl-0 sm:[&_ul]:grid-cols-2"
                    dangerouslySetInnerHTML={{ __html: d.fullBioHtml }}
                  />
                )}
              </div>
              <dl className="cm-reveal mt-8 grid gap-px bg-me-line sm:grid-cols-2">
                <div className="bg-white p-5">
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-me-muted">Practice</dt>
                  <dd className="mt-1 font-bold text-me-ink">{d.practitionerType === "consultant" ? "Consultant" : "General practitioner"}</dd>
                </div>
                {d.systemLabel ? (
                  <div className="bg-white p-5">
                    <dt className="text-xs font-bold uppercase tracking-[0.2em] text-me-muted">System of medicine</dt>
                    <dd className="mt-1 font-bold text-me-ink">{d.systemLabel}</dd>
                  </div>
                ) : (
                  d.languages.length > 0 && (
                    <div className="bg-white p-5">
                      <dt className="text-xs font-bold uppercase tracking-[0.2em] text-me-muted">Languages</dt>
                      <dd className="mt-1 font-bold text-me-ink">{d.languages.join(", ")}</dd>
                    </div>
                  )
                )}
                {reg && (
                  <div className="bg-white p-5 sm:col-span-2">
                    <dt className="text-xs font-bold uppercase tracking-[0.2em] text-me-muted">Registration</dt>
                    <dd className="mt-1 font-bold text-me-ink">{reg}</dd>
                    {(d.registration.year || d.registration.nmrId) && (
                      <dd className="text-sm text-me-muted">
                        {[d.registration.year ? `Registered in ${d.registration.year}` : "", d.registration.nmrId ? `NMR ID ${d.registration.nmrId}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    )}
                  </div>
                )}
              </dl>
              {(d.primarySpecialty || d.secondarySpecialties.length > 0) && (
                <ul className="cm-reveal mt-8 flex flex-wrap gap-2">
                  {[d.primarySpecialty, ...d.secondarySpecialties].filter(Boolean).map((s) => (
                    <li key={s!.slug} className="bg-me-ink px-4 py-2 text-sm font-bold uppercase tracking-wider text-white">
                      {s!.name}
                    </li>
                  ))}
                </ul>
              )}
              <div className="cm-reveal mt-8 flex flex-wrap gap-3">
                <a
                  href="#appointment"
                  className="inline-flex h-12 items-center gap-2 bg-me-ink px-6 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-me-cobalt"
                >
                  Book a visit <ArrowRight aria-hidden className="size-4" />
                </a>
                <a
                  href={cardHref}
                  className="inline-flex h-12 items-center gap-2 px-6 text-sm font-bold uppercase tracking-wider text-me-ink ring-1 ring-me-line transition hover:bg-white"
                >
                  <IdCard aria-hidden className="size-5" strokeWidth={1.9} /> Visiting card
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Services ── */}
        {services.length > 0 && (
          <Section id="services" className="bg-me-steel">
            <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <Heading
                id="services"
                num={num()}
                eyebrow="Services"
                title="What I treat"
                lead={`From the first consultation to rehabilitation, everything ${firstName} offers at the clinic.`}
              />
              <a
                href="#appointment"
                className="cm-reveal inline-flex h-12 w-fit items-center gap-2 bg-me-orange px-6 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-me-orange-2"
              >
                Ask the clinic <ArrowUpRight aria-hidden className="size-4" />
              </a>
            </div>
            <ServicesRail services={services} />
          </Section>
        )}

        {/* ── Conditions ── */}
        {d.conditionsTreated.length > 0 && (
          <section id="conditions" aria-labelledby="conditions-title" className="relative overflow-hidden bg-me-ink px-4 py-20 text-white sm:px-6 lg:py-28">
            <div aria-hidden className="me-grid-bg absolute inset-0" />
            <p
              aria-hidden
              className="me-outline-white pointer-events-none absolute -right-10 top-6 select-none text-[120px] font-bold uppercase leading-none tracking-tighter sm:text-[200px]"
            >
              Care
            </p>
            <div className="relative mx-auto max-w-[1280px]">
              <Heading id="conditions" num={num()} eyebrow="Conditions" title="Problems I see every week" lead="If yours is not listed, please ask the clinic." dark />
              <ol className="mt-14 grid border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">
                {d.conditionsTreated.map((c, i) => (
                  <li
                    key={c}
                    className="cm-reveal group flex items-baseline gap-5 border-b border-white/15 py-5 pr-4 transition-colors hover:bg-white/[0.04]"
                    style={delay(Math.min(i, 9) * 40)}
                  >
                    <span className="w-8 text-sm font-bold tabular-nums text-me-orange">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-lg font-semibold transition-transform duration-300 group-hover:translate-x-1.5">{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ── Training: stacking cards ── */}
        {d.qualifications.length > 0 && (
          <Section id="education">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Heading
                  id="education"
                  num={num()}
                  eyebrow="Training"
                  title="Education"
                  lead={d.registration.council ? `Registered with the ${d.registration.council}${d.registration.year ? ` since ${d.registration.year}` : ""}.` : undefined}
                />
                <p className="cm-reveal mt-8 bg-white p-6 text-lg font-bold text-me-ink ring-1 ring-me-line">{d.degreesLine}</p>
              </div>
              <ol className="space-y-6">
                {d.qualifications.map((q, i) => (
                  <li
                    key={`${q.degree}-${i}`}
                    className={cn(
                      "cm-reveal sticky p-8 shadow-me-lg ring-1 sm:p-10",
                      i % 3 === 0 ? "bg-me-ink text-white ring-me-ink" : i % 3 === 1 ? "bg-me-cobalt text-white ring-me-cobalt" : "bg-white text-me-ink ring-me-line",
                    )}
                    style={{ top: `${96 + i * 24}px` }}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <GraduationCap aria-hidden className={cn("size-8", i % 3 === 2 ? "text-me-orange" : "text-me-sky")} strokeWidth={1.6} />
                      {q.year && <span className={cn("text-5xl font-bold tracking-tighter sm:text-6xl", i % 3 === 2 ? "text-me-ink/15" : "text-white/20")}>{q.year}</span>}
                    </div>
                    <p className="mt-8 text-3xl font-bold uppercase tracking-tight">{q.degree}</p>
                    {q.specialization && !q.degree.includes(q.specialization) && (
                      <p className={cn("mt-1 text-lg font-semibold", i % 3 === 2 ? "text-me-cobalt" : "text-me-sky")}>{q.specialization}</p>
                    )}
                    {q.institute && <p className={cn("mt-3", i % 3 === 2 ? "text-me-muted" : "text-white/70")}>{q.institute}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        )}

        {/* ── Clinics ── */}
        {d.clinics.length > 0 && (
          <Section id="clinics" className="bg-me-steel">
            <Heading
              id="clinics"
              num={num()}
              eyebrow="Clinics"
              title={mainClinics.length > 1 ? "Where to find me" : "Visit the clinic"}
              lead={
                mainClinics.length > 1
                  ? `${firstName} consults at ${mainClinics.length} clinics. Timings, directions and live open/closed status for each.`
                  : "Timings, directions and whether the clinic is open right now."
              }
            />
            <div className="mt-12">
              <ClinicList clinics={mainClinics} photos={clinicPhotos} />
            </div>
            <VisitingHospitals hospitals={visiting} square />
          </Section>
        )}

        {/* ── Appointment ── */}
        <section id="appointment" aria-labelledby="appointment-title" className="relative isolate scroll-mt-16 overflow-hidden bg-me-ink px-4 py-20 text-white sm:px-6 lg:py-28">
          <Image src={photos.band.src} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-25" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-me-ink via-me-ink/90 to-me-cobalt-2/70" />
          <div aria-hidden className="me-grid-bg absolute inset-0 -z-10" />
          <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Heading id="appointment" num={num()} eyebrow="Appointments" title="Book a visit" lead="Send a request and the clinic will call you back to confirm a time." dark />
              <ol className="cm-reveal mt-10 grid gap-px bg-white/15">
                {[
                  {
                    t: "Send your request",
                    s: "Name, mobile and a preferred day.",
                  },
                  {
                    t: "We call you back",
                    s: "To confirm the time and what to bring.",
                  },
                  {
                    t: "Visit the clinic",
                    s: clinic ? `${clinic.name}, ${clinic.area.name}.` : "At the time you agreed.",
                  },
                ].map((step, i) => (
                  <li key={step.t} className="flex items-center gap-5 bg-me-ink/80 p-5">
                    <span className="text-4xl font-bold tabular-nums text-me-orange">{i + 1}</span>
                    <span>
                      <span className="block font-bold uppercase tracking-wide">{step.t}</span>
                      <span className="block text-sm text-white/65">{step.s}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <ul className="cm-reveal mt-6 grid gap-3 sm:grid-cols-2">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 p-4 ring-1 ring-white/20 transition hover:bg-white hover:text-me-ink">
                      <Phone aria-hidden className="size-5 text-me-orange" /> <span className="font-bold">{formatPhone(phone)}</span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a href={waHref} target="_blank" rel="noopener" className="flex items-center gap-3 p-4 ring-1 ring-white/20 transition hover:bg-[#25D366]">
                      <MessageCircle aria-hidden className="size-5 text-[#4ade80]" /> <span className="font-bold">WhatsApp</span>
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="sm:col-span-2">
                    <a href={`mailto:${d.email}`} className="flex items-center gap-3 p-4 ring-1 ring-white/20 transition hover:bg-white hover:text-me-ink">
                      <Mail aria-hidden className="size-5 shrink-0 text-me-orange" /> <span className="truncate font-bold">{d.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="cm-reveal cm-zoom bg-white p-6 text-me-text shadow-me-lg sm:p-10 [&_button[type=submit]]:!rounded-none [&_input]:!rounded-none [&_select]:!rounded-none [&_textarea]:!rounded-none">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-me-orange">Appointment request</p>
              <h3 className="mt-2 text-2xl font-bold uppercase tracking-tight text-me-ink">Tell us when suits you</h3>
              <p className="mb-7 mt-1 text-sm text-me-muted">Fields marked * are needed. The clinic replies during clinic hours.</p>
              <AppointmentForm doctorId={d.id} doctorName={d.fullName} clinics={formClinics} />
            </div>
          </div>
        </section>

        {/* ── Recognition ── */}
        {hasRecognition && (
          <Section id="recognition">
            <Heading id="recognition" num={num()} eyebrow="Recognition" title="Awards and memberships" />
            {awards.length > 0 && (
              <ol className="mt-14 grid gap-px bg-me-line md:grid-cols-3">
                {awards.map((a, i) => (
                  <li key={`${a.title}-${a.year}`} className="cm-reveal group bg-me-ivory p-8 transition-colors duration-500 hover:bg-me-ink" style={delay(i * 100)}>
                    <p className="me-outline text-6xl font-bold tracking-tighter group-hover:[--me-stroke:#e8591f]">{a.year}</p>
                    <Award aria-hidden className="mt-6 size-6 text-me-orange" strokeWidth={1.8} />
                    <p className="mt-3 text-lg font-bold text-me-ink transition-colors group-hover:text-white">{a.title}</p>
                    <p className="mt-1 text-sm text-me-muted transition-colors group-hover:text-white/60">{a.awardingBody}</p>
                  </li>
                ))}
              </ol>
            )}
            {(d.memberships.length > 0 || d.publications.length > 0) && (
              <div className="mt-10 grid gap-10 md:grid-cols-2">
                {d.memberships.length > 0 && (
                  <div className="cm-reveal">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-me-muted">
                      <Users aria-hidden className="size-4 text-me-orange" /> Memberships
                    </p>
                    <ul className="mt-4 divide-y divide-me-line border-y border-me-line">
                      {d.memberships.map((m) => (
                        <li key={m.name} className="flex items-baseline justify-between gap-4 py-4">
                          <span className="font-semibold text-me-ink">{m.name}</span>
                          {m.since && <span className="shrink-0 text-sm font-bold text-me-cobalt">Since {m.since}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.publications.length > 0 && (
                  <div className="cm-reveal">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-me-muted">Publications</p>
                    <ul className="mt-4 divide-y divide-me-line border-y border-me-line">
                      {d.publications.map((p) => (
                        <li key={p.title} className="py-4">
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noopener" className="font-semibold text-me-ink hover:text-me-cobalt">
                              {p.title}
                            </a>
                          ) : (
                            <span className="font-semibold text-me-ink">{p.title}</span>
                          )}
                          <span className="block text-sm text-me-muted">{[p.journal, p.year].filter(Boolean).join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* ── Beyond medicine: split screen ── */}
        {(d.interests.length > 0 || d.interestsPhoto || story) && (
          <section id="beyond" aria-labelledby="beyond-title" className="grid scroll-mt-16 bg-white lg:grid-cols-2">
            {d.interestsPhoto && (
              <figure className="relative min-h-[380px] lg:sticky lg:top-0 lg:h-screen">
                <Image src={d.interestsPhoto.url} alt={d.interestsPhoto.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-me-ink/80 via-transparent to-transparent" />
                {d.interestsPhoto.caption && (
                  <figcaption className="absolute bottom-8 left-8 right-8 text-sm font-bold uppercase tracking-[0.2em] text-white">
                    <span className="mr-3 inline-block h-px w-10 bg-me-orange align-middle" />
                    {d.interestsPhoto.caption}
                  </figcaption>
                )}
              </figure>
            )}
            <div className={cn("px-4 py-20 sm:px-10 lg:px-16 lg:py-28", !d.interestsPhoto && "lg:col-span-2 lg:mx-auto lg:max-w-4xl")}>
              <Heading id="beyond" num={num()} eyebrow="Beyond medicine" title="Off duty" lead={`What keeps ${firstName} going outside clinic hours.`} />
              {d.interests.length > 0 && (
                <ul className="cm-reveal mt-8 flex flex-wrap gap-2">
                  {d.interests.map((it) => (
                    <li key={it} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-me-ink ring-1 ring-me-line">
                      {it}
                    </li>
                  ))}
                </ul>
              )}
              {story && (
                <article aria-labelledby="beyond-story" className="cm-reveal mt-10">
                  <h3 id="beyond-story" className="text-2xl font-bold uppercase leading-tight tracking-tight text-me-ink sm:text-3xl">
                    {story.title}
                  </h3>
                  <div className="mt-6 space-y-5 text-[17px] leading-[1.85] text-me-text/85">
                    {story.paragraphs.map((p, i) => (
                      <p key={i} className={cn(i === 0 && "text-xl font-medium leading-relaxed text-me-ink")}>
                        {p}
                      </p>
                    ))}
                  </div>
                </article>
              )}
            </div>
          </section>
        )}

        {/* ── Health tips ── */}
        {tips.length > 0 && (
          <Section id="health-tips" className="bg-me-steel">
            <Heading
              id="health-tips"
              num={num()}
              eyebrow="Health tips"
              title="Good to know"
              lead="Short, general health information for patients and families. Not a substitute for a consultation."
            />
            <div className="[&_li>a]:!rounded-none">
              <HealthTipsSection tips={tips} />
            </div>
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery">
            <Heading id="gallery" num={num()} eyebrow="Gallery" title="The clinic" />
            <div className="cm-reveal mt-12">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <Section id="faq" className="bg-white">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <Heading id="faq" num={num()} eyebrow="FAQ" title="Before you visit" />
              <div className="cm-reveal border-t border-me-line">
                {faq.map((f, i) => (
                  <details key={f.q} className="group border-b border-me-line [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                    <summary className="flex min-h-[72px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-bold text-me-ink transition-colors hover:text-me-cobalt">
                      <span className="flex items-baseline gap-4">
                        <span className="text-sm text-me-orange">{String(i + 1).padStart(2, "0")}</span>
                        {f.q}
                      </span>
                      <span className="flex size-10 shrink-0 items-center justify-center bg-me-steel text-me-ink transition group-open:bg-me-ink group-open:text-white">
                        <Plus aria-hidden className="size-4 group-open:hidden" strokeWidth={2.5} />
                        <Minus aria-hidden className="hidden size-4 group-open:block" strokeWidth={2.5} />
                      </span>
                    </summary>
                    <p className="pb-6 pl-9 pr-14 leading-relaxed text-me-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-me-ink px-4 text-white sm:px-6">
        <div aria-hidden className="me-grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-[1280px] pt-20">
          <div className="flex flex-col gap-8 border-b border-white/10 pb-14 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-2xl text-4xl font-bold uppercase leading-[0.98] tracking-tight sm:text-6xl">
              Planning a visit<span className="text-me-orange">?</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#appointment"
                className="inline-flex h-14 items-center gap-2 bg-me-orange px-6 font-bold uppercase tracking-wider text-white transition hover:bg-me-orange-2"
              >
                <CalendarCheck aria-hidden className="size-5" /> Book
              </a>
              {phone && (
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex h-14 items-center gap-2 px-6 font-bold text-white ring-1 ring-white/25 transition hover:bg-white hover:text-me-ink"
                >
                  <Phone aria-hidden className="size-5" /> Call the clinic
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.1fr_1.1fr]">
            <div>
              <p className="text-lg font-bold uppercase tracking-wide">{d.fullName}</p>
              {d.primarySpecialty && <p className="text-sm font-semibold uppercase tracking-[0.18em] text-me-sky">{d.primarySpecialty.name}</p>}
              {d.degreesLine && <p className="mt-4 text-sm text-white/60">{d.degreesLine}</p>}
              {Object.keys(d.links).length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {Object.entries(d.links).map(([k, href]) => (
                    <li key={k}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener me"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white hover:text-me-ink"
                      >
                        {LINK_LABELS[k] ?? k} <ArrowUpRight aria-hidden className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <nav aria-label="Footer">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-me-orange">Explore</p>
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
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-me-orange">Clinic hours</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {WEEK_ORDER.map((day) => {
                    const slots = slotsForDay(clinic.timings, day);
                    return (
                      <li key={day} className="flex justify-between gap-4">
                        <span className="text-white/55">{DAY_SHORT[day]}</span>
                        <span className={slots.length ? "text-right text-white/85" : "text-white/40"}>{slots.length ? formatSlots(slots) : "Closed"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-me-orange">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                {phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone aria-hidden className="size-4 text-me-sky" />
                    <a href={`tel:+${phone}`} className="hover:text-white">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 shrink-0 text-me-sky" />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-white">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-me-sky" />
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
            <p>
              Information provided by the doctor. In a medical emergency, call 108 or go to the nearest hospital.
            </p>
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
      </footer>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={`WhatsApp ${d.fullName}'s clinic`}
          className="fixed bottom-6 left-6 z-30 hidden size-14 items-center justify-center bg-[#25D366] text-white shadow-me-lg transition hover:scale-105 sm:flex"
        >
          <MessageCircle aria-hidden className="relative size-7" strokeWidth={2} />
        </a>
      )}

    </div>
  );
}
