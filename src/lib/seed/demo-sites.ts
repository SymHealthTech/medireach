import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { Establishment } from "@/models/Establishment";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { slugify } from "@/lib/slug";

/**
 * Upsert the FICTIONAL sample clinic and hospital sites (fixtures/sample-sites:
 * one per specialty theme, plus the small hospital) as published, noindex
 * establishments, so the demo database has clinic and hospital websites next
 * to the demo doctors. Requires seeded master lists. Matched on the page
 * address (city + slug), so re-running updates in place.
 */
export async function seedDemoSites(): Promise<{ url: string; kind: string; name: string }[]> {
  const city = await City.findOne({ slug: "pune" }).lean();
  if (!city) throw new Error("Run `npm run seed:masters` first (Pune is missing).");
  const now = new Date();
  const out: { url: string; kind: string; name: string }[] = [];

  for (const site of Object.values(SAMPLE_SITES)) {
    const area = await Area.findOne({ cityId: city._id, slug: site.address.area.slug }).lean();
    if (!area) throw new Error(`Unknown area "${site.address.area.slug}". Run \`npm run seed:masters\` first.`);
    const category =
      (site.category ? await ClinicCategory.findOne({ slug: site.category.slug }).lean() : null) ?? (await ClinicCategory.findOne({ kind: site.kind }).lean());

    const name = slugify(site.name);
    const slug = name.endsWith(`-${area.slug}`) ? name : `${name}-${area.slug}`;
    const doctors = site.doctors.map((x, i) => ({
      key: `demo-${i}`,
      name: x.name,
      ...(x.qualifications ? { qualifications: x.qualifications } : {}),
      ...(x.specialty ? { specialty: x.specialty } : {}),
      ...(x.role ? { role: x.role } : {}),
    }));
    const keyOf = (n: string) => doctors.find((x) => x.name === n)?.key;

    const doc = {
      status: "published",
      kind: site.kind,
      plan: site.kind,
      name: site.name,
      slug,
      shortSlug: name.replace(/^dr-/, ""),
      citySlug: city.slug,
      ...(category ? { categoryId: category._id } : {}),
      themeKey: site.themeKey,
      ...(site.tagline ? { tagline: site.tagline } : {}),
      ...(site.aboutHtml ? { about: site.aboutHtml } : {}),
      ...(site.shortDescription ? { shortDescription: site.shortDescription } : {}),
      ...(site.registration ? { registration: site.registration } : {}),
      address: {
        line1: site.address.line1,
        areaId: area._id,
        cityId: city._id,
        state: site.address.state,
        pincode: site.address.pincode,
        ...(site.address.landmark ? { landmark: site.address.landmark } : {}),
      },
      contact: {
        phones: site.phones,
        ...(site.whatsapp ? { whatsapp: site.whatsapp } : {}),
        ...(site.emergencyPhone ? { emergencyPhone: site.emergencyPhone } : {}),
      },
      timings: site.timings,
      is24x7: site.is24x7,
      ...(site.appointmentNote ? { appointmentNote: site.appointmentNote } : {}),
      ...(site.visitingHours ? { visitingHours: site.visitingHours } : {}),
      services: site.services,
      facilities: site.facilities,
      equipment: site.equipment,
      doctors,
      departments: site.departments.map((dep) => ({
        name: dep.name,
        ...(dep.description ? { description: dep.description } : {}),
        doctorKeys: dep.doctors.map((x) => keyOf(x.name)).filter((k): k is string => Boolean(k)),
      })),
      ...(site.beds ? { beds: { total: site.beds.total, types: site.beds.types.map((t) => ({ type: t.type, count: t.count ?? 0 })) } } : {}),
      ...(site.insurance ? { insurance: site.insurance } : {}),
      languages: site.languages,
      siteTemplateId: site.siteTemplateId,
      cardTemplateId: site.cardTemplateId,
      seo: { noindex: true },
      internalNotes: "FICTIONAL DEMO SITE (fixtures/sample-sites) — not a real clinic or hospital.",
      compliance: { lastScanAt: now, issues: [], ownerApprovedAt: now, approvedVia: "in_person" },
      publishedAt: now,
    };

    await Establishment.findOneAndUpdate({ citySlug: city.slug, slug }, { $set: doc }, { upsert: true, new: true, runValidators: true });
    out.push({ url: `/${city.slug}/${site.kind === "hospital" ? "hospital" : "clinic"}/${slug}`, kind: site.kind, name: site.name });
  }
  return out;
}
