import "server-only";
import { unstable_cache } from "next/cache";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { storyParagraphs } from "@/lib/format";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { CACHE_TAGS } from "@/lib/public/tags";
import type { DoctorCardData, PublicClinic, PublicDoctor, PublicNamed } from "@/templates/types";

/**
 * Read-only data access for public pages. Every query is wrapped in
 * `unstable_cache` with tags, so publishing / editing a doctor (or a master
 * list) calls `revalidateTag` and the static pages rebuild on next request.
 * Only `status: "published"` doctors are ever returned.
 */

const DAY = 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Master lists
// ---------------------------------------------------------------------------

export interface CityMaster extends PublicNamed { id: string; state: string }
export interface AreaMaster extends PublicNamed { id: string; cityId: string }
export interface SpecialtyMaster extends PublicNamed { id: string; plural: string; description?: string }

export interface Masters {
  cities: CityMaster[];
  areas: AreaMaster[];
  specialties: SpecialtyMaster[];
  degrees: { id: string; name: string }[];
  councils: { id: string; name: string }[];
}

export const getMasters = unstable_cache(
  async (): Promise<Masters> => {
    await connectToDatabase();
    const [cities, areas, specialties, degrees, councils] = await Promise.all([
      City.find().lean(),
      Area.find().lean(),
      Specialty.find().lean(),
      Degree.find().lean(),
      Council.find().lean(),
    ]);
    return {
      cities: cities.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state })),
      areas: areas.map((a) => ({ id: String(a._id), name: a.name, slug: a.slug, cityId: String(a.cityId) })),
      specialties: specialties.map((s) => ({
        id: String(s._id),
        name: s.name,
        slug: s.slug,
        plural: s.plural,
        ...(s.description ? { description: s.description } : {}),
      })),
      degrees: degrees.map((d) => ({ id: String(d._id), name: d.name })),
      councils: councils.map((c) => ({ id: String(c._id), name: c.name })),
    };
  },
  ["public-masters"],
  { tags: [CACHE_TAGS.masters], revalidate: DAY },
);

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

interface MasterIndex {
  cities: Map<string, CityMaster>;
  areas: Map<string, AreaMaster>;
  specialties: Map<string, SpecialtyMaster>;
  degrees: Map<string, { id: string; name: string }>;
  councils: Map<string, { id: string; name: string }>;
}

function indexMasters(m: Masters): MasterIndex {
  return {
    cities: indexById(m.cities),
    areas: indexById(m.areas),
    specialties: indexById(m.specialties),
    degrees: indexById(m.degrees),
    councils: indexById(m.councils),
  };
}

// ---------------------------------------------------------------------------
// Mapping DoctorProfile → public shapes
// ---------------------------------------------------------------------------

type LeanDoctor = DoctorProfileDoc;

const idStr = (id: Types.ObjectId | string | undefined | null) => (id ? String(id) : "");

/** Digits with country code: "98220 12345" → "919822012345". */
export function normalizeIndianPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length >= 8 ? digits : undefined;
}

function fullNameOf(d: Pick<LeanDoctor, "title" | "firstName" | "lastName" | "displayName">): string {
  if (d.displayName) return d.displayName;
  return [d.title || "Dr.", d.firstName, d.lastName].filter(Boolean).join(" ");
}

function degreesLineOf(d: LeanDoctor, mi: MasterIndex): string {
  return d.qualifications
    .map((q) => {
      const name = mi.degrees.get(idStr(q.degreeId))?.name;
      if (!name) return null;
      // "MD (Medicine)" — but avoid "MD (Ayurveda) (Ayurveda)".
      return q.specialization && !name.includes("(") ? `${name} (${q.specialization})` : name;
    })
    .filter((x): x is string => Boolean(x))
    .join(", ");
}

function specialtyOf(id: Types.ObjectId | undefined, mi: MasterIndex) {
  const s = mi.specialties.get(idStr(id));
  return s ? { name: s.name, slug: s.slug, plural: s.plural } : undefined;
}

function directionsUrl(c: { mapsUrl?: string; geo?: { lat: number; lng: number } }, address: string): string {
  if (c.mapsUrl) return c.mapsUrl;
  const query = c.geo ? `${c.geo.lat},${c.geo.lng}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function clinicsOf(d: LeanDoctor, mi: MasterIndex): PublicClinic[] {
  return d.clinics.flatMap((c) => {
    const area = mi.areas.get(idStr(c.areaId));
    const city = mi.cities.get(idStr(c.cityId));
    if (!area || !city) return [];
    const fullAddress = [c.addressLine1, c.addressLine2, area.name, `${city.name} ${c.pincode}`, c.state]
      .filter(Boolean)
      .join(", ");
    const clinic: PublicClinic = {
      id: idStr(c._id),
      name: c.name,
      type: c.type,
      addressLine1: c.addressLine1,
      ...(c.addressLine2 ? { addressLine2: c.addressLine2 } : {}),
      area: { name: area.name, slug: area.slug },
      city: { name: city.name, slug: city.slug },
      state: c.state,
      pincode: c.pincode,
      fullAddress,
      directionsUrl: directionsUrl(c, fullAddress),
      ...(c.geo && typeof c.geo.lat === "number" ? { geo: { lat: c.geo.lat, lng: c.geo.lng } } : {}),
      ...(c.phone ? { phone: normalizeIndianPhone(c.phone) ?? c.phone } : {}),
      timings: c.timings.map((t) => ({ day: t.day, slots: t.slots.map((s) => ({ open: s.open, close: s.close })) })),
      ...(c.appointmentNote ? { appointmentNote: c.appointmentNote } : {}),
      ...(c.showFee && typeof c.fee === "number" ? { fee: c.fee } : {}),
    };
    return [clinic];
  });
}

export function toPublicDoctor(d: LeanDoctor, masters: Masters): PublicDoctor {
  const mi = indexMasters(masters);
  const fullName = fullNameOf(d);
  const citySlug = d.citySlug!;
  const slug = d.slug!;
  const url = absUrl(paths.doctor(citySlug, slug));
  const primarySpecialty = specialtyOf(d.primarySpecialtyId, mi);
  const clinics = clinicsOf(d, mi);
  const primaryClinic = clinics[0];

  const photoAlt = [
    fullName,
    primarySpecialty && primaryClinic
      ? `${primarySpecialty.name} in ${primaryClinic.area.name}, ${primaryClinic.city.name}`
      : primarySpecialty?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const gallery = [
    ...d.gallery.map((g) => ({ url: g.url, alt: g.alt || `${fullName} – ${g.caption}`, caption: g.caption })),
    ...d.awards
      .filter((a) => a.photo)
      .map((a) => ({
        url: a.photo!.url,
        alt: a.photo!.alt || `${fullName} – ${a.title}, ${a.awardingBody} ${a.year}`,
        caption: `${a.title}, ${a.awardingBody} (${a.year})`,
      })),
  ];

  const links = Object.fromEntries(
    Object.entries(d.links ?? {}).filter(([, v]) => typeof v === "string" && v.length > 0),
  ) as PublicDoctor["links"];

  const fullBioHtml = sanitizeBioHtml(d.fullBio);

  return {
    id: idStr(d._id),
    citySlug,
    slug,
    ...(d.shortSlug ? { shortSlug: d.shortSlug } : {}),
    ...(d.subdomain ? { subdomain: d.subdomain } : {}),
    url,
    shareUrl: d.subdomain ? subdomainUrl(d.subdomain) : d.shortSlug ? absUrl(paths.short(d.shortSlug)) : url,
    vcfUrl: absUrl(paths.doctorVcf(citySlug, slug)),

    title: d.title || "Dr.",
    firstName: d.firstName,
    lastName: d.lastName,
    fullName,
    ...(d.photo ? { photo: { url: d.photo.url, alt: d.photo.alt || photoAlt } } : {}),
    languages: d.languages,
    ...(d.practiceSinceYear ? { practiceSinceYear: d.practiceSinceYear } : {}),

    systemOfMedicine: d.systemOfMedicine,
    registration: {
      ...(d.registration?.councilId ? { council: mi.councils.get(idStr(d.registration.councilId))?.name } : {}),
      ...(d.registration?.number ? { number: d.registration.number } : {}),
      ...(d.registration?.year ? { year: d.registration.year } : {}),
      ...(d.registration?.nmrId ? { nmrId: d.registration.nmrId } : {}),
    },
    qualifications: d.qualifications.flatMap((q) => {
      const degree = mi.degrees.get(idStr(q.degreeId))?.name;
      return degree
        ? [{ degree, ...(q.specialization ? { specialization: q.specialization } : {}), institute: q.institute, ...(q.year ? { year: q.year } : {}) }]
        : [];
    }),
    degreesLine: degreesLineOf(d, mi),

    practitionerType: d.practitionerType,
    ...(primarySpecialty ? { primarySpecialty } : {}),
    secondarySpecialties: d.secondarySpecialtyIds
      .map((id) => specialtyOf(id, mi))
      .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    services: d.services.map((s) => ({ name: s.name, ...(s.description ? { description: s.description } : {}) })),
    conditionsTreated: d.conditionsTreated,

    clinics,

    ...(normalizeIndianPhone(d.mobile) ? { phone: normalizeIndianPhone(d.mobile) } : {}),
    ...(normalizeIndianPhone(d.whatsapp ?? d.mobile) ? { whatsapp: normalizeIndianPhone(d.whatsapp ?? d.mobile) } : {}),
    ...(d.email ? { email: d.email } : {}),
    links,

    ...(d.shortBio ? { shortBio: d.shortBio } : {}),
    ...(fullBioHtml ? { fullBioHtml } : {}),

    awards: d.awards.map((a) => ({ title: a.title, awardingBody: a.awardingBody, year: a.year })),
    memberships: d.memberships.map((m) => ({ name: m.name, ...(m.since ? { since: m.since } : {}) })),
    publications: d.publications.map((p) => ({
      title: p.title,
      ...(p.journal ? { journal: p.journal } : {}),
      ...(p.year ? { year: p.year } : {}),
      ...(p.url ? { url: p.url } : {}),
    })),
    interests: d.interests,
    ...(d.interestsPhoto
      ? {
          interestsPhoto: {
            url: d.interestsPhoto.url,
            alt: d.interestsPhoto.alt || `${fullName} – ${d.interestsPhoto.caption || "beyond medicine"}`,
            ...(d.interestsPhoto.caption ? { caption: d.interestsPhoto.caption } : {}),
          },
        }
      : {}),
    ...(d.interestsStory?.title
      ? { interestsStory: { title: d.interestsStory.title, paragraphs: storyParagraphs(d.interestsStory.body) } }
      : {}),
    gallery,

    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    seo: {
      ...(d.seo?.titleOverride ? { titleOverride: d.seo.titleOverride } : {}),
      ...(d.seo?.descriptionOverride ? { descriptionOverride: d.seo.descriptionOverride } : {}),
      noindex: Boolean(d.seo?.noindex),
    },

    updatedAt: new Date(d.updatedAt).toISOString(),
    ...(d.publishedAt ? { publishedAt: new Date(d.publishedAt).toISOString() } : {}),
  };
}

function toCard(d: LeanDoctor, mi: MasterIndex): DoctorCardData {
  const primarySpecialty = specialtyOf(d.primarySpecialtyId, mi);
  const firstClinic = d.clinics[0];
  const area = firstClinic ? mi.areas.get(idStr(firstClinic.areaId)) : undefined;
  const fullName = fullNameOf(d);
  return {
    id: idStr(d._id),
    url: absUrl(paths.doctor(d.citySlug!, d.slug!)),
    fullName,
    sortName: `${d.firstName} ${d.lastName}`.toLowerCase(),
    ...(d.photo ? { photo: { url: d.photo.url, alt: d.photo.alt || fullName } } : {}),
    degreesLine: degreesLineOf(d, mi),
    ...(primarySpecialty ? { primarySpecialty } : {}),
    specialtySlugs: [d.primarySpecialtyId, ...d.secondarySpecialtyIds]
      .map((id) => mi.specialties.get(idStr(id))?.slug)
      .filter((s): s is string => Boolean(s)),
    areaSlugs: [...new Set(d.clinics.map((c) => mi.areas.get(idStr(c.areaId))?.slug).filter((s): s is string => Boolean(s)))],
    ...(area ? { area: { name: area.name, slug: area.slug } } : {}),
    ...(firstClinic ? { clinicName: firstClinic.name } : {}),
    updatedAt: new Date(d.updatedAt).toISOString(),
  };
}

const PUBLISHED_ROUTABLE = {
  status: "published",
  slug: { $type: "string" },
  citySlug: { $type: "string" },
} as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getPublishedDoctor = unstable_cache(
  async (citySlug: string, slug: string): Promise<PublicDoctor | null> => {
    await connectToDatabase();
    const [doc, masters] = await Promise.all([
      DoctorProfile.findOne({ ...PUBLISHED_ROUTABLE, citySlug, slug }).lean<LeanDoctor>(),
      getMasters(),
    ]);
    return doc ? toPublicDoctor(doc, masters) : null;
  },
  ["public-doctor"],
  { tags: [CACHE_TAGS.doctors], revalidate: DAY },
);

/** All published doctors in a city as cards, in neutral alphabetical order. */
export const getCityDoctorCards = unstable_cache(
  async (citySlug: string): Promise<DoctorCardData[]> => {
    await connectToDatabase();
    const [docs, masters] = await Promise.all([
      DoctorProfile.find({ ...PUBLISHED_ROUTABLE, citySlug }).lean<LeanDoctor[]>(),
      getMasters(),
    ]);
    const mi = indexMasters(masters);
    return docs.map((d) => toCard(d, mi)).sort((a, b) => a.sortName.localeCompare(b.sortName, "en"));
  },
  ["public-city-doctors"],
  { tags: [CACHE_TAGS.doctors], revalidate: DAY },
);

export interface DoctorRoute {
  citySlug: string;
  slug: string;
}

export const getRouteBySubdomain = unstable_cache(
  async (subdomain: string): Promise<DoctorRoute | null> => {
    await connectToDatabase();
    const d = await DoctorProfile.findOne({ ...PUBLISHED_ROUTABLE, subdomain })
      .select({ citySlug: 1, slug: 1 })
      .lean<Pick<LeanDoctor, "citySlug" | "slug">>();
    return d ? { citySlug: d.citySlug!, slug: d.slug! } : null;
  },
  ["public-route-subdomain"],
  { tags: [CACHE_TAGS.doctors], revalidate: DAY },
);

export const getRouteByShortSlug = unstable_cache(
  async (shortSlug: string): Promise<DoctorRoute | null> => {
    await connectToDatabase();
    const d = await DoctorProfile.findOne({ ...PUBLISHED_ROUTABLE, shortSlug })
      .select({ citySlug: 1, slug: 1 })
      .lean<Pick<LeanDoctor, "citySlug" | "slug">>();
    return d ? { citySlug: d.citySlug!, slug: d.slug! } : null;
  },
  ["public-route-short"],
  { tags: [CACHE_TAGS.doctors], revalidate: DAY },
);

/** Every published profile route + last-modified, for sitemaps and static params. */
export const getPublishedRoutes = unstable_cache(
  async (): Promise<(DoctorRoute & { updatedAt: string; noindex: boolean })[]> => {
    await connectToDatabase();
    const docs = await DoctorProfile.find(PUBLISHED_ROUTABLE)
      .select({ citySlug: 1, slug: 1, updatedAt: 1, "seo.noindex": 1 })
      .sort({ citySlug: 1, slug: 1 })
      .lean<Pick<LeanDoctor, "citySlug" | "slug" | "updatedAt" | "seo">[]>();
    return docs.map((d) => ({
      citySlug: d.citySlug!,
      slug: d.slug!,
      updatedAt: new Date(d.updatedAt).toISOString(),
      noindex: Boolean(d.seo?.noindex),
    }));
  },
  ["public-routes"],
  { tags: [CACHE_TAGS.doctors], revalidate: DAY },
);
