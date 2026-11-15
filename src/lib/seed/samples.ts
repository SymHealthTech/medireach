import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";
import { SAMPLE_DOCTORS } from "@/fixtures/sample-doctors";
import { doctorShortSlugBase, doctorSlug } from "@/lib/slug";

/**
 * Upsert the fictional sample doctors as published, noindex profiles (for
 * local testing and template previews). Requires seeded master lists.
 */
export async function seedSampleDoctors(): Promise<string[]> {
  const pune = await City.findOne({ slug: "pune" }).lean();
  if (!pune) throw new Error("Run `npm run seed:masters` first (Pune is missing).");

  const bySlug = async <T extends { _id: unknown }>(
    find: (slug: string) => Promise<T | null>,
    slug: string,
    what: string,
  ) => {
    const doc = await find(slug);
    if (!doc) throw new Error(`Sample data references unknown ${what} "${slug}".`);
    return doc._id;
  };
  const degree = (s: string) => bySlug((slug) => Degree.findOne({ slug }).lean(), s, "degree");
  const specialty = (s: string) => bySlug((slug) => Specialty.findOne({ slug }).lean(), s, "specialty");
  const area = (s: string) => bySlug((slug) => Area.findOne({ cityId: pune._id, slug }).lean(), s, "area");

  const urls: string[] = [];
  for (const s of SAMPLE_DOCTORS) {
    const primary = await Specialty.findOne({ slug: s.primarySpecialtySlug }).lean();
    if (!primary) throw new Error(`Unknown specialty ${s.primarySpecialtySlug}`);
    const council = await bySlug((slug) => Council.findOne({ slug }).lean(), s.councilSlug, "council");

    const doc = {
      status: "published",
      slug: doctorSlug(s.firstName, s.lastName, primary.slug),
      shortSlug: doctorShortSlugBase(s.firstName, s.lastName),
      citySlug: "pune",
      subdomain: s.subdomain,
      title: "Dr.",
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      languages: s.languages,
      practiceSinceYear: s.practiceSinceYear,
      systemOfMedicine: "allopathy",
      registration: { councilId: council, number: s.registrationNumber },
      qualifications: await Promise.all(
        s.qualifications.map(async (q) => ({ ...q, degreeId: await degree(q.degreeSlug) })),
      ),
      practitionerType: s.practitionerType,
      primarySpecialtyId: primary._id,
      secondarySpecialtyIds: await Promise.all(s.secondarySpecialtySlugs.map(specialty)),
      services: s.services.map((name) => ({ name })),
      conditionsTreated: s.conditionsTreated,
      clinics: await Promise.all(
        s.clinics.map(async (c) => ({
          ...c,
          areaId: await area(c.areaSlug),
          cityId: pune._id,
          state: "Maharashtra",
        })),
      ),
      mobile: s.mobile,
      whatsapp: s.mobile,
      shortBio: s.shortBio,
      fullBio: s.fullBio,
      awards: s.awards,
      memberships: s.memberships,
      interests: s.interests,
      seo: { noindex: true },
      internalNotes: "FICTIONAL SAMPLE DOCTOR — not a real person.",
      compliance: { lastScanAt: new Date(), issues: [], doctorApprovedAt: new Date(), approvedVia: "in_person" },
      publishedAt: new Date(),
    };

    await DoctorProfile.findOneAndUpdate({ subdomain: s.subdomain }, { $set: doc }, { upsert: true, runValidators: true });
    urls.push(`/pune/doctor/${doc.slug}`);
  }
  return urls;
}
