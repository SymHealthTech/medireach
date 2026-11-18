import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));

const { connectToDatabase } = await import("@/lib/db");
const { seedMasters } = await import("@/lib/seed/masters");
const { buildPublicEstablishment, getPublishedEstablishment } = await import("@/lib/public/establishments");
const { getPublishedDoctor } = await import("@/lib/public/data");
const seo = await import("@/lib/seo/establishment");
const { profileJsonLd, siteNodeId } = await import("@/lib/seo/profile");
const { resolveSiteTemplate } = await import("@/templates/registry");
const { default: ClinicClassic } = await import("@/templates/clinic/classic");
const { Area } = await import("@/models/Area");
const { City } = await import("@/models/City");
const { ClinicCategory } = await import("@/models/ClinicCategory");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");

let mongod: MongoMemoryServer;
let ids: { pune: mongoose.Types.ObjectId; baner: mongoose.Types.ObjectId; skin: mongoose.Types.ObjectId; hosp: mongoose.Types.ObjectId };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_site_public_test";
  await connectToDatabase();
  await seedMasters();
  const pune = (await City.findOne({ slug: "pune" }).lean())!;
  ids = {
    pune: pune._id,
    baner: (await Area.findOne({ slug: "baner", cityId: pune._id }).lean())!._id,
    skin: (await ClinicCategory.findOne({ slug: "skin" }).lean())!._id,
    hosp: (await ClinicCategory.findOne({ slug: "small-hospital" }).lean())!._id,
  };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const clinicAt = (extra: Record<string, unknown> = {}) => ({
  kind: "clinic",
  plan: "clinic",
  status: "published",
  name: "Shree Skin Clinic",
  categoryId: ids.skin,
  themeKey: "skin",
  citySlug: "pune",
  address: { line1: "12 Baner Road", areaId: ids.baner, cityId: ids.pune, state: "Maharashtra", pincode: "411045" },
  contact: { phones: ["9800000001"] },
  internalNotes: "SECRET NOTE",
  contactPerson: { name: "Owner Person", phone: "9800000099" },
  ownerEmail: "owner@example.com",
  ...extra,
});

describe("public clinic/hospital sites", () => {
  it("exposes only public fields and published doctors", async () => {
    const live = await DoctorProfile.create({ firstName: "Amit", lastName: "Shah", status: "published", citySlug: "pune", slug: "dr-amit-shah-dermatologist" });
    const draft = await DoctorProfile.create({ firstName: "Draft", lastName: "Doctor", status: "draft" });
    const e = await Establishment.create(
      clinicAt({
        slug: "shree-skin-clinic-baner",
        doctors: [{ doctorProfileId: live._id, role: "Consultant" }, { doctorProfileId: draft._id }, { name: "Dr. Visiting", specialty: "Trichologist" }],
      }),
    );
    const site = (await getPublishedEstablishment("clinic", "pune", "shree-skin-clinic-baner"))!;
    expect(site.url).toMatch(/\/pune\/clinic\/shree-skin-clinic-baner$/);
    expect(site.doctors.map((d) => d.name)).toEqual(["Dr. Amit Shah", "Dr. Visiting"]);
    expect(site.doctors[0]).toMatchObject({ role: "Consultant", url: expect.stringContaining("/pune/doctor/dr-amit-shah-dermatologist") });
    const json = JSON.stringify(site);
    for (const secret of ["SECRET NOTE", "Owner Person", "9800000099", "owner@example.com", "Draft"]) expect(json).not.toContain(secret);
    expect(site.phones).toEqual(["919800000001"]);

    // Drafts never resolve publicly.
    await Establishment.updateOne({ _id: e._id }, { $set: { status: "draft" } });
    expect(await getPublishedEstablishment("clinic", "pune", "shree-skin-clinic-baner")).toBeNull();
    await Establishment.updateOne({ _id: e._id }, { $set: { status: "published" } });
    expect(await getPublishedEstablishment("hospital", "pune", "shree-skin-clinic-baner")).toBeNull(); // wrong kind
  });

  it("builds breadcrumbs, quick facts and JSON-LD without ratings", async () => {
    const doc = (await Establishment.create(clinicAt({ name: "Sai Hospital", kind: "hospital", plan: "hospital", slug: "sai-hospital-baner", categoryId: ids.hosp, themeKey: "small-hospital", is24x7: true, beds: { total: 8, types: [{ type: "General", count: 6 }, { type: "ICU", count: 2 }] }, insurance: { cashless: true, providers: ["Star Health"] }, registration: { authority: "PMC", number: "NH-1" } }))).toObject();
    const site = (await buildPublicEstablishment(doc))!;
    expect(seo.establishmentBreadcrumbs(site).map((c) => c.name)).toEqual(["Home", "Pune", "Hospitals", "Baner", "Sai Hospital"]);
    const facts = seo.establishmentQuickFacts(site).map((f) => f.answer).join(" ");
    expect(facts).toContain("open 24 hours, all 7 days");
    expect(facts).toContain("8 beds: 6 general and 2 ICU");
    expect(facts).toContain("Yes, with Star Health.");

    const ld = seo.establishmentJsonLd(site);
    const node = ld["@graph"][0] as Record<string, unknown>;
    expect(node["@type"]).toBe("Hospital");
    expect(node["@id"]).toBe(`${site.url}#organization`);
    expect(node.identifier).toMatchObject({ value: "NH-1" });
    expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|"review"|ratingValue/i);
    expect(seo.establishmentTitle(seo.seoInputOf(site))).toBe("Sai Hospital – Hospital in Baner, Pune | MediReach");
  });

  it("links a doctor's clinic to its published site, in the page and the JSON-LD", async () => {
    const e = await Establishment.create(clinicAt({ name: "Linked Clinic", slug: "linked-clinic-baner" }));
    const unpublished = await Establishment.create(clinicAt({ name: "Hidden Clinic", slug: "hidden-clinic-baner", status: "draft" }));
    const clinic = (establishmentId: unknown, name: string) => ({ name, addressLine1: "A", areaId: ids.baner, cityId: ids.pune, state: "MH", pincode: "411045", establishmentId });
    await DoctorProfile.create({
      firstName: "Neha",
      lastName: "Rao",
      status: "published",
      citySlug: "pune",
      slug: "dr-neha-rao-dermatologist",
      clinics: [clinic(e._id, "Linked Clinic"), clinic(unpublished._id, "Hidden Clinic")],
    });
    const d = (await getPublishedDoctor("pune", "dr-neha-rao-dermatologist"))!;
    expect(d.clinics[0]!.site).toEqual({ name: "Linked Clinic", url: expect.stringContaining("/pune/clinic/linked-clinic-baner") });
    expect(d.clinics[1]!.site).toBeUndefined();
    const nodes = profileJsonLd(d)["@graph"] as Record<string, unknown>[];
    expect(nodes.some((n) => n["@id"] === siteNodeId(d.clinics[0]!.site!.url))).toBe(true);
  });

  it("renders Classic for design slots that aren't ready", () => {
    expect(resolveSiteTemplate("clinic", "t3", { portfolio: [], card: [], clinic: ["classic"] })).toBe(ClinicClassic);
    expect(resolveSiteTemplate("clinic", "classic")).toBe(ClinicClassic);
  });
});
