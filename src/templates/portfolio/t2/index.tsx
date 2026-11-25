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
  Building2,
  CalendarCheck,
  Check,
  Clock,
  ClipboardCheck,
  Droplet,
  Eye,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Mountain,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  ShieldCheck,
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
import { formatSlots, openDaysSummary, slotsForDay, WEEK_ORDER, DAY_SHORT } from "@/lib/timings";
import { describeService, type ServiceIcon } from "@/content/service-descriptions";
import { ShowAfter } from "@/templates/portfolio/classic/ShowAfter";
import type { PortfolioTemplateProps, PublicDoctor } from "@/templates/types";
import { AppointmentForm } from "./AppointmentForm";
import { ClinicsSection } from "./ClinicsSection";
import { HealthTipsSection } from "./HealthTipsSection";
import { HeroCarousel, type Slide } from "./HeroCarousel";
import { CountUp, RevealObserver } from "./Motion";
import { Nav, type NavLink } from "./Nav";

/**
 * Portfolio design 2 — "Clinic Modern". A photo-led, animated one-page website
 * in a navy / clinical blue / teal medical palette:
 *
 * nav → hero (background photo carousel, portrait, years badge) → quick
 * info strip → about → numbers band (photo) → services (photo + numbered
 * list, default descriptions) → conditions marquee → education → clinics
 * (one open at a time: details, weekly timings, small map) → appointment form
 * (photo band) → awards and memberships → beyond medicine → health tips
 * (optional, general articles) → gallery → FAQ → footer, plus a mobile bar.
 *
 * Every section hides itself when its data is empty. Presentation only: the
 * H1, intro sentence, nearby doctors and JSON-LD come from the shared wrapper.
 *
 * NMC: no ratings, reviews, testimonials, patient counts or superlatives.
 * Numbers shown are facts the doctor entered (years, clinics, languages).
 * Photos: public/templates/clinic-modern (Pexels, see CREDITS.md).
 */

const IMG = "/templates/clinic-modern";

const HERO_SLIDES: Slide[] = [
  { src: `${IMG}/hero-1.jpg`, alt: "A doctor examining a patient in a clinic" },
  { src: `${IMG}/hero-2.jpg`, alt: "A clean, bright examination room" },
  { src: `${IMG}/hero-3.jpg`, alt: "A family sharing a meal at home" },
  { src: `${IMG}/hero-4.jpg`, alt: "A doctor writing notes with a stethoscope on the desk" },
];

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
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({ id, className, children, labelled = true }: { id: string; className?: string; children: React.ReactNode; labelled?: boolean }) {
  return (
    <section id={id} {...(labelled ? { "aria-labelledby": `${id}-title` } : {})} className={cn("relative scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28", className)}>
      <div className="relative mx-auto max-w-[1240px]">{children}</div>
    </section>
  );
}

function Heading({
  id,
  eyebrow,
  title,
  lead,
  center,
  dark,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("cm-reveal max-w-2xl", center && "mx-auto text-center", className)}>
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em]",
          dark ? "bg-white/10 text-cm-gold ring-1 ring-white/15" : "bg-cm-mint text-cm-teal-2",
        )}
      >
        <HeartPulse aria-hidden className="size-3.5" strokeWidth={2.25} />
        {eyebrow}
      </p>
      <h2 id={`${id}-title`} className={cn("mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[44px]", dark ? "text-white" : "text-cm-navy")}>
        {title}
      </h2>
      {lead && <p className={cn("mt-4 text-[17px] leading-relaxed", dark ? "text-white/75" : "text-cm-muted")}>{lead}</p>}
    </div>
  );
}


// ---------------------------------------------------------------------------
// FAQ (facts the doctor entered; no claims)
// ---------------------------------------------------------------------------

function faqs(d: PublicDoctor): { q: string; a: string }[] {
  const c = d.clinics[0];
  const out: { q: string; a: string }[] = [];
  if (c) {
    const hours = openDaysSummary(c.timings).replace(/ \| /g, "; ");
    out.push({ q: `Where is ${c.name}?`, a: `${c.fullAddress}.${d.clinics.length > 1 ? ` ${d.fullName} also consults at ${d.clinics.slice(1).map((x) => `${x.name}, ${x.area.name}`).join(" and ")}.` : ""}` });
    if (hours) out.push({ q: `What are the clinic timings?`, a: `${c.name}: ${hours}.${c.appointmentNote ? ` ${c.appointmentNote}` : ""}` });
  }
  out.push({
    q: "How do I book an appointment?",
    a: `Send a request with the form on this page and the clinic will call you back to fix a time.${d.phone ? ` You can also call ${formatPhone(d.phone)}${d.whatsapp ? " or send a WhatsApp message" : ""}.` : ""}`,
  });
  if (c && typeof c.fee === "number") out.push({ q: "What is the consultation fee?", a: `The consultation fee at ${c.name} is ₹${c.fee.toLocaleString("en-IN")}. Tests and medicines are charged separately.` });
  if (d.languages.length) out.push({ q: `Which languages does ${d.fullName} speak?`, a: `${d.languages.join(", ")}.` });
  return out;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClinicModernPortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const clinic = d.clinics[0];
  const phone = d.phone ?? clinic?.phone;
  const cardHref = d.cardUrl ?? `${d.url}/card`;
  const firstName = d.fullName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0];
  const years = d.practiceSinceYear ? new Date().getFullYear() - d.practiceSinceYear : undefined;
  const reg = [d.registration.council, d.registration.number].filter(Boolean).join(" · ");
  const regMore = [d.registration.year ? `Registered in ${d.registration.year}` : "", d.registration.nmrId ? `NMR ID ${d.registration.nmrId}` : ""].filter(Boolean).join(" · ");
  const hasRecognition = d.awards.length > 0 || d.memberships.length > 0;
  const tips = d.healthTips ?? [];
  const story = d.interestsStory;
  const waHref = d.whatsapp ? `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(`Hello ${d.fullName}, I would like to book an appointment.`)}` : undefined;
  const clinicPhotos = d.clinics.map((_, i) => d.gallery[i + 1]?.url ?? d.gallery[0]?.url ?? `${IMG}/band-appointment.jpg`);
  const aboutPhoto = d.gallery[0] ?? { url: `${IMG}/band-clinic.jpg`, alt: "Inside the clinic" };
  const faq = faqs(d);
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(d.services.length ? [{ label: "Services", href: "#services" }] : []),
    ...(d.qualifications.length ? [{ label: "Education", href: "#education" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    ...(tips.length ? [{ label: "Health tips", href: "#health-tips" }] : []),
    { label: "Contact", href: "#appointment" },
  ];

  const stats = [
    years && years > 0 ? { value: years, suffix: "+", label: "Years in practice", icon: Stethoscope } : null,
    d.services.length ? { value: d.services.length, suffix: "", label: "Services offered", icon: HeartPulse } : null,
    d.conditionsTreated.length ? { value: d.conditionsTreated.length, suffix: "+", label: "Conditions treated", icon: ShieldCheck } : null,
    d.clinics.length ? { value: d.clinics.length, suffix: "", label: d.clinics.length > 1 ? "Clinic locations" : "Clinic location", icon: Building2 } : null,
    d.languages.length ? { value: d.languages.length, suffix: "", label: "Languages spoken", icon: Languages } : null,
  ]
    .filter(Boolean)
    .slice(0, 4) as { value: number; suffix: string; label: string; icon: typeof Stethoscope }[];

  const formClinics = d.clinics.map((c) => ({ id: c.id, name: c.name, area: c.area.name }));
  const services = d.services.map((s) => ({ name: s.name, ...describeService(s.name, s.description) }));

  return (
    <div id="cm-top" className="overflow-x-clip bg-white font-sans text-cm-text">
      <RevealObserver rootId="cm-top" />
      <Nav
        name={d.fullName}
        tagline={d.primarySpecialty?.name}
        links={nav}
      />

      <main>
        {/* ── Hero ── */}
        <section id="top" aria-label="Introduction" className="relative isolate -mt-[72px] flex min-h-[680px] items-center overflow-hidden bg-cm-navy pb-40 pt-28 sm:pb-44 lg:min-h-[820px] lg:pt-32">
          <HeroCarousel slides={HERO_SLIDES} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-cm-navy via-cm-navy/85 to-cm-navy/35" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cm-navy/70 to-transparent" />
          <svg aria-hidden viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-24 h-24 w-full opacity-25">
            <path
              className="cm-ecg"
              d="M0 60 H380 L410 60 L425 20 L445 100 L465 35 L480 60 H700 L720 60 L735 10 L755 110 L775 40 L790 60 H1200"
              fill="none"
              stroke="#5eead4"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative z-10 mx-auto grid w-full max-w-[1240px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
            <div className="min-w-0">
              <p className="cm-rise inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                <span className="relative flex size-2.5">
                  <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-emerald-400" />
                  <span className="relative size-2.5 rounded-full bg-emerald-400" />
                </span>
                {[d.primarySpecialty?.name, place].filter(Boolean).join(" · ") || "Doctor"}
              </p>
              <div
                className="cm-rise mt-6 [&_h1]:!text-[40px] [&_h1]:!font-sans [&_h1]:!font-extrabold [&_h1]:!leading-[1.05] [&_h1]:!tracking-tight [&_h1]:!text-white sm:[&_h1]:!text-[54px] lg:[&_h1]:!text-[64px] [&_p]:!text-white/80 [&_p:first-of-type]:!text-teal-200 [&_svg]:!text-teal-200"
                style={{ ["--cm-delay" as string]: "120ms" }}
              >
                {seo.heading}
              </div>
              {d.degreesLine && (
                <p className="cm-rise mt-4 text-lg font-semibold text-white/90" style={{ ["--cm-delay" as string]: "220ms" }}>
                  {d.degreesLine}
                  {d.systemLabel && <span className="ml-2 rounded-full bg-white/15 px-3 py-1 text-sm">{d.systemLabel}</span>}
                </p>
              )}
              {d.shortBio && (
                <p className="cm-rise mt-5 max-w-xl text-[17px] leading-relaxed text-white/75" style={{ ["--cm-delay" as string]: "300ms" }}>
                  {d.shortBio}
                </p>
              )}

              <div id="cm-hero-actions" className="cm-rise mt-8 flex flex-wrap gap-3" style={{ ["--cm-delay" as string]: "400ms" }}>
                <a
                  href="#appointment"
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-cm-teal px-6 font-semibold text-white shadow-[0_16px_36px_-12px_rgb(13_148_136/0.9)] transition hover:-translate-y-0.5 hover:bg-cm-teal-2"
                >
                  <CalendarCheck aria-hidden className="size-5" strokeWidth={2} />
                  Book an appointment
                </a>
                {phone && (
                  <a
                    href={`tel:+${phone}`}
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-white/10 px-5 font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20"
                  >
                    <PhoneCall aria-hidden className="size-5" strokeWidth={2} />
                    Call the clinic
                  </a>
                )}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener"
                    aria-label="WhatsApp"
                    className="inline-flex size-[52px] items-center justify-center rounded-xl bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5"
                  >
                    <MessageCircle aria-hidden className="size-6" strokeWidth={2} />
                  </a>
                )}
              </div>

              <ul className="cm-rise mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80" style={{ ["--cm-delay" as string]: "500ms" }}>
                {d.registration.council && (
                  <li className="inline-flex items-center gap-2">
                    <BadgeCheck aria-hidden className="size-5 text-teal-300" strokeWidth={2} />
                    Registered, {d.registration.council}
                  </li>
                )}
                {d.languages.length > 0 && (
                  <li className="inline-flex items-center gap-2">
                    <Languages aria-hidden className="size-5 text-teal-300" strokeWidth={2} />
                    {d.languages.join(" · ")}
                  </li>
                )}
              </ul>
            </div>

            {/* Portrait with floating badges */}
            <div className="cm-rise relative mx-auto w-full max-w-[400px] lg:mr-0" style={{ ["--cm-delay" as string]: "250ms" }}>
              <div aria-hidden className="absolute -inset-4 rounded-[40px] bg-gradient-to-br from-teal-300/40 via-cm-blue/30 to-transparent blur-2xl" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-cm-navy-2 shadow-cm-lg ring-1 ring-white/20">
                {d.photo ? (
                  <Image src={d.photo.url} alt={d.photo.alt} fill priority sizes="(min-width: 1024px) 400px, 90vw" className="object-cover object-top" />
                ) : (
                  <span aria-hidden className="flex h-full items-center justify-center text-[120px] font-extrabold text-white/30">
                    {initials(d.fullName)}
                  </span>
                )}
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-cm-navy/70 to-transparent" />
              </div>
              {years && years > 0 ? (
                <div className="cm-float absolute -right-3 bottom-10 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-cm-lg sm:-right-8">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-cm-mint text-cm-teal">
                    <Stethoscope aria-hidden className="size-6" strokeWidth={2} />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-2xl font-extrabold text-cm-navy">{years}+</span>
                    <span className="block text-xs font-semibold text-cm-muted">years in practice</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Quick info strip, overlapping the hero ── */}
        {clinic && (
          <div className="relative z-20 -mt-28 px-4 sm:px-6">
            <div className="cm-reveal mx-auto grid max-w-[1240px] overflow-hidden rounded-3xl bg-white shadow-cm-lg ring-1 ring-cm-line md:grid-cols-3">
              <div className="flex gap-4 p-6 sm:p-7">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cm-blue-soft text-cm-blue">
                  <Clock aria-hidden className="size-6" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cm-navy">Opening hours</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-cm-muted">
                    {openDaysSummary(clinic.timings)
                      .split(" | ")
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-4 border-t border-cm-line bg-cm-navy p-6 text-white sm:p-7 md:border-t-0">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-teal-300">
                  <PhoneCall aria-hidden className="size-6" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Appointments</p>
                  {phone && (
                    <a href={`tel:+${phone}`} className="mt-1 block text-xl font-extrabold tracking-tight hover:text-teal-200">
                      {formatPhone(phone)}
                    </a>
                  )}
                  <p className="mt-0.5 text-sm text-white/70">{clinic.appointmentNote ?? "Call or send a request online."}</p>
                </div>
              </div>
              <div className="flex gap-4 border-t border-cm-line p-6 sm:p-7 md:border-l md:border-t-0">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cm-mint text-cm-teal">
                  <MapPin aria-hidden className="size-6" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cm-navy">{clinic.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-cm-muted">{[clinic.addressLine1, clinic.area.name, clinic.city.name].join(", ")}</p>
                  <a href={clinic.directionsUrl} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-cm-teal hover:text-cm-teal-2">
                    Get directions <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── About ── */}
        <Section id="about">
          <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="cm-reveal cm-left relative mx-auto w-full max-w-[560px] pb-10 pr-10 lg:sticky lg:top-28 lg:mt-6">
              <div className="relative aspect-[4/3.4] overflow-hidden rounded-[28px] shadow-cm-lg">
                <Image src={aboutPhoto.url} alt={aboutPhoto.alt} fill sizes="(min-width: 1024px) 560px, 92vw" className="object-cover transition duration-700 hover:scale-105" />
              </div>
              {d.photo && (
                <div className="absolute bottom-0 right-0 w-[42%] overflow-hidden rounded-3xl border-[6px] border-white shadow-cm-lg">
                  <div className="relative aspect-square">
                    <Image src={d.photo.url} alt="" fill sizes="240px" className="object-cover object-top" />
                  </div>
                </div>
              )}
              {d.practiceSinceYear && (
                <div className="absolute -left-3 -top-5 flex size-28 flex-col items-center justify-center rounded-full bg-cm-teal text-center text-white shadow-cm-lg ring-8 ring-white sm:-left-6">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Since</span>
                  <span className="text-2xl font-extrabold">{d.practiceSinceYear}</span>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <Heading id="about" eyebrow="About the doctor" title={`Meet ${d.fullName}`} />
              <div className="cm-reveal mt-6 space-y-4 text-[17px] leading-relaxed text-cm-text/85">
                <div className="font-medium text-cm-navy">{seo.intro}</div>
                {d.fullBioHtml ? (
                  <div className="prose-bio [&_li]:relative [&_li]:pl-1 [&_ul]:mt-4 [&_ul]:grid [&_ul]:!list-none [&_ul]:gap-2 [&_ul]:!pl-0 sm:[&_ul]:grid-cols-2 [&_li]:before:mr-2 [&_li]:before:font-bold [&_li]:before:text-cm-teal [&_li]:before:content-['✓']" dangerouslySetInnerHTML={{ __html: d.fullBioHtml }} />
                ) : d.shortBio ? (
                  <p>{d.shortBio}</p>
                ) : null}
              </div>

              <dl className="cm-reveal mt-8 grid gap-3 sm:grid-cols-2">
                {reg && (
                  <div className="flex gap-3 rounded-2xl bg-cm-sky p-4 sm:col-span-2">
                    <BadgeCheck aria-hidden className="size-6 shrink-0 text-cm-teal" strokeWidth={1.9} />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-cm-muted">Registration</dt>
                      <dd className="font-semibold text-cm-navy">{reg}</dd>
                      {regMore && <dd className="text-sm text-cm-muted">{regMore}</dd>}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 rounded-2xl bg-cm-sky p-4">
                  <Stethoscope aria-hidden className="size-6 shrink-0 text-cm-blue" strokeWidth={1.9} />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-cm-muted">Practice</dt>
                    <dd className="font-semibold text-cm-navy">{d.practitionerType === "consultant" ? "Consultant / specialist" : "General practice"}</dd>
                  </div>
                </div>
                {d.languages.length > 0 && (
                  <div className="flex gap-3 rounded-2xl bg-cm-sky p-4">
                    <Languages aria-hidden className="size-6 shrink-0 text-cm-blue" strokeWidth={1.9} />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-cm-muted">Languages</dt>
                      <dd className="font-semibold text-cm-navy">{d.languages.join(", ")}</dd>
                    </div>
                  </div>
                )}
              </dl>

              {d.secondarySpecialties.length > 0 && (
                <ul className="cm-reveal mt-6 flex flex-wrap gap-2">
                  {[d.primarySpecialty, ...d.secondarySpecialties].filter(Boolean).map((s) => (
                    <li key={s!.slug} className="rounded-full bg-cm-blue-soft px-3.5 py-1.5 text-sm font-semibold text-cm-blue">
                      {s!.name}
                    </li>
                  ))}
                </ul>
              )}

              <div className="cm-reveal mt-8 flex flex-wrap gap-3">
                <a href="#appointment" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cm-navy px-5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-cm-navy-2">
                  Book a visit <ArrowRight aria-hidden className="size-4" />
                </a>
                <a href={cardHref} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-semibold text-cm-navy ring-1 ring-cm-line transition hover:bg-cm-sky">
                  <IdCard aria-hidden className="size-5" strokeWidth={1.9} /> Digital visiting card
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Numbers band (photo background) ── */}
        {stats.length > 0 && (
          <section aria-label="At a glance" className="cm-parallax relative isolate px-4 py-20 sm:px-6" style={{ backgroundImage: `url(${IMG}/band-clinic.jpg)` }}>
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-cm-navy/90 via-cm-navy/75 to-cm-teal-2/70" />
            <dl className={cn("mx-auto grid max-w-[1240px] gap-8 text-center text-white sm:grid-cols-2", stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "")}>
              {stats.map((s, i) => (
                <div key={s.label} className="cm-reveal" style={{ ["--cm-delay" as string]: `${i * 110}ms` }}>
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10 text-teal-200 ring-1 ring-white/15">
                    <s.icon aria-hidden className="size-7" strokeWidth={1.75} />
                  </span>
                  <dd className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </dd>
                  <dt className="mt-1 text-sm font-medium text-white/70">{s.label}</dt>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ── Services: one photo beside a calm, numbered list ── */}
        {services.length > 0 && (
          <Section id="services" className="bg-cm-sky">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Heading id="services" eyebrow="Services" title="Care for the whole family" lead={`What ${firstName} looks after in the clinic, from a short illness to long-term conditions.`} />
                <div className="cm-reveal cm-left relative mt-8 hidden aspect-[4/3.2] overflow-hidden rounded-[28px] shadow-cm-lg lg:block">
                  <Image src={`${IMG}/svc-consult.jpg`} alt="A doctor in consultation with a patient" fill sizes="480px" className="object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cm-navy/85 via-cm-navy/10 to-transparent" />
                  <div className="absolute inset-x-6 bottom-6 text-white">
                    <p className="text-lg font-bold">Not sure which service you need?</p>
                    <a href="#appointment" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cm-navy transition hover:-translate-y-0.5">
                      Ask the clinic <ArrowRight aria-hidden className="size-4" />
                    </a>
                  </div>
                </div>
              </div>
              <ol className="grid gap-px overflow-hidden rounded-[28px] bg-cm-line shadow-cm ring-1 ring-cm-line sm:grid-cols-2">
                {services.map((s, i) => {
                  const Icon = SERVICE_ICONS[s.icon];
                  return (
                    <li key={s.name} className="cm-reveal group relative bg-white p-6 transition-colors duration-300 hover:bg-cm-navy sm:p-7" style={{ ["--cm-delay" as string]: `${(i % 2) * 90}ms` }}>
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-cm-mint text-cm-teal transition-colors duration-300 group-hover:bg-white/10 group-hover:text-teal-300">
                          <Icon aria-hidden className="size-6" strokeWidth={1.8} />
                        </span>
                        <span className="text-sm font-bold tabular-nums text-cm-line transition-colors group-hover:text-white/30">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-cm-navy transition-colors group-hover:text-white">{s.name}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-cm-muted transition-colors group-hover:text-white/70">{s.text}</p>
                    </li>
                  );
                })}
                {services.length % 2 === 1 && (
                  <li aria-hidden className="hidden bg-gradient-to-br from-cm-teal to-cm-blue sm:flex sm:items-end sm:p-7">
                    <HeartPulse className="size-16 text-white/25" strokeWidth={1.4} />
                  </li>
                )}
              </ol>
            </div>
          </Section>
        )}

        {/* ── Conditions marquee ── */}
        {d.conditionsTreated.length > 0 && (
          <section aria-labelledby="conditions-title" className="overflow-hidden bg-cm-navy py-14 text-white">
            <div className="mx-auto mb-8 flex max-w-[1240px] flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <h2 id="conditions-title" className="cm-reveal text-2xl font-extrabold sm:text-3xl">
                Conditions treated
              </h2>
              <p className="cm-reveal text-sm text-white/65">Common problems {firstName} sees and manages.</p>
            </div>
            {d.conditionsTreated.length >= 6 ? (
              <div className="cm-marquee-wrap relative [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
                <ul className="cm-marquee flex w-max gap-3">
                  {[...d.conditionsTreated, ...d.conditionsTreated].map((c, i) => (
                    <li
                      key={`${c}-${i}`}
                      aria-hidden={i >= d.conditionsTreated.length || undefined}
                      className="flex items-center gap-2.5 whitespace-nowrap rounded-full bg-white/[0.07] px-5 py-3 text-[15px] font-semibold ring-1 ring-white/15"
                    >
                      <Plus aria-hidden className="size-4 text-teal-300" strokeWidth={3} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="mx-auto flex max-w-[1240px] flex-wrap gap-3 px-4 sm:px-6">
                {d.conditionsTreated.map((c) => (
                  <li key={c} className="flex items-center gap-2.5 rounded-full bg-white/[0.07] px-5 py-3 text-[15px] font-semibold ring-1 ring-white/15">
                    <Plus aria-hidden className="size-4 text-teal-300" strokeWidth={3} />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Education ── */}
        {d.qualifications.length > 0 && (
          <Section id="education">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
              <div className="lg:self-center">
                <Heading
                  id="education"
                  eyebrow="Education"
                  title="Qualifications and training"
                  lead={d.registration.council ? `Registered with the ${d.registration.council}${d.registration.year ? ` since ${d.registration.year}` : ""}.` : undefined}
                />
                <div className="cm-reveal relative mt-8 hidden aspect-[5/3] overflow-hidden rounded-3xl lg:block">
                  <Image src={`${IMG}/hero-4.jpg`} alt="" fill sizes="480px" className="object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-cm-navy/70 to-transparent" />
                  <p className="absolute bottom-5 left-5 right-5 text-lg font-bold leading-snug text-white">{d.degreesLine}</p>
                </div>
              </div>
              <ol
                className={cn(
                  "relative space-y-6 lg:self-center",
                  d.qualifications.length > 1 && "before:absolute before:bottom-8 before:left-[27px] before:top-8 before:w-0.5 before:bg-gradient-to-b before:from-cm-teal before:to-cm-blue/20",
                )}
              >
                {d.qualifications.map((q, i) => (
                  <li key={`${q.degree}-${i}`} className="cm-reveal cm-right relative flex gap-6" style={{ ["--cm-delay" as string]: `${i * 120}ms` }}>
                    <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl bg-cm-navy text-white shadow-cm ring-4 ring-white">
                      <GraduationCap aria-hidden className="size-6" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-3xl bg-white p-6 shadow-cm ring-1 ring-cm-line transition hover:-translate-y-0.5 hover:shadow-cm-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xl font-extrabold text-cm-navy">
                          {q.degree}
                          {q.specialization && !q.degree.includes("(") && <span className="font-semibold text-cm-teal"> · {q.specialization}</span>}
                        </p>
                        {q.year && <span className="rounded-full bg-cm-blue-soft px-3 py-1 text-sm font-bold text-cm-blue">{q.year}</span>}
                      </div>
                      {q.institute && <p className="mt-1.5 text-cm-muted">{q.institute}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        )}

        {/* ── Clinics and timings ── */}
        {d.clinics.length > 0 && (
          <Section id="clinics" className="bg-gradient-to-b from-cm-sky to-white">
            <Heading
              id="clinics"
              eyebrow="Clinic and timings"
              title={d.clinics.length > 1 ? "Where to consult" : "Visit the clinic"}
              lead={d.clinics.length > 1 ? `${firstName} consults at ${d.clinics.length} places. Open one to see its timings and directions.` : "Timings, directions and whether the clinic is open right now."}
              center
            />
            <div className="mt-12">
              <ClinicsSection clinics={d.clinics} photos={clinicPhotos} />
            </div>
          </Section>
        )}

        {/* ── Appointment request (photo band) ── */}
        <section
          id="appointment"
          aria-labelledby="appointment-title"
          className="cm-parallax relative isolate scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28"
          style={{ backgroundImage: `url(${IMG}/band-appointment.jpg)` }}
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-cm-navy/95 via-cm-navy/85 to-cm-navy-2/60" />
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="text-white">
              <Heading id="appointment" eyebrow="Appointments" title="Book a visit" lead="Send a request and the clinic will call you back to confirm a time that suits you." dark />
              <ol className="cm-reveal mt-10 space-y-5">
                {[
                  { t: "Send your request", s: "Name, mobile number and a preferred day." },
                  { t: "The clinic calls you back", s: "To confirm the time and anything to bring." },
                  { t: "Visit the clinic", s: clinic ? `${clinic.name}, ${clinic.area.name}.` : "At the time you agreed." },
                ].map((step, i) => (
                  <li key={step.t} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cm-teal text-sm font-extrabold">{i + 1}</span>
                    <span>
                      <span className="block font-bold">{step.t}</span>
                      <span className="block text-sm text-white/70">{step.s}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <ul className="cm-reveal mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/15 transition hover:bg-white/[0.14]">
                      <Phone aria-hidden className="size-5 text-teal-300" strokeWidth={2} />
                      <span>
                        <span className="block text-xs text-white/60">Call</span>
                        <span className="block font-semibold">{formatPhone(phone)}</span>
                      </span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a href={waHref} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/15 transition hover:bg-white/[0.14]">
                      <MessageCircle aria-hidden className="size-5 text-[#4ade80]" strokeWidth={2} />
                      <span>
                        <span className="block text-xs text-white/60">WhatsApp</span>
                        <span className="block font-semibold">Message the clinic</span>
                      </span>
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <a href={`mailto:${d.email}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/15 transition hover:bg-white/[0.14]">
                      <Mail aria-hidden className="size-5 text-teal-300" strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block text-xs text-white/60">Email</span>
                        <span className="block truncate font-semibold">{d.email}</span>
                      </span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="cm-reveal cm-zoom relative rounded-[28px] bg-white p-6 shadow-cm-lg sm:p-9">
              <h3 className="text-xl font-extrabold text-cm-navy">Request an appointment</h3>
              <p className="mb-6 mt-1 text-sm text-cm-muted">Fields marked * are needed. The clinic replies during clinic hours.</p>
              <AppointmentForm doctorId={d.id} doctorName={d.fullName} clinics={formClinics} />
            </div>
          </div>
        </section>

        {/* ── Recognition ── */}
        {hasRecognition && (
          <Section id="recognition">
            <Heading id="recognition" eyebrow="Recognition" title="Awards and memberships" center />
            <div className={cn("mx-auto mt-12 grid max-w-5xl gap-6", d.awards.length > 0 && d.memberships.length > 0 && "lg:grid-cols-2")}>
              {d.awards.length > 0 && (
                <div className="cm-reveal rounded-3xl bg-gradient-to-br from-cm-navy to-cm-navy-2 p-7 text-white shadow-cm-lg">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-cm-gold/20 text-cm-gold">
                    <Award aria-hidden className="size-6" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold">Awards</h3>
                  <ul className="mt-5 space-y-4">
                    {d.awards.map((a) => (
                      <li key={`${a.title}-${a.year}`} className="border-l-2 border-cm-gold/60 pl-4">
                        <span className="block text-sm font-bold text-cm-gold">{a.year}</span>
                        <span className="block font-semibold">{a.title}</span>
                        <span className="block text-sm text-white/65">{a.awardingBody}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.memberships.length > 0 && (
                <div className="cm-reveal rounded-3xl bg-white p-7 shadow-cm ring-1 ring-cm-line" style={{ ["--cm-delay" as string]: "120ms" }}>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-cm-mint text-cm-teal">
                    <Users aria-hidden className="size-6" strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold text-cm-navy">Memberships</h3>
                  <ul className="mt-5 space-y-4">
                    {d.memberships.map((m) => (
                      <li key={m.name} className="flex gap-3">
                        <Check aria-hidden className="mt-1 size-4 shrink-0 text-cm-teal" strokeWidth={3} />
                        <span>
                          <span className="block font-semibold text-cm-navy">{m.name}</span>
                          {m.since && <span className="block text-sm text-cm-muted">Member since {m.since}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Beyond medicine ── */}
        {(d.interests.length > 0 || d.interestsPhoto || story) && (
          <Section id="beyond" className="bg-cm-mint/60">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="lg:sticky lg:top-28">
                <Heading id="beyond" eyebrow="Beyond medicine" title="Away from the clinic" lead={`What keeps ${firstName} going outside consulting hours.`} />
                {d.interestsPhoto && (
                  <figure className="cm-reveal cm-left relative mt-8 aspect-[4/3] overflow-hidden rounded-[28px] shadow-cm-lg lg:aspect-[5/4]">
                    <Image src={d.interestsPhoto.url} alt={d.interestsPhoto.alt} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover transition duration-[1.5s] hover:scale-105" />
                    {d.interestsPhoto.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cm-navy/85 to-transparent px-6 pb-5 pt-16 text-sm font-semibold text-white">
                        <Mountain aria-hidden className="mr-2 inline size-4 text-teal-300" />
                        {d.interestsPhoto.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </div>
              <div>
                {d.interests.length > 0 && (
                  <ul className="cm-reveal grid gap-3 sm:grid-cols-2">
                    {d.interests.map((it) => (
                      <li key={it} className="flex items-center gap-3 rounded-2xl bg-white p-4 font-semibold text-cm-navy shadow-cm ring-1 ring-cm-line">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cm-mint text-cm-teal">
                          <HeartPulse aria-hidden className="size-5" strokeWidth={1.9} />
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
                {story && (
                  <article aria-labelledby="beyond-story" className="cm-reveal mt-6 rounded-[28px] bg-white p-7 shadow-cm ring-1 ring-cm-line sm:p-10">
                    <h3 id="beyond-story" className="text-2xl font-extrabold leading-tight text-cm-navy sm:text-[30px]">
                      {story.title}
                    </h3>
                    <span aria-hidden className="mt-5 block h-1 w-16 rounded-full bg-gradient-to-r from-cm-teal to-cm-blue" />
                    <div className="mt-6 space-y-5 text-[17px] leading-[1.8] text-cm-text/85">
                      {story.paragraphs.map((p, i) => (
                        <p
                          key={i}
                          className={cn(
                            i === 0 &&
                              "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[60px] first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-cm-teal",
                          )}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </article>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Health tips (general articles, optional) ── */}
        {tips.length > 0 && (
          <Section id="health-tips" className="bg-white">
            <Heading id="health-tips" eyebrow="Health tips" title="Good to know" lead="Short, general health information for patients and families. Not a substitute for a consultation." center />
            <HealthTipsSection tips={tips} />
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery" className="bg-cm-sky">
            <Heading id="gallery" eyebrow="Gallery" title="Inside the clinic" center />
            <div className="cm-reveal mt-12">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <Section id="faq">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div>
                <Heading id="faq" eyebrow="Good to know" title="Questions patients ask" />
                <div className="cm-reveal relative mt-8 overflow-hidden rounded-3xl bg-cm-navy p-7 text-white">
                  <div aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-cm-teal/30 blur-2xl" />
                  <p className="relative text-lg font-bold">Still have a question?</p>
                  <p className="relative mt-1 text-white/70">Call the clinic during clinic hours, or send a request online.</p>
                  <div className="relative mt-5 flex flex-wrap gap-3">
                    {phone && (
                      <a href={`tel:+${phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-cm-navy">
                        <Phone aria-hidden className="size-4" /> Call
                      </a>
                    )}
                    <a href="#appointment" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cm-teal px-4 font-semibold text-white">
                      <CalendarCheck aria-hidden className="size-4" /> Book
                    </a>
                  </div>
                </div>
              </div>
              <div className="cm-reveal divide-y divide-cm-line rounded-3xl bg-white shadow-cm ring-1 ring-cm-line">
                {faq.map((f, i) => (
                  <details key={f.q} className="group px-6 py-1 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold text-cm-navy">
                      {f.q}
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cm-sky text-cm-teal transition group-open:rotate-45 group-open:bg-cm-teal group-open:text-white">
                        <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                      </span>
                    </summary>
                    <p className="pb-5 pr-10 text-cm-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Section>
        )}

        {seo.nearby && (
          <section className="bg-cm-sky px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-[1240px]">{seo.nearby}</div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-[#071a33] px-4 text-white sm:px-6">
        <div aria-hidden className="absolute -left-32 top-0 size-96 rounded-full bg-cm-teal/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1240px] pt-16">
          <div className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-cm-teal-2 to-cm-blue p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-2xl font-extrabold sm:text-3xl">Planning a visit?</p>
              <p className="mt-2 text-white/85">Call {clinic ? clinic.name : "the clinic"} or send a request and the clinic will call you back.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {phone && (
                <a href={`tel:+${phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-cm-navy transition hover:-translate-y-0.5">
                  <Phone aria-hidden className="size-[18px]" /> {formatPhone(phone)}
                </a>
              )}
              <a href="#appointment" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cm-navy px-5 font-semibold text-white ring-1 ring-white/25 transition hover:-translate-y-0.5">
                <CalendarCheck aria-hidden className="size-[18px]" /> Book appointment
              </a>
            </div>
          </div>

          <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.1fr_1.1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-cm-teal text-sm font-bold">
                  {initials(d.fullName)}
                </span>
                <span>
                  <span className="block text-lg font-bold">{d.fullName}</span>
                  {d.primarySpecialty && <span className="block text-sm text-teal-300">{d.primarySpecialty.name}</span>}
                </span>
              </div>
              {d.degreesLine && <p className="mt-4 text-sm text-white/65">{d.degreesLine}</p>}
              {Object.keys(d.links).length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {Object.entries(d.links).map(([k, href]) => (
                    <li key={k}>
                      <a href={href} target="_blank" rel="noopener me" className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/15">
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
                    <a href={l.href} className="text-white/75 hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={cardHref} className="text-white/75 hover:text-white">
                    Visiting card
                  </a>
                </li>
                <li>
                  <a href={d.vcfUrl} download="" className="inline-flex items-center gap-1.5 text-white/75 hover:text-white">
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
                        <span className={slots.length ? "text-right text-white/85" : "text-white/40"}>{slots.length ? formatSlots(slots) : "Closed"}</span>
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
                    <Phone aria-hidden className="size-4 text-teal-300" />
                    <a href={`tel:+${phone}`} className="hover:text-white">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 shrink-0 text-teal-300" />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-white">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-300" />
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

      {/* Floating WhatsApp (larger screens) */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={`WhatsApp ${d.fullName}'s clinic`}
          className="fixed bottom-6 left-6 z-30 hidden size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-cm-lg transition hover:scale-105 sm:flex"
        >
          <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-[#25D366]/50" />
          <MessageCircle aria-hidden className="relative size-7" strokeWidth={2} />
        </a>
      )}

      {/* Mobile contact bar, once the hero buttons scroll away */}
      <ShowAfter targetId="cm-hero-actions">
        <nav
          aria-label="Contact"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-cm-line bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 backdrop-blur transition-transform duration-300 group-data-[hidden]/show:translate-y-full sm:hidden"
        >
          {phone ? (
            <a href={`tel:+${phone}`} className="flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl bg-cm-sky text-xs font-bold text-cm-navy">
              <Phone aria-hidden className="size-5" /> Call
            </a>
          ) : (
            <span />
          )}
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener" className="flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl bg-[#25D366] text-xs font-bold text-white">
              <MessageCircle aria-hidden className="size-5" /> WhatsApp
            </a>
          ) : (
            <span />
          )}
          <a href="#appointment" className="flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl bg-cm-teal text-xs font-bold text-white">
            <CalendarCheck aria-hidden className="size-5" /> Book
          </a>
        </nav>
      </ShowAfter>
    </div>
  );
}
