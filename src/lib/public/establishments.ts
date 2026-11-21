import "server-only";
import { unstable_cache } from "next/cache";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getMasters, indexMasters, normalizeIndianPhone, PUBLISHED_LIVE, PUBLISHED_ROUTABLE, toCard, type Masters } from "@/lib/public/data";
import { CACHE_TAGS } from "@/lib/public/tags";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { absUrl, sitePath, subdomainUrl } from "@/lib/site";
import { ClinicCategory } from "@/models/ClinicCategory";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { Establishment, type EstablishmentDoc } from "@/models/Establishment";
import type { PublicEstablishment, PublicSiteDoctor, SiteCardData } from "@/templates/types";
import { getTheme } from "@/themes/specialty";
import { siteTypeName } from "@/lib/seo/establishment";

/**
 * Read-only data for public clinic and hospital sites. Cached with tags; the
 * editor's publish/edit actions revalidate `establishments` (and `doctors`,
 * since doctor pages show "Practises at").
 */

const DAY = 24 * 60 * 60;
const idStr = (id: Types.ObjectId | string | undefined | null) => (id ? String(id) : "");

export interface CategoryMaster {
  id: string;
  name: string;
  slug: string;
  plural: string;
  kind: "clinic" | "hospital";
}

export const getClinicCategories = unstable_cache(
  async (): Promise<CategoryMaster[]> => {
    await connectToDatabase();
    const rows = await ClinicCategory.find().sort({ name: 1 }).lean();
    return rows.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, plural: c.plural, kind: c.kind }));
  },
  ["public-clinic-categories"],
  { tags: [CACHE_TAGS.masters], revalidate: DAY },
);

/** Google Maps embed without an API key: the pin when known, else the address. */
export function mapEmbedUrl(geo: { lat: number; lng: number } | undefined, address: string): string {
  const q = geo ? `${geo.lat},${geo.lng}` : address;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

function directionsUrl(mapsUrl: string | undefined, geo: { lat: number; lng: number } | undefined, address: string): string {
  if (mapsUrl) return mapsUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geo ? `${geo.lat},${geo.lng}` : address)}`;
}

/**
 * Map an Establishment to its public view. `linkedDoctors` are the published
 * portfolios among its doctors (by id); unpublished ones are left out entirely
 * so draft details never leak. Returns null if the address can't be resolved.
 */
export function toPublicEstablishment(
  e: EstablishmentDoc,
  masters: Masters,
  categories: CategoryMaster[],
  linkedDoctors: DoctorProfileDoc[],
): PublicEstablishment | null {
  const mi = indexMasters(masters);
  const area = mi.areas.get(idStr(e.address?.areaId));
  const city = mi.cities.get(idStr(e.address?.cityId));
  if (!area || !city || !e.citySlug || !e.slug) return null;

  const url = absUrl(sitePath({ kind: e.kind, citySlug: e.citySlug, slug: e.slug }));
  const category = categories.find((c) => c.id === idStr(e.categoryId));
  const fullAddress = [e.address.line1, e.address.line2, area.name, `${city.name} ${e.address.pincode ?? ""}`.trim(), e.address.state]
    .filter(Boolean)
    .join(", ");
  const geo = e.geo && typeof e.geo.lat === "number" ? { lat: e.geo.lat, lng: e.geo.lng } : undefined;

  const cards = new Map(linkedDoctors.map((d) => [String(d._id), toCard(d, mi)]));
  const siteDoctors: PublicSiteDoctor[] = (e.doctors ?? []).flatMap((x): PublicSiteDoctor[] => {
    if (x.doctorProfileId) {
      const card = cards.get(String(x.doctorProfileId));
      if (!card) return []; // linked portfolio not published: not shown
      return [
        {
          id: card.id,
          name: card.fullName,
          ...(card.degreesLine ? { qualifications: card.degreesLine } : {}),
          ...(card.primarySpecialty ? { specialty: card.primarySpecialty.name } : {}),
          ...(x.role ? { role: x.role } : {}),
          url: card.url,
          ...(card.photo ? { photo: card.photo } : {}),
        },
      ];
    }
    return x.name
      ? [
          {
            name: x.name,
            ...(x.qualifications ? { qualifications: x.qualifications } : {}),
            ...(x.specialty ? { specialty: x.specialty } : {}),
            ...(x.role ? { role: x.role } : {}),
            ...(x.profileUrl && /^https?:\/\//i.test(x.profileUrl) ? { url: x.profileUrl, external: true } : {}),
            ...(x.photo?.url ? { photo: { url: x.photo.url, alt: x.photo.alt || x.name } } : {}),
          },
        ]
      : [];
  });
  const byId = new Map(siteDoctors.filter((d) => d.id).map((d) => [d.id!, d]));

  const phones = (e.contact?.phones ?? []).map((p) => normalizeIndianPhone(p)).filter((p): p is string => Boolean(p));
  const links = Object.fromEntries(Object.entries(e.links ?? {}).filter(([, v]) => typeof v === "string" && v)) as PublicEstablishment["links"];
  const aboutHtml = sanitizeBioHtml(e.about);
  const what = siteTypeName(e.kind, category?.name).toLowerCase().replace(/\bent\b/, "ENT");

  return {
    id: String(e._id),
    kind: e.kind,
    citySlug: e.citySlug,
    slug: e.slug,
    url,
    shareUrl: e.subdomain ? subdomainUrl(e.subdomain) : url,
    cardUrl: `${url}/card`,
    name: e.name,
    ...(category ? { category: { name: category.name, slug: category.slug, plural: category.plural } } : {}),
    themeKey: e.themeKey,
    ...(e.logo ? { logo: { url: e.logo.url, alt: e.logo.alt || `${e.name} logo` } } : {}),
    ...(e.coverPhoto ? { coverPhoto: { url: e.coverPhoto.url, alt: e.coverPhoto.alt || `${e.name}, ${area.name}, ${city.name}` } } : {}),
    ...(e.tagline ? { tagline: e.tagline } : {}),
    ...(e.shortDescription ? { shortDescription: e.shortDescription } : {}),
    ...(aboutHtml ? { aboutHtml } : {}),
    ...(e.registration?.number || e.registration?.authority ? { registration: { ...(e.registration.authority ? { authority: e.registration.authority } : {}), ...(e.registration.number ? { number: e.registration.number } : {}) } } : {}),
    address: {
      line1: e.address.line1 ?? "",
      ...(e.address.line2 ? { line2: e.address.line2 } : {}),
      area: { name: area.name, slug: area.slug },
      city: { name: city.name, slug: city.slug },
      state: e.address.state ?? city.state,
      pincode: e.address.pincode ?? "",
      ...(e.address.landmark ? { landmark: e.address.landmark } : {}),
      ...(e.address.parkingNote ? { parkingNote: e.address.parkingNote } : {}),
      fullAddress,
    },
    directionsUrl: directionsUrl(e.mapsUrl, geo, fullAddress),
    mapEmbedUrl: mapEmbedUrl(geo, `${e.name}, ${fullAddress}`),
    ...(geo ? { geo } : {}),
    phones,
    ...(normalizeIndianPhone(e.contact?.whatsapp) ? { whatsapp: normalizeIndianPhone(e.contact?.whatsapp) } : {}),
    ...(e.contact?.email ? { email: e.contact.email } : {}),
    ...(normalizeIndianPhone(e.contact?.emergencyPhone) ? { emergencyPhone: normalizeIndianPhone(e.contact?.emergencyPhone) } : {}),
    is24x7: Boolean(e.is24x7),
    timings: (e.timings ?? []).map((t) => ({ day: t.day, slots: t.slots.map((s) => ({ open: s.open, close: s.close })) })),
    ...(e.appointmentNote ? { appointmentNote: e.appointmentNote } : {}),
    ...(e.kind === "hospital" && e.visitingHours ? { visitingHours: e.visitingHours } : {}),
    services: (e.services ?? []).map((s) => ({ name: s.name, ...(s.description ? { description: s.description } : {}), ...(s.group ? { group: s.group } : {}) })),
    facilities: (e.facilities ?? []).map((s) => ({ name: s.name, ...(s.description ? { description: s.description } : {}) })),
    equipment: (e.equipment ?? []).map((s) => ({ name: s.name, ...(s.description ? { description: s.description } : {}) })),
    doctors: siteDoctors,
    departments:
      e.kind === "hospital"
        ? (e.departments ?? []).map((d) => ({
            name: d.name,
            ...(d.description ? { description: d.description } : {}),
            doctors: (d.doctorIds ?? []).map((id) => byId.get(String(id))).filter((x): x is PublicSiteDoctor => Boolean(x)),
          }))
        : [],
    ...(e.kind === "hospital" && e.beds && e.beds.total > 0 ? { beds: { total: e.beds.total, types: e.beds.types.filter((b) => b.count > 0) } } : {}),
    ...(e.insurance && (e.insurance.cashless || e.insurance.providers.length) ? { insurance: { cashless: e.insurance.cashless, providers: e.insurance.providers } } : {}),
    languages: e.languages ?? [],
    gallery: (e.gallery ?? []).map((g) => ({ url: g.url, alt: g.alt || `${e.name} – ${g.caption || what}`, ...(g.caption ? { caption: g.caption } : {}) })),
    links,
    siteTemplateId: e.siteTemplateId ?? "classic",
    cardTemplateId: e.cardTemplateId ?? "classic",
    ...(e.cardStyle ? { cardStyle: e.cardStyle } : {}),
    seo: {
      ...(e.seo?.titleOverride ? { titleOverride: e.seo.titleOverride } : {}),
      ...(e.seo?.descriptionOverride ? { descriptionOverride: e.seo.descriptionOverride } : {}),
      noindex: Boolean(e.seo?.noindex),
    },
    ...(e.renewalStatus === "lapsed" ? { lapsed: true } : {}),
    updatedAt: new Date(e.updatedAt).toISOString(),
    ...(e.publishedAt ? { publishedAt: new Date(e.publishedAt).toISOString() } : {}),
  };
}

/** Load one establishment's public view (any status; callers decide what's allowed). */
export async function buildPublicEstablishment(e: EstablishmentDoc): Promise<PublicEstablishment | null> {
  const ids = (e.doctors ?? []).map((d) => d.doctorProfileId).filter(Boolean);
  const [masters, categories, doctors] = await Promise.all([
    getMasters(),
    getClinicCategories(),
    ids.length ? DoctorProfile.find({ _id: { $in: ids }, ...PUBLISHED_LIVE }).lean<DoctorProfileDoc[]>() : Promise.resolve([]),
  ]);
  return toPublicEstablishment(e, masters, categories, doctors);
}

export const getPublishedEstablishment = unstable_cache(
  async (kind: "clinic" | "hospital", citySlug: string, slug: string): Promise<PublicEstablishment | null> => {
    await connectToDatabase();
    const e = await Establishment.findOne({ ...PUBLISHED_ROUTABLE, kind, citySlug, slug }).lean<EstablishmentDoc>();
    return e ? buildPublicEstablishment(e) : null;
  },
  // v2: carries `lapsed`.
  ["public-establishment-v2"],
  { tags: [CACHE_TAGS.establishments, CACHE_TAGS.doctors, CACHE_TAGS.masters], revalidate: DAY },
);

/** The site, or null if it's not published or lapsed (cards, preview image). */
export async function getLiveEstablishment(kind: "clinic" | "hospital", citySlug: string, slug: string): Promise<PublicEstablishment | null> {
  const s = await getPublishedEstablishment(kind, citySlug, slug);
  return s && !s.lapsed ? s : null;
}

/** Every live clinic/hospital route, for static params and sitemaps. */
export const getPublishedEstablishmentRoutes = unstable_cache(
  async (): Promise<{ kind: "clinic" | "hospital"; citySlug: string; slug: string; updatedAt: string; noindex: boolean }[]> => {
    await connectToDatabase();
    const rows = await Establishment.find(PUBLISHED_LIVE).select({ kind: 1, citySlug: 1, slug: 1, updatedAt: 1, "seo.noindex": 1 }).sort({ citySlug: 1, slug: 1 }).lean();
    return rows.map((r) => ({
      kind: r.kind,
      citySlug: r.citySlug!,
      slug: r.slug!,
      updatedAt: new Date(r.updatedAt).toISOString(),
      noindex: Boolean(r.seo?.noindex),
    }));
  },
  ["public-establishment-routes"],
  { tags: [CACHE_TAGS.establishments], revalidate: DAY },
);

/** All published clinics and hospitals in a city as cards, alphabetical (never "featured"). */
export const getCitySiteCards = unstable_cache(
  async (citySlug: string): Promise<SiteCardData[]> => {
    await connectToDatabase();
    const [rows, masters, categories] = await Promise.all([
      Establishment.find({ ...PUBLISHED_LIVE, citySlug })
        .select({ kind: 1, name: 1, citySlug: 1, slug: 1, logo: 1, themeKey: 1, categoryId: 1, "address.areaId": 1, is24x7: 1, doctors: 1, updatedAt: 1 })
        .lean(),
      getMasters(),
      getClinicCategories(),
    ]);
    const mi = indexMasters(masters);
    return rows
      .flatMap((e): SiteCardData[] => {
        const area = mi.areas.get(idStr(e.address?.areaId));
        if (!area) return [];
        const category = categories.find((c) => c.id === idStr(e.categoryId));
        return [
          {
            id: String(e._id),
            kind: e.kind,
            url: absUrl(sitePath({ kind: e.kind, citySlug: e.citySlug!, slug: e.slug! })),
            name: e.name,
            sortName: e.name.toLowerCase(),
            ...(e.logo ? { logo: { url: e.logo.url, alt: e.logo.alt || `${e.name} logo` } } : {}),
            color: getTheme(e.themeKey, e.kind).palette.primary,
            ...(category ? { category: { name: category.name, slug: category.slug, plural: category.plural } } : {}),
            area: { name: area.name, slug: area.slug },
            is24x7: Boolean(e.is24x7),
            doctorCount: e.doctors?.length ?? 0,
            updatedAt: new Date(e.updatedAt).toISOString(),
          },
        ];
      })
      .sort((a, b) => a.sortName.localeCompare(b.sortName, "en"));
  },
  ["public-city-sites"],
  { tags: [CACHE_TAGS.establishments, CACHE_TAGS.masters], revalidate: DAY },
);
