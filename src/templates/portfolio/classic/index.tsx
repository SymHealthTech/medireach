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
  Check,
  ClipboardCheck,
  Clock,
  Droplet,
  Eye,
  Flower2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  House,
  IdCard,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Quote,
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
import { specialtyPhotos, type SpecialtyPhotos } from "@/templates/shared/specialty-photos";
import { splitClinics } from "@/templates/shared/clinic-split";
import { VisitingHospitals } from "@/templates/shared/VisitingHospitals";
import type { PortfolioTemplateProps, PublicDoctor } from "@/templates/types";
import { ClinicTabs } from "./serene/ClinicTabs";
import { HeroSlides } from "./serene/HeroSlides";
import { Nav, type NavLink } from "./serene/Nav";

/**
 * Portfolio design 1 — "Serene Care". A soft, elegant one-page website in
 * deep plum, rose, blush and cream with a thin gold line and Fraunces
 * headings. Light and airy where Clinic Modern (design 2) is dark and bold:
 *
 * frosted nav → light hero over a cross-fading photo carousel (photos chosen
 * by specialty), arched portrait with a rotating name ring and
 * drifting petals → welcome cards → about (pull quote, photo collage,
 * credentials) → services (feature photo + cards) → numbers → conditions
 * (arched photo + chips) → education (horizontal timeline) → clinics (tabs,
 * timings, map) → appointment (plum panel + form) → recognition → beyond
 * medicine → health tips → gallery → FAQ → footer, plus a mobile bar.
 *
 * Every section hides itself when its data is empty, so it works for any
 * doctor. Presentation only: the H1, intro sentence, and
 * JSON-LD come from the shared wrapper. Shared widgets from design 2 (form,
 * timings, health tips) are re-coloured by `.sc-theme` (globals.css).
 *
 * NMC: no ratings, reviews, testimonials, patient counts or superlatives.
 */

/**
 * Serene Care's own general photos (women doctors in everyday consultations),
 * used when the doctor's specialty has no photo set of its own
 * (templates/shared/specialty-photos.ts). Pexels, see
 * public/templates/serene-care/CREDITS.md.
 */
const IMG = "/templates/serene-care";
const PHOTOS: SpecialtyPhotos = {
  key: "general",
  hero: [
    { src: `${IMG}/hero-1.jpg`, alt: "A doctor checking a patient in a bright clinic" },
    { src: `${IMG}/hero-2.jpg`, alt: "A doctor talking with a patient" },
    { src: `${IMG}/hero-3.jpg`, alt: "A doctor writing a prescription at her desk" },
    { src: `${IMG}/hero-4.jpg`, alt: "A blood pressure check in the clinic" },
  ],
  band: { src: `${IMG}/band.jpg`, alt: "A doctor listening to a patient's chest" },
  side: { src: `${IMG}/side.jpg`, alt: "A doctor listening to a patient and taking notes" },
  feature: { src: `${IMG}/feature.jpg`, alt: "A doctor in consultation with patients" },
};

const SERVICE_ICONS: Record<ServiceIcon, typeof Stethoscope> = {
  stethoscope: Stethoscope,
  droplet: Droplet,
  heart: HeartPulse,
  syringe: Syringe,
  clipboard: ClipboardCheck,
  thermometer: Thermometer,
  apple: Apple,
  users: HeartHandshake,
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

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({ id, className, children, labelled = true }: { id: string; className?: string; children: React.ReactNode; labelled?: boolean }) {
  return (
    <section id={id} {...(labelled ? { "aria-labelledby": `${id}-title` } : {})} className={cn("relative scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28", className)}>
      <div className="relative mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

function Heading({
  id,
  eyebrow,
  title,
  lead,
  center,
  light,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("cm-reveal max-w-2xl", center && "mx-auto text-center", className)}>
      <p className={cn("flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em]", center && "justify-center", light ? "text-sc-pink" : "text-sc-rose")}>
        <Flower2 aria-hidden className="size-4" strokeWidth={1.75} />
        {eyebrow}
      </p>
      <h2 id={`${id}-title`} className={cn("mt-4 font-display text-[34px] font-medium leading-[1.12] sm:text-[44px] lg:text-[50px]", light ? "text-white" : "text-sc-plum")}>
        {title}
      </h2>
      <span
        aria-hidden
        className={cn(
          "sc-line mt-5 block h-px w-24 bg-gradient-to-r from-sc-gold to-transparent",
          center && "mx-auto bg-gradient-to-r from-transparent via-sc-gold to-transparent",
        )}
      />
      {lead && <p className={cn("mt-5 text-[17px] leading-relaxed", light ? "text-white/75" : "text-sc-muted")}>{lead}</p>}
    </div>
  );
}

/** Ring of text that slowly turns around the portrait. */
function NameRing({ text }: { text: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className="sc-spin size-full">
      <defs>
        <path id="sc-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
      </defs>
      <text className="fill-sc-plum text-[11px] font-semibold uppercase">
        <textPath href="#sc-ring" textLength={486} lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

function Petal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("sc-petal absolute size-5 text-sc-pink", className)} style={style}>
      <path d="M12 2C8 6 6 10 12 22 18 10 16 6 12 2Z" fill="currentColor" opacity=".85" />
    </svg>
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
    if (hours)
      out.push({
        q: "What are the consultation timings?",
        a: `${c.name}: ${hours}.${c.appointmentNote ? ` ${c.appointmentNote}` : ""}`,
      });
  }
  out.push({
    q: "How do I book an appointment?",
    a: `Send a request with the form on this page and the clinic will call you back to fix a time.${d.phone ? ` You can also call ${formatPhone(d.phone)}${d.whatsapp ? " or send a WhatsApp message" : ""}.` : ""}`,
  });
  if (c && typeof c.fee === "number")
    out.push({
      q: "What is the consultation fee?",
      a: `The consultation fee at ${c.name} is ₹${c.fee.toLocaleString("en-IN")}. Scans, tests and medicines are charged separately.`,
    });
  if (d.languages.length)
    out.push({
      q: `Which languages does ${d.fullName} speak?`,
      a: `${d.languages.join(", ")}.`,
    });
  return out;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SereneCarePortfolio({ doctor: d, seo }: PortfolioTemplateProps) {
  const photos = specialtyPhotos(d, PHOTOS);
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
  const collage = d.gallery[0] ?? {
    url: photos.band.src,
    alt: photos.band.alt,
  };
  const faq = faqs(d);
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";
  const ringText =
    [`${d.primarySpecialty?.name ?? "Doctor"} · ${clinic ? `${clinic.area.name} · ` : ""}${d.fullName} · `, `${d.fullName} · `].find((t) => t.length <= 48) ??
    `${d.fullName.slice(0, 44)} · `;
  const hasRecognition = d.awards.length > 0 || d.memberships.length > 0 || d.publications.length > 0;

  const nav: NavLink[] = [
    { label: "About", href: "#about" },
    ...(d.services.length ? [{ label: "Services", href: "#services" }] : []),
    ...(d.qualifications.length ? [{ label: "Journey", href: "#education" }] : []),
    ...(d.clinics.length ? [{ label: "Clinics", href: "#clinics" }] : []),
    ...(tips.length ? [{ label: "Health tips", href: "#health-tips" }] : []),
    { label: "Contact", href: "#appointment" },
  ];

  const stats = [
    years && years > 0 ? { value: years, suffix: "+", label: "Years in practice" } : null,
    d.services.length ? { value: d.services.length, suffix: "", label: "Services offered" } : null,
    d.conditionsTreated.length
      ? {
          value: d.conditionsTreated.length,
          suffix: "+",
          label: "Conditions treated",
        }
      : null,
    d.clinics.length
      ? {
          value: d.clinics.length,
          suffix: "",
          label: d.clinics.length > 1 ? "Places to consult" : "Clinic",
        }
      : null,
    d.languages.length ? { value: d.languages.length, suffix: "", label: "Languages spoken" } : null,
  ]
    .filter(Boolean)
    .slice(0, 4) as { value: number; suffix: string; label: string }[];

  const formClinics = d.clinics.map((c) => ({
    id: c.id,
    name: c.name,
    area: c.area.name,
  }));
  const services = d.services.map((s) => ({
    name: s.name,
    ...describeService(s.name, s.description),
  }));

  return (
    <div id="sc-top" className="sc-theme overflow-x-clip bg-sc-cream font-sans text-sc-text">
      <RevealObserver rootId="sc-top" />
      <Nav name={d.fullName} monogram={initials(d.fullName)} tagline={d.primarySpecialty?.name} links={nav} phone={phone} phoneLabel={phone ? formatPhone(phone) : undefined} />

      <main>
        {/* ── Hero: light overlay on a cross-fading photo carousel ── */}
        <section id="top" aria-label="Introduction" className="relative isolate -mt-[78px] flex min-h-[720px] items-center overflow-hidden pb-24 pt-32 md:pt-36 lg:min-h-[860px]">
          <HeroSlides slides={photos.hero} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-sc-cream/95 via-sc-cream/80 to-sc-cream/20 lg:from-sc-cream/90 lg:via-sc-cream/55 lg:to-sc-cream/0" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sc-cream to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <Petal className="bottom-10 left-[8%]" style={{ ["--sc-dur" as string]: "15s" }} />
            <Petal
              className="bottom-0 left-[30%] size-4"
              style={{
                ["--sc-dur" as string]: "19s",
                ["--sc-delay" as string]: "-6s",
              }}
            />
            <Petal
              className="bottom-20 left-[52%] size-3 text-sc-gold/70"
              style={{
                ["--sc-dur" as string]: "17s",
                ["--sc-delay" as string]: "-11s",
              }}
            />
            <Petal
              className="bottom-6 right-[14%]"
              style={{
                ["--sc-dur" as string]: "21s",
                ["--sc-delay" as string]: "-3s",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="min-w-0">
              <p className="cm-rise inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-sc-plum shadow-sc ring-1 ring-sc-line backdrop-blur">
                <span className="flex size-7 items-center justify-center rounded-full bg-sc-blush text-sc-rose">
                  <Flower2 aria-hidden className="size-4" strokeWidth={2} />
                </span>
                {[d.primarySpecialty?.name, place].filter(Boolean).join(" · ") || "Doctor"}
              </p>
              <div
                className="cm-rise mt-7 [&_h1]:!font-display [&_h1]:!text-[44px] [&_h1]:!font-medium [&_h1]:!leading-[1.04] [&_h1]:!tracking-tight [&_h1]:!text-sc-plum sm:[&_h1]:!text-[60px] lg:[&_h1]:!text-[72px] [&_p]:!text-sc-muted [&_p:first-of-type]:!font-semibold [&_p:first-of-type]:!text-sc-rose [&_svg]:!text-sc-rose"
                style={delay(120)}
              >
                {seo.heading}
              </div>
              {d.degreesLine && (
                <p className="cm-rise mt-5 text-lg font-semibold text-sc-plum/90" style={delay(220)}>
                  <GraduationCap aria-hidden className="mr-2 inline size-5 align-[-3px] text-sc-gold" strokeWidth={1.8} />
                  {d.degreesLine}
                  {d.systemLabel && <span className="ml-2 rounded-full bg-sc-blush px-3 py-0.5 text-sm text-sc-rose">{d.systemLabel}</span>}
                </p>
              )}
              {d.shortBio && (
                <p className="cm-rise mt-5 max-w-xl text-[17px] leading-relaxed text-sc-text/75" style={delay(300)}>
                  {d.shortBio}
                </p>
              )}

              <div id="sc-hero-actions" className="cm-rise mt-9 flex flex-wrap items-center gap-3" style={delay(400)}>
                <a
                  href="#appointment"
                  className="group inline-flex min-h-[54px] items-center gap-2.5 rounded-full bg-sc-rose pl-6 pr-2 font-semibold text-white shadow-[0_18px_38px_-14px_rgb(185_68_111/0.95)] transition hover:-translate-y-0.5 hover:bg-sc-rose-2"
                >
                  Book an appointment
                  <span className="flex size-10 items-center justify-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">
                    <ArrowRight aria-hidden className="size-5" strokeWidth={2} />
                  </span>
                </a>
                {phone && (
                  <a
                    href={`tel:+${phone}`}
                    className="inline-flex min-h-[54px] items-center gap-3 rounded-full bg-white/85 pl-2 pr-5 font-semibold text-sc-plum shadow-sc ring-1 ring-sc-line backdrop-blur transition hover:bg-white"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-sc-blush text-sc-rose">
                      <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
                    </span>
                    Call the clinic
                  </a>
                )}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener"
                    aria-label="WhatsApp"
                    className="inline-flex size-[54px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5"
                  >
                    <MessageCircle aria-hidden className="size-6" strokeWidth={2} />
                  </a>
                )}
              </div>

              <ul className="cm-rise mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-sc-plum/80" style={delay(500)}>
                {d.registration.council && (
                  <li className="inline-flex items-center gap-2">
                    <BadgeCheck aria-hidden className="size-5 text-sc-sage" strokeWidth={1.9} />
                    Registered, {d.registration.council}
                  </li>
                )}
                {d.languages.length > 0 && (
                  <li className="inline-flex items-center gap-2">
                    <Languages aria-hidden className="size-5 text-sc-sage" strokeWidth={1.9} />
                    {d.languages.join(" · ")}
                  </li>
                )}
              </ul>
            </div>

            {/* Arched portrait, gold outline, rotating name ring */}
            <div className="cm-rise relative mx-auto w-full max-w-[380px] lg:mr-4" style={delay(250)}>
              <div aria-hidden className="sc-blob absolute -inset-6 bg-gradient-to-br from-sc-pink/70 via-sc-blush to-transparent" />
              <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rounded-t-full rounded-b-[36px] border border-sc-gold/70" />
              <div className="relative aspect-[4/5.2] overflow-hidden rounded-t-full rounded-b-[36px] bg-sc-blush shadow-sc-lg ring-[6px] ring-white">
                {d.photo ? (
                  <Image src={d.photo.url} alt={d.photo.alt} fill priority sizes="(min-width: 1024px) 380px, 90vw" className="object-cover object-top" />
                ) : (
                  <span aria-hidden className="flex h-full items-center justify-center font-display text-[110px] text-sc-plum/25">
                    {initials(d.fullName)}
                  </span>
                )}
              </div>
              <div className="absolute -left-10 top-6 hidden size-36 rounded-full bg-white/90 p-1 shadow-sc backdrop-blur sm:block">
                <NameRing text={ringText} />
                <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-sc-rose text-white">
                  <HeartPulse aria-hidden className="size-6" strokeWidth={1.9} />
                </span>
              </div>
              {d.practiceSinceYear && (
                <div className="cm-float absolute -right-3 bottom-12 rounded-2xl bg-white/95 px-5 py-3.5 shadow-sc-lg ring-1 ring-sc-line backdrop-blur sm:-right-10">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-sc-rose">Practising since</span>
                  <span className="block font-display text-3xl font-semibold text-sc-plum">{d.practiceSinceYear}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Welcome cards ── */}
        {clinic && (
          <div className="relative z-10 -mt-10 px-4 sm:px-6">
            <div className="mx-auto grid max-w-[1200px] gap-4 md:grid-cols-3">
              {[
                {
                  icon: Clock,
                  title: "Consultation hours",
                  body: (
                    <ul className="space-y-0.5">
                      {openDaysSummary(clinic.timings)
                        .split(" | ")
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                    </ul>
                  ),
                },
                {
                  icon: CalendarHeart,
                  title: "Appointments",
                  body: (
                    <>
                      {phone && (
                        <a href={`tel:+${phone}`} className="block font-display text-xl font-semibold text-sc-plum hover:text-sc-rose">
                          {formatPhone(phone)}
                        </a>
                      )}
                      <span className="block">{clinic.appointmentNote ?? "Call, or send a request online."}</span>
                    </>
                  ),
                  dark: true,
                },
                {
                  icon: MapPin,
                  title: clinic.name,
                  body: (
                    <>
                      <span className="line-clamp-2 block">{[clinic.addressLine1, clinic.area.name, clinic.city.name].join(", ")}</span>
                      <a href={clinic.directionsUrl} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 font-semibold text-sc-rose hover:text-sc-rose-2">
                        Get directions <ArrowUpRight aria-hidden className="size-4" />
                      </a>
                    </>
                  ),
                },
              ].map((card, i) => (
                <div
                  key={card.title}
                  className={cn(
                    "cm-reveal group flex gap-4 rounded-[28px] p-6 shadow-sc-lg ring-1 transition duration-500 hover:-translate-y-1 sm:p-7",
                    card.dark ? "bg-sc-plum text-white ring-sc-plum [&_a]:text-white" : "bg-white ring-sc-line",
                  )}
                  style={delay(i * 110)}
                >
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-full transition duration-500 group-hover:rotate-[360deg]",
                      card.dark ? "bg-white/10 text-sc-pink" : "bg-sc-blush text-sc-rose",
                    )}
                  >
                    <card.icon aria-hidden className="size-[22px]" strokeWidth={1.8} />
                  </span>
                  <div className={cn("min-w-0 text-sm", card.dark ? "text-white/75" : "text-sc-muted")}>
                    <p className={cn("mb-1 font-semibold", card.dark ? "text-white" : "text-sc-plum")}>{card.title}</p>
                    {card.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── About ── */}
        <Section id="about">
          <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
            <div className="mx-auto w-full max-w-[520px] min-w-0">
              {/* Collage */}
              <div className="cm-reveal cm-left relative pb-16 pl-8 sm:pl-12">
                <div aria-hidden className="sc-blob absolute left-0 top-10 size-[85%] bg-sc-blush" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-sc-lg">
                  <Image src={collage.url} alt={collage.alt} fill sizes="(min-width: 1024px) 460px, 86vw" className="object-cover transition duration-[1.4s] hover:scale-105" />
                </div>
                {d.photo && (
                  <div className="absolute bottom-0 left-0 w-[44%] overflow-hidden rounded-[28px] border-[6px] border-sc-cream shadow-sc-lg">
                    <div className="relative aspect-square bg-sc-blush">
                      <Image src={d.photo.url} alt={d.photo.alt} fill sizes="240px" className="object-cover object-top" />
                    </div>
                  </div>
                )}
                {years && years > 0 ? (
                  <div className="cm-float absolute right-4 top-4 rounded-2xl bg-white/95 px-5 py-3 text-center shadow-sc-lg ring-1 ring-sc-line backdrop-blur">
                    <span className="block font-display text-3xl font-semibold leading-none text-sc-rose">{years}+</span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-sc-plum">years of care</span>
                  </div>
                ) : null}
              </div>
              <dl className="cm-reveal relative mt-8 divide-y divide-sc-line overflow-hidden rounded-[28px] bg-white shadow-sc ring-1 ring-sc-line">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sc-gold via-sc-pink to-sc-rose" />
                {reg && (
                  <div className="px-6 py-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sc-muted">
                      <BadgeCheck aria-hidden className="size-4 text-sc-gold" /> Registration
                    </dt>
                    <dd className="mt-1 font-semibold text-sc-plum">
                      {reg}
                      {regMore && <span className="block text-sm font-normal text-sc-muted">{regMore}</span>}
                    </dd>
                  </div>
                )}
                <div className="px-6 py-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sc-muted">
                    <HeartHandshake aria-hidden className="size-4 text-sc-gold" /> Practice
                  </dt>
                  <dd className="mt-1 font-semibold text-sc-plum">{d.practitionerType === "consultant" ? "Consultant" : "General practitioner"}</dd>
                </div>
                {d.systemLabel && (
                  <div className="px-6 py-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sc-muted">
                      <Sparkles aria-hidden className="size-4 text-sc-gold" /> System of medicine
                    </dt>
                    <dd className="mt-1 font-semibold text-sc-plum">{d.systemLabel}</dd>
                  </div>
                )}
                {(d.primarySpecialty || d.secondarySpecialties.length > 0) && (
                  <div className="px-6 py-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sc-muted">
                      <Stethoscope aria-hidden className="size-4 text-sc-gold" /> Specialties
                    </dt>
                    <dd className="mt-1 font-semibold text-sc-plum">
                      {[d.primarySpecialty, ...d.secondarySpecialties]
                        .filter(Boolean)
                        .map((s) => s!.name)
                        .join(", ")}
                    </dd>
                  </div>
                )}
                {d.languages.length > 0 && (
                  <div className="px-6 py-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sc-muted">
                      <Languages aria-hidden className="size-4 text-sc-gold" /> Languages
                    </dt>
                    <dd className="mt-1 font-semibold text-sc-plum">{d.languages.join(", ")}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="min-w-0">
              <Heading id="about" eyebrow="About" title={`Hello, I'm ${d.fullName}`} />
              <div className="cm-reveal relative mt-8 rounded-[28px] bg-white p-7 pl-16 shadow-sc ring-1 ring-sc-line">
                <Quote aria-hidden className="absolute left-6 top-6 size-7 text-sc-pink" fill="currentColor" strokeWidth={0} />
                <div className="font-display text-xl leading-relaxed text-sc-plum">{seo.intro}</div>
              </div>
              <div className="cm-reveal mt-7 space-y-4 text-[17px] leading-[1.8] text-sc-text/85">
                {d.fullBioHtml && (
                  <div
                    className="prose-bio [&_li]:relative [&_li]:pl-7 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.55em] [&_li]:before:size-3 [&_li]:before:rounded-full [&_li]:before:border-2 [&_li]:before:border-sc-rose [&_li]:before:content-[''] [&_ul]:mt-5 [&_ul]:grid [&_ul]:!list-none [&_ul]:gap-2.5 [&_ul]:!pl-0 sm:[&_ul]:grid-cols-2"
                    dangerouslySetInnerHTML={{ __html: d.fullBioHtml }}
                  />
                )}
              </div>

              <div className="cm-reveal mt-8 flex flex-wrap gap-3">
                <a
                  href="#appointment"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sc-plum px-6 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sc-plum-2"
                >
                  Book a visit <ArrowRight aria-hidden className="size-4" />
                </a>
                <a href={cardHref} className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold text-sc-plum ring-1 ring-sc-line transition hover:bg-white">
                  <IdCard aria-hidden className="size-5" strokeWidth={1.8} /> Digital visiting card
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Services ── */}
        {services.length > 0 && (
          <Section id="services" className="bg-white">
            <div aria-hidden className="absolute -right-40 top-20 size-[420px] rounded-full bg-sc-blush blur-3xl" />
            <Heading id="services" eyebrow="Services" title="How I can help" lead={`The care ${firstName} offers in the clinic, explained simply.`} />
            <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <li className="cm-reveal cm-zoom relative min-h-[320px] overflow-hidden rounded-[32px] shadow-sc-lg sm:row-span-2 lg:min-h-0">
                <Image
                  src={photos.feature.src}
                  alt={photos.feature.alt}
                  fill
                  sizes="(min-width: 1024px) 400px, 100vw"
                  className="object-cover transition duration-[1.4s] hover:scale-105"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-sc-plum via-sc-plum/30 to-transparent" />
                <div className="absolute inset-x-7 bottom-7 text-white">
                  <p className="font-display text-2xl leading-snug">Unhurried consultations, explained in your language.</p>
                  {d.languages.length > 0 && <p className="mt-2 text-sm text-white/75">{d.languages.join(" · ")}</p>}
                </div>
              </li>
              {services.map((s, i) => {
                const Icon = SERVICE_ICONS[s.icon];
                return (
                  <li
                    key={s.name}
                    className="cm-reveal group relative overflow-hidden rounded-[28px] bg-sc-cream p-7 ring-1 ring-sc-line transition duration-500 hover:-translate-y-1.5 hover:bg-white hover:shadow-sc-lg"
                    style={delay((i % 3) * 90)}
                  >
                    <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-sc-blush transition-transform duration-700 group-hover:scale-[2.2]" />
                    <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-sc-rose shadow-sc ring-1 ring-sc-line transition duration-500 group-hover:bg-sc-rose group-hover:text-white">
                      <Icon aria-hidden className="size-6" strokeWidth={1.7} />
                    </span>
                    <h3 className="relative mt-6 font-display text-xl font-semibold text-sc-plum">{s.name}</h3>
                    <p className="relative mt-2 text-[15px] leading-relaxed text-sc-muted">{s.text}</p>
                    <span aria-hidden className="relative mt-5 block h-[2px] w-10 rounded-full bg-sc-gold transition-all duration-500 group-hover:w-20 group-hover:bg-sc-rose" />
                  </li>
                );
              })}
              <li className="cm-reveal">
                <a
                  href="#appointment"
                  className="group flex h-full min-h-[220px] flex-col justify-between rounded-[28px] bg-gradient-to-br from-sc-rose to-sc-plum p-7 text-white shadow-sc-lg transition duration-500 hover:-translate-y-1.5"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-white/15">
                    <CalendarHeart aria-hidden className="size-6" strokeWidth={1.7} />
                  </span>
                  <span>
                    <span className="block font-display text-2xl leading-snug">Not sure what you need?</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/85">
                      Ask the clinic <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </Section>
        )}

        {/* ── Numbers ── */}
        {stats.length > 0 && (
          <section aria-label="At a glance" className="px-4 sm:px-6">
            <div
              className="cm-parallax relative isolate mx-auto max-w-[1200px] overflow-hidden rounded-[40px] px-6 py-16 shadow-sc-lg sm:px-12"
              style={{ backgroundImage: `url(${photos.band.src})` }}
            >
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-sc-plum/95 via-sc-plum/85 to-sc-rose-2/75" />
              <dl className={cn("grid gap-10 text-center text-white sm:grid-cols-2", stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "")}>
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className={cn(
                      "cm-reveal relative",
                      i > 0 && "lg:before:absolute lg:before:-left-5 lg:before:top-1/2 lg:before:h-16 lg:before:w-px lg:before:-translate-y-1/2 lg:before:bg-sc-gold/50",
                    )}
                    style={delay(i * 110)}
                  >
                    <dd className="font-display text-5xl font-medium sm:text-6xl">
                      <CountUp value={s.value} suffix={s.suffix} />
                    </dd>
                    <dt className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-sc-pink">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* ── Conditions ── */}
        {d.conditionsTreated.length > 0 && (
          <Section id="conditions">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <div className="cm-reveal cm-left relative mx-auto hidden w-full max-w-[420px] lg:block">
                <div aria-hidden className="absolute -inset-4 rounded-t-full rounded-b-[40px] border border-sc-gold/50" />
                <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[32px] shadow-sc-lg">
                  <Image src={photos.side.src} alt={photos.side.alt} fill sizes="420px" className="object-cover object-bottom" />
                </div>
              </div>
              <div>
                <Heading
                  id="conditions"
                  eyebrow="Conditions"
                  title="Concerns I see and treat"
                  lead={`Common reasons patients come to see ${firstName}. If yours is not listed, please ask.`}
                />
                <ul className="mt-10 flex flex-wrap gap-3">
                  {d.conditionsTreated.map((c, i) => (
                    <li
                      key={c}
                      className="cm-reveal inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[15px] font-medium text-sc-plum shadow-sc ring-1 ring-sc-line transition hover:-translate-y-0.5 hover:bg-sc-blush hover:ring-sc-pink"
                      style={delay(Math.min(i, 14) * 45)}
                    >
                      <Check aria-hidden className="size-4 text-sc-rose" strokeWidth={2.5} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        )}

        {/* ── Education: horizontal timeline ── */}
        {d.qualifications.length > 0 && (
          <Section id="education" className="bg-sc-sand/60">
            <Heading
              id="education"
              eyebrow="Journey"
              title="Education and training"
              lead={d.registration.council ? `Registered with the ${d.registration.council}${d.registration.year ? ` since ${d.registration.year}` : ""}.` : undefined}
              center
            />
            <ol
              className={cn("relative mt-16 grid gap-6", d.qualifications.length >= 3 ? "lg:grid-cols-3" : d.qualifications.length === 2 ? "md:grid-cols-2" : "mx-auto max-w-md")}
            >
              <span aria-hidden className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-sc-gold to-transparent lg:block" />
              {d.qualifications.map((q, i) => (
                <li key={`${q.degree}-${i}`} className="cm-reveal relative flex flex-col items-center text-center" style={delay(i * 140)}>
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-full bg-sc-plum text-white shadow-sc-lg ring-8 ring-sc-sand">
                    <GraduationCap aria-hidden className="size-6" strokeWidth={1.7} />
                  </span>
                  <div className="mt-6 w-full rounded-[28px] bg-white p-7 shadow-sc ring-1 ring-sc-line transition duration-500 hover:-translate-y-1 hover:shadow-sc-lg">
                    {q.year && <p className="font-display text-3xl font-medium text-sc-rose">{q.year}</p>}
                    <p className="mt-2 text-xl font-bold text-sc-plum">
                      {q.degree}
                      {q.specialization && !q.degree.includes(q.specialization) && <span className="block text-base font-semibold text-sc-sage">{q.specialization}</span>}
                    </p>
                    {q.institute && <p className="mt-2 text-sm leading-relaxed text-sc-muted">{q.institute}</p>}
                  </div>
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
              lead={
                mainClinics.length > 1
                  ? `${firstName} consults at ${mainClinics.length} clinics. Pick one to see its timings and directions.`
                  : "Timings, directions and whether the clinic is open right now."
              }
              center
            />
            <div className="mt-12">
              <ClinicTabs clinics={mainClinics} />
            </div>
            <VisitingHospitals hospitals={visiting} />
          </Section>
        )}

        {/* ── Appointment ── */}
        <section id="appointment" aria-labelledby="appointment-title" className="relative scroll-mt-20 overflow-hidden bg-sc-blush px-4 py-20 sm:px-6 lg:py-28">
          <div aria-hidden className="sc-blob absolute -left-32 -top-32 size-[460px] bg-sc-pink/40" />
          <div aria-hidden className="sc-blob absolute -bottom-40 -right-24 size-[520px] bg-white/60" style={{ animationDelay: "-7s" }} />
          <div className="relative mx-auto grid max-w-[1200px] overflow-hidden rounded-[40px] bg-white shadow-sc-lg lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="relative isolate overflow-hidden bg-sc-plum p-8 text-white sm:p-10">
              <Image src={photos.hero[2]!.src} alt="" fill sizes="(min-width: 1024px) 500px, 100vw" className="-z-10 object-cover opacity-20" />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-sc-plum/60 to-sc-plum" />
              <Heading
                id="appointment"
                eyebrow="Appointments"
                title="Book a visit"
                lead="Send a request and the clinic will call you back to confirm a time that suits you."
                light
              />
              <ol className="cm-reveal mt-10 space-y-6">
                {[
                  {
                    t: "Send your request",
                    s: "Name, mobile number and a preferred day.",
                  },
                  {
                    t: "The clinic calls you back",
                    s: "To confirm the time and anything to bring.",
                  },
                  {
                    t: "Visit the clinic",
                    s: clinic ? `${clinic.name}, ${clinic.area.name}.` : "At the time you agreed.",
                  },
                ].map((step, i) => (
                  <li key={step.t} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sc-gold/70 font-display text-lg text-sc-pink">{i + 1}</span>
                    <span>
                      <span className="block font-semibold">{step.t}</span>
                      <span className="block text-sm text-white/70">{step.s}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <ul className="cm-reveal mt-10 space-y-2.5 text-sm">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15">
                      <Phone aria-hidden className="size-4 text-sc-pink" /> <span className="font-semibold">{formatPhone(phone)}</span>
                    </a>
                  </li>
                )}
                {waHref && (
                  <li>
                    <a href={waHref} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15">
                      <MessageCircle aria-hidden className="size-4 text-[#4ade80]" /> <span className="font-semibold">WhatsApp the clinic</span>
                    </a>
                  </li>
                )}
                {d.email && (
                  <li>
                    <a href={`mailto:${d.email}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15">
                      <Mail aria-hidden className="size-4 shrink-0 text-sc-pink" /> <span className="truncate font-semibold">{d.email}</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="p-6 sm:p-10">
              <h3 className="font-display text-2xl font-semibold text-sc-plum">Request an appointment</h3>
              <p className="mb-7 mt-1 text-sm text-sc-muted">Fields marked * are needed. The clinic replies during clinic hours.</p>
              <AppointmentForm doctorId={d.id} doctorName={d.fullName} clinics={formClinics} />
            </div>
          </div>
        </section>

        {/* ── Recognition ── */}
        {hasRecognition && (
          <Section id="recognition">
            <Heading id="recognition" eyebrow="Recognition" title="Awards and memberships" center />
            {d.awards.length > 0 && (
              <ul className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
                {d.awards.map((a, i) => (
                  <li
                    key={`${a.title}-${a.year}`}
                    className="cm-reveal group relative overflow-hidden rounded-[28px] bg-white p-7 text-center shadow-sc ring-1 ring-sc-line transition duration-500 hover:-translate-y-1 hover:shadow-sc-lg"
                    style={delay(i * 110)}
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sc-gold via-sc-pink to-sc-gold" />
                    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-sc-sand text-sc-gold transition duration-500 group-hover:scale-110">
                      <Award aria-hidden className="size-7" strokeWidth={1.6} />
                    </span>
                    <p className="mt-4 font-display text-2xl text-sc-rose">{a.year}</p>
                    <p className="mt-1 font-semibold text-sc-plum">{a.title}</p>
                    <p className="mt-1 text-sm text-sc-muted">{a.awardingBody}</p>
                  </li>
                ))}
              </ul>
            )}
            {(d.memberships.length > 0 || d.publications.length > 0) && (
              <div className="cm-reveal mx-auto mt-8 max-w-5xl rounded-[28px] bg-sc-plum p-7 text-white sm:p-9">
                <div className={cn("grid gap-8", d.memberships.length > 0 && d.publications.length > 0 && "md:grid-cols-2")}>
                  {d.memberships.length > 0 && (
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sc-pink">
                        <Users aria-hidden className="size-4" /> Memberships
                      </p>
                      <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                        {d.memberships.map((m) => (
                          <li key={m.name} className="flex gap-3">
                            <Check aria-hidden className="mt-1 size-4 shrink-0 text-sc-gold" strokeWidth={3} />
                            <span>
                              <span className="block font-semibold">{m.name}</span>
                              {m.since && <span className="block text-sm text-white/60">Member since {m.since}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.publications.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sc-pink">Publications</p>
                      <ul className="mt-4 space-y-3">
                        {d.publications.map((p) => (
                          <li key={p.title} className="text-sm">
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener" className="font-semibold underline-offset-4 hover:underline">
                                {p.title}
                              </a>
                            ) : (
                              <span className="font-semibold">{p.title}</span>
                            )}
                            <span className="block text-white/60">{[p.journal, p.year].filter(Boolean).join(", ")}</span>
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
          <Section id="beyond" className="bg-white">
            <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
              <div className="lg:sticky lg:top-28">
                <Heading id="beyond" eyebrow="Beyond medicine" title="A little about me" lead={`What keeps ${firstName} going outside consulting hours.`} />
                {d.interestsPhoto && (
                  <figure className="cm-reveal cm-left relative mt-10">
                    <div aria-hidden className="absolute -inset-3 translate-x-3 translate-y-3 rounded-t-[220px] rounded-b-[32px] border border-sc-gold/60" />
                    <div className="relative aspect-[4/4.4] overflow-hidden rounded-t-[220px] rounded-b-[32px] shadow-sc-lg">
                      <Image
                        src={d.interestsPhoto.url}
                        alt={d.interestsPhoto.alt}
                        fill
                        sizes="(min-width: 1024px) 520px, 100vw"
                        className="object-cover transition duration-[1.5s] hover:scale-105"
                      />
                    </div>
                    {d.interestsPhoto.caption && <figcaption className="mt-5 text-center font-display text-lg text-sc-plum/80">{d.interestsPhoto.caption}</figcaption>}
                  </figure>
                )}
              </div>
              <div>
                {d.interests.length > 0 && (
                  <ul className="cm-reveal flex flex-wrap gap-3">
                    {d.interests.map((it) => (
                      <li key={it} className="inline-flex items-center gap-2 rounded-full bg-sc-blush px-4 py-2.5 font-semibold text-sc-plum">
                        <Sparkles aria-hidden className="size-4 text-sc-rose" strokeWidth={1.9} />
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
                {story && (
                  <article aria-labelledby="beyond-story" className="cm-reveal mt-8 rounded-[32px] bg-sc-cream p-7 ring-1 ring-sc-line sm:p-10">
                    <h3 id="beyond-story" className="font-display text-3xl font-medium leading-tight text-sc-plum sm:text-[34px]">
                      {story.title}
                    </h3>
                    <span aria-hidden className="mt-5 block h-px w-20 bg-sc-gold" />
                    <div className="mt-6 space-y-5 text-[17px] leading-[1.85] text-sc-text/85">
                      {story.paragraphs.map((p, i) => (
                        <p
                          key={i}
                          className={cn(
                            i === 0 &&
                              "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[64px] first-letter:leading-[0.8] first-letter:text-sc-rose",
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

        {/* ── Health tips ── */}
        {tips.length > 0 && (
          <Section id="health-tips" className="bg-sc-cream">
            <Heading
              id="health-tips"
              eyebrow="Health tips"
              title="Good to know"
              lead="Short, general health information for patients and families. Not a substitute for a consultation."
              center
            />
            <HealthTipsSection tips={tips} />
          </Section>
        )}

        {/* ── Gallery ── */}
        {d.gallery.length > 0 && (
          <Section id="gallery" className="bg-white">
            <Heading id="gallery" eyebrow="Gallery" title="Inside the clinic" center />
            <div className="cm-reveal mt-12 [&_img]:rounded-[24px]">
              <Gallery images={d.gallery} layout="mosaic" />
            </div>
          </Section>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <Section id="faq">
            <Heading id="faq" eyebrow="Questions" title="Before your visit" center />
            <div className="mx-auto mt-12 max-w-3xl space-y-3">
              {faq.map((f, i) => (
                <details
                  key={f.q}
                  className="cm-reveal group rounded-[24px] bg-white px-6 shadow-sc ring-1 ring-sc-line transition open:ring-sc-pink [&_summary::-webkit-details-marker]:hidden"
                  open={i === 0}
                  style={delay(i * 60)}
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg text-sc-plum">
                    {f.q}
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sc-blush text-sc-rose transition duration-300 group-open:rotate-45 group-open:bg-sc-rose group-open:text-white">
                      <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                    </span>
                  </summary>
                  <p className="pb-6 pr-10 leading-relaxed text-sc-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-[#2f1033] px-4 text-white sm:px-6">
        <div aria-hidden className="sc-blob absolute -right-40 -top-40 size-[520px] bg-sc-plum-2/40" />
        <div className="relative mx-auto max-w-[1200px] pt-20">
          <div className="flex flex-col items-center text-center">
            <Flower2 aria-hidden className="size-8 text-sc-pink" strokeWidth={1.4} />
            <p className="mt-5 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Planning a visit?</p>
            <p className="mt-3 max-w-xl text-white/70">Call {clinic ? clinic.name : "the clinic"} or send a request, and the clinic will call you back.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#appointment"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sc-rose px-6 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sc-rose-2"
              >
                <CalendarHeart aria-hidden className="size-[18px]" /> Book appointment
              </a>
              {phone && (
                <a
                  href={`tel:+${phone}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10"
                >
                  <Phone aria-hidden className="size-[18px]" /> Call now
                </a>
              )}
            </div>
          </div>

          <div className="mt-16 grid gap-10 border-t border-white/10 py-14 md:grid-cols-2 lg:grid-cols-[1.15fr_0.65fr_1.45fr_1.05fr]">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-full font-display text-lg ring-1 ring-sc-gold/70">
                  {initials(d.fullName)}
                </span>
                <span>
                  <span className="block font-display text-xl">{d.fullName}</span>
                  {d.primarySpecialty && <span className="block text-sm text-sc-pink">{d.primarySpecialty.name}</span>}
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
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"
                      >
                        {LINK_LABELS[k] ?? k} <ArrowUpRight aria-hidden className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <nav aria-label="Footer">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sc-gold">Explore</p>
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sc-gold">Clinic hours</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sc-gold">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                {phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone aria-hidden className="size-4 text-sc-pink" />
                    <a href={`tel:+${phone}`} className="hover:text-white">
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {d.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail aria-hidden className="size-4 shrink-0 text-sc-pink" />
                    <a href={`mailto:${d.email}`} className="break-all hover:text-white">
                      {d.email}
                    </a>
                  </li>
                )}
                {clinic && (
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-sc-pink" />
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
      </footer>

      {/* Floating WhatsApp (larger screens) */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          aria-label={`WhatsApp ${d.fullName}'s clinic`}
          className="fixed bottom-6 left-6 z-30 hidden size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sc-lg transition hover:scale-105 sm:flex"
        >
          <span aria-hidden className="cm-ping absolute inset-0 rounded-full bg-[#25D366]/50" />
          <MessageCircle aria-hidden className="relative size-7" strokeWidth={2} />
        </a>
      )}

    </div>
  );
}
