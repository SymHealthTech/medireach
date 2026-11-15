import { absUrl, paths, SITE_NAME, SITE_URL } from "@/lib/site";
import { formatSlots, openingHoursSpecification, slotsForDay, WEEK_ORDER, DAY_NAMES, hasAnyTimings } from "@/lib/timings";
import type { DoctorCardData, PublicClinic, PublicDoctor } from "@/templates/types";

/**
 * SEO text and structured data for doctor profiles. Pure functions, so every
 * template renders identical SEO output and it can be unit-tested.
 *
 * NMC: no aggregateRating / review is ever emitted.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

/** Trim to `max` chars at a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:–-]+$/, "").trim();
  return `${atWord || cut}…`;
}

export function primaryClinic(d: PublicDoctor): PublicClinic | undefined {
  return d.clinics[0];
}

/**
 * `Dr. {First} {Last} – {Specialty} in {Area}, {City} | MediReach`, trimmed to
 * ~60 chars by dropping, in order: "| MediReach", the city, the area, the
 * specialty.
 */
export function profileTitle(d: PublicDoctor): string {
  if (d.seo.titleOverride) return d.seo.titleOverride;
  const clinic = primaryClinic(d);
  const specialty = d.primarySpecialty?.name;
  const area = clinic?.area.name;
  const city = clinic?.city.name;

  const candidates: string[] = [];
  const build = (parts: { area?: string; city?: string; brand: boolean; specialty?: string }) => {
    let place = "";
    if (parts.area && parts.city) place = ` in ${parts.area}, ${parts.city}`;
    else if (parts.area || parts.city) place = ` in ${parts.area ?? parts.city}`;
    const core = parts.specialty ? `${d.fullName} – ${parts.specialty}${place}` : d.fullName;
    return parts.brand ? `${core} | ${SITE_NAME}` : core;
  };
  candidates.push(build({ specialty, area, city, brand: true }));
  candidates.push(build({ specialty, area, city, brand: false }));
  candidates.push(build({ specialty, area, brand: false }));
  candidates.push(build({ specialty, brand: false }));
  candidates.push(d.fullName);
  return candidates.find((c) => c.length <= TITLE_MAX) ?? truncate(d.fullName, TITLE_MAX);
}

export function profileDescription(d: PublicDoctor): string {
  if (d.seo.descriptionOverride) return truncate(d.seo.descriptionOverride, DESCRIPTION_MAX);
  if (d.shortBio) return truncate(d.shortBio, DESCRIPTION_MAX);
  const clinic = primaryClinic(d);
  const degrees = degreesAside(d.degreesLine, false);
  const specialty = d.primarySpecialty ? `, ${d.primarySpecialty.name}` : "";
  const at = clinic ? ` at ${clinic.name}, ${clinic.area.name}, ${clinic.city.name}` : "";
  return truncate(`${d.fullName}${degrees}${specialty}${at}. Timings, address, contact and services.`, DESCRIPTION_MAX);
}

/** "General Physician" → "general physician", keeping acronyms ("ENT specialist"). */
function lowerSpecialty(name: string): string {
  return name
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
}

function article(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word) || /^(ENT|MD|MS)\b/.test(word) ? "an" : "a";
}

/** "Dr. Amit Shah (MBBS, MD) is a general physician practising at Shah Clinic, Kothrud, Pune." */
/**
 * " (MBBS, MD)" normally; ", MBBS, MD (Medicine)," when the degrees already
 * contain brackets, to avoid "(MBBS, MD (Medicine))".
 */
function degreesAside(degreesLine: string, trailingComma: boolean): string {
  if (!degreesLine) return "";
  if (!degreesLine.includes("(")) return ` (${degreesLine})`;
  return `, ${degreesLine}${trailingComma ? "," : ""}`;
}

export function introSentence(d: PublicDoctor): string {
  const degrees = degreesAside(d.degreesLine, true);
  const clinic = primaryClinic(d);
  const what = d.primarySpecialty ? lowerSpecialty(d.primarySpecialty.name) : "doctor";
  const where = clinic ? ` practising at ${clinic.name}, ${clinic.area.name}, ${clinic.city.name}` : "";
  return `${d.fullName}${degrees} is ${article(what)} ${what}${where}.`;
}

/** "General Physician · Kothrud, Pune". */
export function profileSubheading(d: PublicDoctor): string {
  const clinic = primaryClinic(d);
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";
  return [d.primarySpecialty?.name, place].filter(Boolean).join(" · ");
}

export interface QuickFact {
  question: string;
  answer: string;
}

function clinicTimingsText(c: PublicClinic): string {
  if (!hasAnyTimings(c.timings)) return `${c.name}: please call for timings.`;
  const days = WEEK_ORDER.map((day) => `${DAY_NAMES[day]} ${formatSlots(slotsForDay(c.timings, day))}`);
  return `${c.name}: ${days.join("; ")}.`;
}

export function quickFacts(d: PublicDoctor): QuickFact[] {
  const facts: QuickFact[] = [];
  if (d.clinics.length > 0) {
    facts.push({
      question: `Where does ${d.fullName} practise?`,
      answer: d.clinics.map((c) => `${c.name}, ${c.fullAddress}`).join(". ") + ".",
    });
    facts.push({
      question: `What are ${d.fullName}'s timings?`,
      answer: d.clinics.map(clinicTimingsText).join(" "),
    });
  }
  if (d.languages.length > 0) {
    facts.push({
      question: `Which languages does ${d.fullName} speak?`,
      answer: `${d.fullName} speaks ${listJoin(d.languages)}.`,
    });
  }
  if (d.registration.number) {
    facts.push({
      question: `What is ${d.fullName}'s registration number?`,
      answer: `${d.registration.council ? `${d.registration.council}, ` : ""}registration number ${d.registration.number}.`,
    });
  }
  return facts;
}

export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface Crumb {
  name: string;
  url: string;
}

export function profileBreadcrumbs(d: PublicDoctor): Crumb[] {
  const clinic = primaryClinic(d);
  const crumbs: Crumb[] = [{ name: "Home", url: absUrl("/") }];
  if (clinic) crumbs.push({ name: clinic.city.name, url: absUrl(paths.city(clinic.city.slug)) });
  if (clinic && d.primarySpecialty) {
    crumbs.push({
      name: d.primarySpecialty.plural,
      url: absUrl(paths.specialty(clinic.city.slug, d.primarySpecialty.slug)),
    });
    crumbs.push({
      name: clinic.area.name,
      url: absUrl(paths.specialtyArea(clinic.city.slug, d.primarySpecialty.slug, clinic.area.slug)),
    });
  }
  crumbs.push({ name: d.fullName, url: d.url });
  return crumbs;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

/** Our specialty slugs → schema.org MedicalSpecialty members (where one exists). */
const SCHEMA_SPECIALTY: Record<string, string> = {
  "general-physician": "PrimaryCare",
  "family-physician": "PrimaryCare",
  "consultant-physician": "PrimaryCare",
  paediatrician: "Pediatric",
  neonatologist: "Pediatric",
  gynaecologist: "Gynecologic",
  obstetrician: "Obstetric",
  dermatologist: "Dermatology",
  cardiologist: "Cardiovascular",
  "interventional-cardiologist": "Cardiovascular",
  "ent-specialist": "Otolaryngologic",
  "orthopaedic-surgeon": "Musculoskeletal",
  "spine-surgeon": "Musculoskeletal",
  psychiatrist: "Psychiatric",
  neurologist: "Neurologic",
  gastroenterologist: "Gastroenterologic",
  nephrologist: "Renal",
  urologist: "Urologic",
  pulmonologist: "Pulmonary",
  endocrinologist: "Endocrine",
  diabetologist: "Endocrine",
  rheumatologist: "Rheumatologic",
  haematologist: "Hematologic",
  "medical-oncologist": "Oncologic",
  "surgical-oncologist": "Oncologic",
  "radiation-oncologist": "Oncologic",
  "general-surgeon": "Surgical",
  "laparoscopic-surgeon": "Surgical",
  "plastic-surgeon": "PlasticSurgery",
  anaesthesiologist: "Anesthesia",
  radiologist: "Radiography",
  pathologist: "Pathology",
  geriatrician: "Geriatric",
  dentist: "Dentistry",
  orthodontist: "Dentistry",
  endodontist: "Dentistry",
  periodontist: "Dentistry",
  prosthodontist: "Dentistry",
  "paediatric-dentist": "Dentistry",
  "critical-care-specialist": "Emergency",
};

function medicalSpecialties(d: PublicDoctor): string[] {
  const all = [d.primarySpecialty, ...d.secondarySpecialties].filter(Boolean) as { slug: string; name: string }[];
  return [...new Set(all.map((s) => (SCHEMA_SPECIALTY[s.slug] ? `https://schema.org/${SCHEMA_SPECIALTY[s.slug]}` : s.name)))];
}

function postalAddress(c: PublicClinic) {
  return {
    "@type": "PostalAddress",
    streetAddress: [c.addressLine1, c.addressLine2].filter(Boolean).join(", "),
    addressLocality: c.area.name,
    addressRegion: c.state,
    postalCode: c.pincode,
    addressCountry: "IN",
  };
}

function geoCoordinates(c: PublicClinic) {
  return c.geo ? { "@type": "GeoCoordinates", latitude: c.geo.lat, longitude: c.geo.lng } : undefined;
}

const tel = (digits?: string) => (digits ? `+${digits}` : undefined);

/** Drop undefined / empty-array values so the JSON-LD stays clean. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}

export function profileJsonLd(d: PublicDoctor) {
  const clinic = primaryClinic(d);
  const physicianId = `${d.url}#physician`;
  const clinicNodes = d.clinics.map((c) =>
    compact({
      "@type": "MedicalClinic",
      "@id": `${d.url}#clinic-${c.id}`,
      name: c.name,
      url: d.url,
      address: postalAddress(c),
      geo: geoCoordinates(c),
      telephone: tel(c.phone ?? d.phone),
      openingHoursSpecification: openingHoursSpecification(c.timings),
      hasMap: c.directionsUrl,
    }),
  );

  const physician = compact({
    "@type": "Physician",
    "@id": physicianId,
    name: d.fullName,
    url: d.url,
    image: d.photo?.url,
    description: d.shortBio,
    medicalSpecialty: medicalSpecialties(d),
    telephone: tel(d.phone ?? clinic?.phone),
    email: d.email,
    address: clinic ? postalAddress(clinic) : undefined,
    geo: clinic ? geoCoordinates(clinic) : undefined,
    openingHoursSpecification: clinic ? openingHoursSpecification(clinic.timings) : undefined,
    location: clinicNodes.map((c) => ({ "@id": c["@id"] })),
    availableService: d.services.map((s) => compact({ "@type": "MedicalProcedure", name: s.name, description: s.description })),
    knowsLanguage: d.languages,
    memberOf: d.memberships.map((m) => ({ "@type": "Organization", name: m.name })),
    alumniOf: [...new Set(d.qualifications.map((q) => q.institute))].map((name) => ({
      "@type": "EducationalOrganization",
      name,
    })),
    award: d.awards.map((a) => `${a.title}, ${a.awardingBody} (${a.year})`),
    sameAs: Object.values(d.links),
    identifier: d.registration.number
      ? compact({
          "@type": "PropertyValue",
          propertyID: d.registration.council ?? "Medical registration",
          value: d.registration.number,
        })
      : undefined,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [physician, ...clinicNodes, breadcrumbJsonLd(profileBreadcrumbs(d))],
  };
}

/** Root-layout structured data: makes Google show "MediReach" as the site name. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: new URL(SITE_URL).hostname,
        url: `${SITE_URL}/`,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      compact({
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: absUrl("/icon"),
        parentOrganization: { "@type": "Organization", name: "Sym HealthTech" },
        contactPoint: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
          ? {
              "@type": "ContactPoint",
              telephone: `+${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`,
              contactType: "customer support",
              areaServed: "IN",
              availableLanguage: ["en", "hi", "mr"],
            }
          : undefined,
      }),
    ],
  };
}

/** ItemList for hub pages (neutral alphabetical order, as rendered). */
export function itemListJsonLd(name: string, doctors: DoctorCardData[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: doctors.length,
    itemListElement: doctors.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: d.url,
      name: d.fullName,
    })),
  };
}

/** Serialise JSON-LD safely for a <script> tag (no "</script>" breakouts). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
