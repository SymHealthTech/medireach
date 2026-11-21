import { absUrl, paths, SITE_NAME } from "@/lib/site";
import { DEFAULT_HOSPITAL_CATEGORY } from "@/lib/constants";
import { breadcrumbJsonLd, compact, listJoin, siteNodeId, truncate, type Crumb, type QuickFact } from "@/lib/seo/profile";

export { siteNodeId };
import { DAY_NAMES, formatSlots, hasAnyTimings, openingHoursSpecification, slotsForDay, WEEK_ORDER } from "@/lib/timings";
import type { PublicEstablishment, PublicSiteDoctor } from "@/templates/types";

/**
 * Titles and descriptions for clinic and hospital sites
 * (MEDIREACH_BUILD_PROMPT.md, "Clinic and hospital pages"). Pure, so the admin
 * snippet preview and the public page always agree.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

export interface EstablishmentSeoInput {
  kind: "clinic" | "hospital";
  name: string;
  /** Category singular, e.g. "Skin Clinic" or "Maternity Hospital". */
  categoryName?: string;
  area?: string;
  city?: string;
  shortDescription?: string;
  doctorCount?: number;
  seo?: { titleOverride?: string; descriptionOverride?: string };
}

/**
 * The site's type as shown publicly: its category ("Skin Clinic",
 * "Maternity Hospital"), else "Clinic" / "Hospital".
 */
export function siteTypeName(kind: "clinic" | "hospital", categoryName?: string): string {
  return categoryName?.trim() || (kind === "hospital" ? "Hospital" : "Clinic");
}

const what = (e: EstablishmentSeoInput): string => siteTypeName(e.kind, e.categoryName);

/**
 * `{Name} – {Category} in {Area}, {City} | MediReach`, e.g. "Shree Skin Clinic –
 * Skin Clinic in Baner, Pune". Trimmed to ~60 chars by dropping, in order:
 * "| MediReach", the city, the area, the category.
 */
export function establishmentTitle(e: EstablishmentSeoInput): string {
  if (e.seo?.titleOverride) return e.seo.titleOverride;
  const place = (area?: string, city?: string) => (area && city ? ` in ${area}, ${city}` : area || city ? ` in ${area ?? city}` : "");
  const candidates = [
    `${e.name} – ${what(e)}${place(e.area, e.city)} | ${SITE_NAME}`,
    `${e.name} – ${what(e)}${place(e.area, e.city)}`,
    `${e.name} – ${what(e)}${place(e.area)}`,
    `${e.name} – ${what(e)}`,
    e.name,
  ];
  return candidates.find((c) => c.length <= TITLE_MAX) ?? truncate(e.name, TITLE_MAX);
}

/** Factual: from the short description, else "{Name}, {category} in {Area}, {City}. Doctors, services, timings, address and contact." */
export function establishmentDescription(e: EstablishmentSeoInput): string {
  if (e.seo?.descriptionOverride) return truncate(e.seo.descriptionOverride, DESCRIPTION_MAX);
  if (e.shortDescription) return truncate(e.shortDescription, DESCRIPTION_MAX);
  const place = [e.area, e.city].filter(Boolean).join(", ");
  const category = what(e).toLowerCase().replace(/\bent\b/, "ENT");
  return truncate(`${e.name}, ${category}${place ? ` in ${place}` : ""}. Doctors, services, timings, address and contact.`, DESCRIPTION_MAX);
}

/** "{Name} is a {category} in {Area}, {City}, with {n} doctors." */
export function establishmentIntro(e: EstablishmentSeoInput): string {
  const category = what(e).toLowerCase().replace(/\bent\b/, "ENT");
  const article = /^[aeiou]/i.test(category) || category.startsWith("ENT") ? "an" : "a";
  const place = [e.area, e.city].filter(Boolean).join(", ");
  const doctors = e.doctorCount ? `, with ${e.doctorCount} doctor${e.doctorCount === 1 ? "" : "s"}` : "";
  return `${e.name} is ${article} ${category}${place ? ` in ${place}` : ""}${doctors}.`;
}

// ---------------------------------------------------------------------------
// Public page SEO: breadcrumbs, quick facts, JSON-LD
// ---------------------------------------------------------------------------

/** SEO input from a public site. */
export function seoInputOf(s: PublicEstablishment): EstablishmentSeoInput {
  return {
    kind: s.kind,
    name: s.name,
    ...(s.category ? { categoryName: s.category.name } : {}),
    area: s.address.area.name,
    city: s.address.city.name,
    ...(s.shortDescription ? { shortDescription: s.shortDescription } : {}),
    doctorCount: s.doctors.length,
    seo: s.seo,
  };
}

/** "Skin Clinic · Baner, Pune", "Maternity Hospital · Wakad, Pune". */
export function establishmentSubheading(s: PublicEstablishment): string {
  return `${siteTypeName(s.kind, s.category?.name)} · ${s.address.area.name}, ${s.address.city.name}`;
}

/**
 * Home › Pune › Skin Clinics › Baner › Shree Skin Clinic (clinics)
 * Home › Pune › Hospitals › Wakad › Sai Hospital (hospitals)
 * Home › Pune › Hospitals › Maternity Hospitals › Wakad › Sai Care (hospitals with a type)
 */
export function establishmentBreadcrumbs(s: PublicEstablishment): Crumb[] {
  const { city, area } = s.address;
  const crumbs: Crumb[] = [
    { name: "Home", url: absUrl("/") },
    { name: city.name, url: absUrl(paths.city(city.slug)) },
  ];
  if (s.kind === "hospital") {
    crumbs.push({ name: "Hospitals", url: absUrl(paths.hospitals(city.slug)) });
    if (s.category && s.category.slug !== DEFAULT_HOSPITAL_CATEGORY) {
      crumbs.push({ name: s.category.plural, url: absUrl(paths.hospitalType(city.slug, s.category.slug)) });
      crumbs.push({ name: area.name, url: absUrl(paths.hospitalTypeArea(city.slug, s.category.slug, area.slug)) });
    } else {
      crumbs.push({ name: area.name, url: absUrl(paths.hospitalsArea(city.slug, area.slug)) });
    }
  } else if (s.category) {
    crumbs.push({ name: s.category.plural, url: absUrl(paths.clinicCategory(city.slug, s.category.slug)) });
    crumbs.push({ name: area.name, url: absUrl(paths.clinicCategoryArea(city.slug, s.category.slug, area.slug)) });
  }
  crumbs.push({ name: s.name, url: s.url });
  return crumbs;
}

function timingsText(s: PublicEstablishment): string {
  if (s.is24x7) return `${s.name} is open 24 hours, all 7 days.`;
  if (!hasAnyTimings(s.timings)) return `Please call ${s.name} for timings.`;
  const days = WEEK_ORDER.map((day) => `${DAY_NAMES[day]} ${formatSlots(slotsForDay(s.timings, day))}`);
  return `${days.join("; ")}.`;
}

/** Factual Q&A answered from the data (rendered visibly; no FAQ markup needed). */
export function establishmentQuickFacts(s: PublicEstablishment): QuickFact[] {
  const facts: QuickFact[] = [
    { question: `Where is ${s.name}?`, answer: `${s.name} is at ${s.address.fullAddress}.${s.address.landmark ? ` Landmark: ${s.address.landmark}.` : ""}` },
    { question: `What are the timings of ${s.name}?`, answer: timingsText(s) },
  ];
  if (s.doctors.length > 0) {
    facts.push({ question: `Which doctors practise at ${s.name}?`, answer: `${listJoin(s.doctors.map((d) => d.name))}.` });
  }
  if (s.beds) {
    // "General" → "general", but acronyms stay (ICU, NICU).
    const lower = (t: string) => t.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
    const types = s.beds.types.map((b) => `${b.count} ${lower(b.type)}`);
    facts.push({ question: `How many beds does ${s.name} have?`, answer: `${s.beds.total} beds${types.length ? `: ${listJoin(types)}` : ""}.` });
  }
  if (s.insurance?.cashless) {
    facts.push({
      question: `Is cashless treatment available at ${s.name}?`,
      answer: s.insurance.providers.length ? `Yes, with ${listJoin(s.insurance.providers)}.` : "Yes. Please call to check your insurer.",
    });
  }
  if (s.languages.length > 0) facts.push({ question: `Which languages are spoken at ${s.name}?`, answer: `${listJoin(s.languages)}.` });
  return facts;
}

/** Category slug → schema.org MedicalSpecialty (where one exists). */
const CATEGORY_SPECIALTY: Record<string, string> = {
  "general-opd": "PrimaryCare",
  skin: "Dermatology",
  dental: "Dentistry",
  eye: "Optometric",
  ent: "Otolaryngologic",
  cardiology: "Cardiovascular",
  physiotherapy: "PhysicalTherapy",
  paediatrics: "Pediatric",
  gynaecology: "Gynecologic",
  orthopaedics: "Musculoskeletal",
};


const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => `https://schema.org/${d}`);

/** MedicalClinic / Hospital + BreadcrumbList. No aggregateRating or review, ever. */
export function establishmentJsonLd(s: PublicEstablishment) {
  const physician = (d: PublicSiteDoctor) =>
    d.url ? { "@type": "Physician", "@id": `${d.url}#physician`, name: d.name, url: d.url } : compact({ "@type": "Physician", name: d.name, description: d.specialty });
  const image = s.coverPhoto?.url ?? s.gallery[0]?.url ?? s.logo?.url;
  const node = compact({
    "@type": s.kind === "hospital" ? "Hospital" : "MedicalClinic",
    "@id": siteNodeId(s.url),
    name: s.name,
    url: s.url,
    logo: s.logo?.url,
    image,
    description: s.shortDescription,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: [s.address.line1, s.address.line2].filter(Boolean).join(", "),
      addressLocality: s.address.area.name,
      addressRegion: s.address.state,
      postalCode: s.address.pincode || undefined,
      addressCountry: "IN",
    }),
    geo: s.geo ? { "@type": "GeoCoordinates", latitude: s.geo.lat, longitude: s.geo.lng } : undefined,
    hasMap: s.directionsUrl,
    telephone: s.phones[0] ? `+${s.phones[0]}` : undefined,
    email: s.email,
    openingHoursSpecification: s.is24x7
      ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: ALL_DAYS, opens: "00:00", closes: "23:59" }]
      : openingHoursSpecification(s.timings),
    medicalSpecialty: s.category && CATEGORY_SPECIALTY[s.category.slug] ? `https://schema.org/${CATEGORY_SPECIALTY[s.category.slug]}` : undefined,
    availableService: s.services.map((x) => compact({ "@type": "MedicalProcedure", name: x.name, description: x.description })),
    department: s.departments.map((d) => compact({ "@type": "MedicalClinic", name: `${d.name}, ${s.name}`, member: d.doctors.map(physician) })),
    member: s.doctors.map(physician),
    knowsLanguage: s.languages,
    sameAs: Object.values(s.links),
    identifier: s.registration?.number
      ? compact({ "@type": "PropertyValue", propertyID: s.registration.authority ?? "Registration", value: s.registration.number })
      : undefined,
  });
  return { "@context": "https://schema.org", "@graph": [node, breadcrumbJsonLd(establishmentBreadcrumbs(s))] };
}
