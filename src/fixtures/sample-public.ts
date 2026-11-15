import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { doctorShortSlugBase, doctorSlug } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";
import { SAMPLE_DOCTORS, type SampleDoctorInput } from "./sample-doctors";

/**
 * FICTIONAL sample doctors as ready-to-render PublicDoctor objects (no
 * database needed). Used for template previews in the dashboard and, later,
 * the homepage "Sample" pages.
 */

const SPECIALTY: Record<string, { name: string; plural: string }> = {
  "general-physician": { name: "General Physician", plural: "General Physicians" },
  "family-physician": { name: "Family Physician", plural: "Family Physicians" },
  cardiologist: { name: "Cardiologist", plural: "Cardiologists" },
};
const DEGREE: Record<string, string> = { mbbs: "MBBS", md: "MD", dm: "DM" };
const AREA: Record<string, string> = { kothrud: "Kothrud", baner: "Baner", aundh: "Aundh" };

function toPublic(s: SampleDoctorInput): PublicDoctor {
  const primary = SPECIALTY[s.primarySpecialtySlug]!;
  const slug = doctorSlug(s.firstName, s.lastName, s.primarySpecialtySlug);
  const qualifications = s.qualifications.map((q) => ({
    degree: DEGREE[q.degreeSlug] ?? q.degreeSlug.toUpperCase(),
    ...(q.specialization ? { specialization: q.specialization } : {}),
    institute: q.institute,
    year: q.year,
  }));
  const fullName = `Dr. ${s.firstName} ${s.lastName}`;
  return {
    id: `sample-${s.key}`,
    citySlug: "pune",
    slug,
    shortSlug: doctorShortSlugBase(s.firstName, s.lastName),
    subdomain: s.subdomain,
    url: absUrl(paths.doctor("pune", slug)),
    shareUrl: subdomainUrl(s.subdomain),
    vcfUrl: absUrl(paths.doctorVcf("pune", slug)),
    title: "Dr.",
    firstName: s.firstName,
    lastName: s.lastName,
    fullName,
    languages: s.languages,
    practiceSinceYear: s.practiceSinceYear,
    systemOfMedicine: "allopathy",
    registration: { council: "Maharashtra Medical Council", number: s.registrationNumber },
    qualifications,
    degreesLine: qualifications.map((q) => (q.specialization ? `${q.degree} (${q.specialization})` : q.degree)).join(", "),
    practitionerType: s.practitionerType,
    primarySpecialty: { ...primary, slug: s.primarySpecialtySlug },
    secondarySpecialties: s.secondarySpecialtySlugs.map((x) => ({ ...SPECIALTY[x]!, slug: x })),
    services: s.services.map((name) => ({ name })),
    conditionsTreated: s.conditionsTreated,
    clinics: s.clinics.map((c, i) => {
      const area = AREA[c.areaSlug]!;
      const fullAddress = `${c.addressLine1}, ${area}, Pune ${c.pincode}, Maharashtra`;
      return {
        id: `sample-clinic-${i}`,
        name: c.name,
        type: c.type,
        addressLine1: c.addressLine1,
        area: { name: area, slug: c.areaSlug },
        city: { name: "Pune", slug: "pune" },
        state: "Maharashtra",
        pincode: c.pincode,
        fullAddress,
        directionsUrl: `https://www.google.com/maps/search/?api=1&query=${c.geo.lat},${c.geo.lng}`,
        geo: c.geo,
        phone: `91${c.phone}`,
        timings: c.timings,
        ...(c.appointmentNote ? { appointmentNote: c.appointmentNote } : {}),
        ...(c.showFee && c.fee ? { fee: c.fee } : {}),
      };
    }),
    phone: `91${s.mobile}`,
    whatsapp: `91${s.mobile}`,
    links: {},
    shortBio: s.shortBio,
    fullBioHtml: s.fullBio,
    awards: s.awards,
    memberships: s.memberships,
    publications: [],
    interests: s.interests,
    gallery: [],
    portfolioTemplateId: "classic",
    cardTemplateId: "classic",
    seo: { noindex: true },
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

export const SAMPLE_PUBLIC_DOCTORS: Record<SampleDoctorInput["key"], PublicDoctor> = {
  gp: toPublic(SAMPLE_DOCTORS[0]!),
  consultant: toPublic(SAMPLE_DOCTORS[1]!),
};
