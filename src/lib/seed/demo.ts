import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Inquiry } from "@/models/Inquiry";
import { Specialty } from "@/models/Specialty";
import { DEMO_DOCTORS, type DemoDoctor } from "@/fixtures/demo-doctors";
import { doctorShortSlugBase, doctorSlug } from "@/lib/slug";

/**
 * Upsert the FICTIONAL demo doctors (fixtures/demo-doctors) as published,
 * noindex profiles, with a few appointment requests, so the doctor login and
 * appointment requests can be shown. Requires seeded
 * master lists. Matched on subdomain, so re-running updates in place.
 *
 * Their photos are bundled files under public/demo/ (not Cloudinary); the
 * `demo/…` publicId marks them so nothing tries to delete them.
 */

export interface SeedDemoOptions {
  /** Login email for the doctor account (/login). Applied to the first demo doctor only. */
  ownerEmail?: string;
  /** Replace the demo doctors' inquiries with the fixture ones. */
  resetInquiries?: boolean;
}

const demoImage = (url: string, alt?: string) => ({ publicId: `demo${url.replace(/^\/demo/, "").replace(/\.[a-z]+$/, "")}`, url, ...(alt ? { alt } : {}) });

async function idOf<T extends { _id: unknown }>(doc: Promise<T | null>, what: string): Promise<T["_id"]> {
  const found = await doc;
  if (!found) throw new Error(`Demo data references unknown ${what}. Run \`npm run seed:masters\` first.`);
  return found._id;
}

async function seedOne(d: DemoDoctor, opts: SeedDemoOptions & { owner: boolean }): Promise<{ url: string; inquiries: number }> {
  const city = await City.findOne({ slug: d.city.slug }).lean();
  if (!city) throw new Error(`Run \`npm run seed:masters\` first (${d.city.name} is missing).`);
  const primary = await Specialty.findOne({ slug: d.primarySpecialty.slug }).lean();
  if (!primary) throw new Error(`Unknown specialty ${d.primarySpecialty.slug}`);

  const now = new Date();
  const doc = {
    status: "published",
    slug: doctorSlug(d.firstName, d.lastName, primary.slug),
    shortSlug: doctorShortSlugBase(d.firstName, d.lastName),
    citySlug: d.city.slug,
    subdomain: d.subdomain,
    title: "Dr.",
    firstName: d.firstName,
    ...(d.middleName ? { middleName: d.middleName } : {}),
    lastName: d.lastName,
    gender: d.gender,
    photo: demoImage(d.photo.url, d.photo.alt),
    languages: d.languages,
    practiceSinceYear: d.practiceSinceYear,
    systemOfMedicine: "allopathy",
    registration: {
      councilId: await idOf(Council.findOne({ slug: d.council.slug }).lean(), `council "${d.council.slug}"`),
      number: d.registration.number,
      year: d.registration.year,
    },
    qualifications: await Promise.all(
      d.qualifications.map(async (q) => ({
        degreeId: await idOf(Degree.findOne({ slug: q.degree.slug }).lean(), `degree "${q.degree.slug}"`),
        ...(q.specialization ? { specialization: q.specialization } : {}),
        institute: q.institute,
        year: q.year,
      })),
    ),
    practitionerType: d.practitionerType,
    primarySpecialtyId: primary._id,
    secondarySpecialtyIds: await Promise.all(d.secondarySpecialties.map((s) => idOf(Specialty.findOne({ slug: s.slug }).lean(), `specialty "${s.slug}"`))),
    services: d.services,
    conditionsTreated: d.conditionsTreated,
    clinics: await Promise.all(
      d.clinics.map(async (c) => ({
        name: c.name,
        type: c.type,
        addressLine1: c.addressLine1,
        ...(c.addressLine2 ? { addressLine2: c.addressLine2 } : {}),
        areaId: await idOf(Area.findOne({ cityId: city._id, slug: c.area.slug }).lean(), `area "${c.area.slug}"`),
        cityId: city._id,
        state: d.city.state,
        pincode: c.pincode,
        geo: c.geo,
        phone: c.phone,
        timings: c.timings,
        ...(c.appointmentNote ? { appointmentNote: c.appointmentNote } : {}),
        ...(c.fee ? { fee: c.fee } : {}),
        showFee: c.showFee,
      })),
    ),
    mobile: d.mobile,
    whatsapp: d.whatsapp,
    email: d.email,
    links: d.links,
    shortBio: d.shortBio,
    fullBio: d.fullBio,
    awards: d.awards,
    memberships: d.memberships,
    publications: [],
    interests: d.interests,
    interestsPhoto: { ...demoImage(d.interestsPhoto.url, d.interestsPhoto.alt), caption: d.interestsPhoto.caption },
    interestsStory: d.interestsStory,
    gallery: d.gallery.map((g) => ({ ...demoImage(g.url, g.alt), caption: g.caption })),
    showHealthTips: d.showHealthTips,
    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    seo: { noindex: true },
    internalNotes: "FICTIONAL DEMO DOCTOR (fixtures/demo-doctors) — not a real person.",
    compliance: { lastScanAt: now, issues: [], doctorApprovedAt: now, approvedVia: "in_person" },
    publishedAt: now,
    ...(opts.owner && opts.ownerEmail ? { ownerEmail: opts.ownerEmail.trim().toLowerCase() } : {}),
  };

  const saved = await DoctorProfile.findOneAndUpdate({ subdomain: d.subdomain }, { $set: doc }, { upsert: true, new: true, runValidators: true });

  if (opts.resetInquiries) await Inquiry.deleteMany({ doctorId: saved._id });
  let inquiries = await Inquiry.countDocuments({ doctorId: saved._id });
  if (inquiries === 0) {
    const day = 86_400_000;
    await Inquiry.insertMany(
      d.inquiries.map((q, i) => {
        const created = new Date(now.getTime() - q.daysAgo * day - (i + 1) * 47 * 60_000);
        const clinic = q.clinic !== undefined ? saved.clinics[q.clinic] : undefined;
        return {
          doctorId: saved._id,
          name: q.name,
          phone: q.phone,
          ...(q.email ? { email: q.email } : {}),
          ...(clinic ? { clinicId: clinic._id, clinicName: clinic.name } : {}),
          ...(q.preferredInDays !== undefined ? { preferredDate: new Date(now.getTime() + q.preferredInDays * day) } : {}),
          ...(q.preferredTime ? { preferredTime: q.preferredTime } : {}),
          message: q.message,
          status: q.status,
          via: "demo",
          createdAt: created,
          updatedAt: created,
        };
      }),
      { lean: true },
    );
    inquiries = d.inquiries.length;
  }
  return { url: `/${d.city.slug}/doctor/${doc.slug}`, inquiries };
}

export async function seedDemoDoctors(opts: SeedDemoOptions = {}): Promise<{ url: string; inquiries: number }[]> {
  const out = [];
  for (const [i, d] of DEMO_DOCTORS.entries()) out.push(await seedOne(d, { ...opts, owner: i === 0 }));
  return out;
}
