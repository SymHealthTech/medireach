import { pickHealthTips } from "@/lib/health-tips";
import { storyParagraphs } from "@/lib/format";
import { mapEmbedUrl } from "@/lib/maps";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { doctorShortSlugBase, doctorSlug } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";
import { ARNAV_DESHPANDE } from "./arnav-deshpande";
import { RHEA_SARDESAI } from "./rhea-sardesai";
import { SIDDHARTH_RANE } from "./siddharth-rane";
import type { DemoDoctor } from "./types";

export type { DemoDoctor } from "./types";

/**
 * FICTIONAL demo doctors (the "dummy" folder). To add one: copy
 * arnav-deshpande.ts, change every detail, add its photos under
 * public/demo/{key}/, list it below, and reserve its subdomain in
 * config/reserved.ts (RESERVED_SUBDOMAINS + SAMPLE_SUBDOMAINS). It then shows
 * at /sample/{key} (no database needed), and `npm run seed:demo` copies it
 * into a database for the doctor login demo.
 */
export const DEMO_DOCTORS: readonly DemoDoctor[] = [ARNAV_DESHPANDE, RHEA_SARDESAI, SIDDHARTH_RANE];

export const demoFullName = (d: DemoDoctor) => ["Dr.", d.firstName, d.middleName, d.lastName].filter(Boolean).join(" ");

function toPublic(d: DemoDoctor): PublicDoctor {
  const fullName = demoFullName(d);
  const slug = doctorSlug(d.firstName, d.lastName, d.primarySpecialty.slug);
  const qualifications = d.qualifications.map((q) => ({
    degree: q.degree.name,
    ...(q.specialization ? { specialization: q.specialization } : {}),
    institute: q.institute,
    year: q.year,
  }));
  return {
    id: `demo-${d.key}`,
    citySlug: d.city.slug,
    slug,
    shortSlug: doctorShortSlugBase(d.firstName, d.lastName),
    subdomain: d.subdomain,
    url: absUrl(paths.doctor(d.city.slug, slug)),
    // The subdomain is a reserved sample address that the middleware serves from /sample/{key}.
    shareUrl: subdomainUrl(d.subdomain),
    vcfUrl: `/sample/${d.key}/contact.vcf`,
    cardUrl: `/sample/${d.key}/card`,
    title: "Dr.",
    firstName: d.firstName,
    lastName: d.lastName,
    fullName,
    photo: d.photo,
    languages: d.languages,
    practiceSinceYear: d.practiceSinceYear,
    systemOfMedicine: "allopathy",
    registration: { council: d.council.name, number: d.registration.number, year: d.registration.year },
    qualifications,
    degreesLine: qualifications.map((q) => (q.specialization ? `${q.degree} (${q.specialization})` : q.degree)).join(", "),
    practitionerType: d.practitionerType,
    primarySpecialty: d.primarySpecialty,
    secondarySpecialties: d.secondarySpecialties,
    services: d.services,
    conditionsTreated: d.conditionsTreated,
    clinics: d.clinics.map((c, i) => {
      const fullAddress = [c.addressLine1, c.addressLine2, c.area.name, `${d.city.name} ${c.pincode}`, d.city.state].filter(Boolean).join(", ");
      return {
        id: `demo-clinic-${i}`,
        name: c.name,
        type: c.type,
        addressLine1: c.addressLine1,
        ...(c.addressLine2 ? { addressLine2: c.addressLine2 } : {}),
        area: c.area,
        city: { slug: d.city.slug, name: d.city.name },
        state: d.city.state,
        pincode: c.pincode,
        fullAddress,
        directionsUrl: `https://www.google.com/maps/search/?api=1&query=${c.geo.lat},${c.geo.lng}`,
        mapEmbedUrl: mapEmbedUrl(c.geo, `${c.name}, ${fullAddress}`),
        geo: c.geo,
        phone: `91${c.phone}`,
        timings: c.timings,
        ...(c.appointmentNote ? { appointmentNote: c.appointmentNote } : {}),
        ...(c.showFee && c.fee ? { fee: c.fee } : {}),
      };
    }),
    phone: `91${d.mobile}`,
    whatsapp: `91${d.whatsapp}`,
    email: d.email,
    links: d.links,
    shortBio: d.shortBio,
    fullBioHtml: d.fullBio,
    awards: d.awards,
    memberships: d.memberships,
    publications: [],
    interests: d.interests,
    interestsPhoto: d.interestsPhoto,
    interestsStory: { title: d.interestsStory.title, paragraphs: storyParagraphs(d.interestsStory.body) },
    gallery: d.gallery,
    ...(d.showHealthTips ? { healthTips: pickHealthTips(`demo-${d.key}`, [d.primarySpecialty.slug, ...d.secondarySpecialties.map((s) => s.slug)]) } : {}),
    loginUrl: `/sample/${d.key}/login`,
    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    ...(d.cardStyle ? { cardStyle: d.cardStyle } : {}),
    seo: { noindex: true },
    updatedAt: "2026-11-25T00:00:00.000Z",
  };
}

/** Demo doctors as ready-to-render pages, by key. */
export const DEMO_PUBLIC_DOCTORS: Record<string, PublicDoctor> = Object.fromEntries(DEMO_DOCTORS.map((d) => [d.key, toPublic(d)]));
