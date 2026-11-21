import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));

const { connectToDatabase } = await import("@/lib/db");
const { seedMasters } = await import("@/lib/seed/masters");
const hubs = await import("@/lib/public/hubs");
const { allSitemapEntries } = await import("@/lib/public/sitemap");
const { countPhrase, hubMetadata, listedKinds } = await import("@/lib/seo/hub");
const { Area } = await import("@/models/Area");
const { City } = await import("@/models/City");
const { ClinicCategory } = await import("@/models/ClinicCategory");
const { Establishment } = await import("@/models/Establishment");

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_site_hubs_test";
  await connectToDatabase();
  await seedMasters();
  const pune = (await City.findOne({ slug: "pune" }).lean())!;
  const area = async (slug: string) => (await Area.findOne({ slug, cityId: pune._id }).lean())!._id;
  const cat = async (slug: string) => (await ClinicCategory.findOne({ slug }).lean())!._id;
  const base = (name: string, slug: string, kind: "clinic" | "hospital", categoryId: unknown, areaId: unknown, extra: Record<string, unknown> = {}) => ({
    kind,
    plan: kind,
    status: "published",
    name,
    slug,
    citySlug: "pune",
    categoryId,
    themeKey: kind === "hospital" ? "small-hospital" : "skin",
    address: { line1: "1 Road", areaId, cityId: pune._id, state: "Maharashtra", pincode: "411001" },
    ...extra,
  });
  await Establishment.create([
    base("Zen Skin Clinic", "zen-skin-clinic-baner", "clinic", await cat("skin"), await area("baner")),
    base("Aura Skin Clinic", "aura-skin-clinic-baner", "clinic", await cat("skin"), await area("baner")),
    base("Smile Dental", "smile-dental-aundh", "clinic", await cat("dental"), await area("aundh")),
    base("Sai Hospital", "sai-hospital-wakad", "hospital", await cat("small-hospital"), await area("wakad"), { is24x7: true }),
    base("Matru Care", "matru-care-baner", "hospital", await cat("maternity-hospital"), await area("baner")),
    base("Asha Maternity", "asha-maternity-wakad", "hospital", await cat("maternity-hospital"), await area("wakad")),
    base("Hidden Draft Clinic", "hidden-draft-clinic-baner", "clinic", await cat("skin"), await area("baner"), { status: "draft" }),
    base("Noindex Eye Clinic", "noindex-eye-clinic-baner", "clinic", await cat("eye"), await area("baner"), { seo: { noindex: true } }),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("clinic and hospital hubs", () => {
  it("lists published sites alphabetically and builds category links", async () => {
    const ctx = (await hubs.loadCity("pune"))!;
    const clinics = hubs.clinicsOf(ctx.sites);
    expect(clinics.filter(hubs.inCategory("skin")).map((s) => s.name)).toEqual(["Aura Skin Clinic", "Zen Skin Clinic"]); // alphabetical, draft hidden
    expect(hubs.hospitalsOf(ctx.sites).map((s) => s.name)).toEqual(["Asha Maternity", "Matru Care", "Sai Hospital"]);
    expect(ctx.categories.some((c) => c.slug === "small-hospital")).toBe(false); // hospitals have their own hubs
    expect(hubs.categoryLinks(ctx, clinics, (c) => c.slug).map((l) => `${l.name}:${l.count}`)).toEqual(["Dental Clinics:1", "Eye Clinics:1", "Skin Clinics:2"]);
    expect(hubs.allAreaLinks(ctx, (a) => a.slug).map((l) => l.url)).toEqual(["aundh", "baner", "wakad"]);
  });

  it("gives hospital types their own hubs (not the general Hospital type)", async () => {
    const ctx = (await hubs.loadCity("pune"))!;
    expect(ctx.hospitalTypes.some((t) => t.slug === "small-hospital")).toBe(false);
    expect(ctx.hospitalTypes.map((t) => t.slug)).toContain("maternity-hospital");
    const hospitals = hubs.hospitalsOf(ctx.sites);
    expect(hubs.hospitalTypeLinks(ctx, hospitals, (t) => t.slug).map((l) => `${l.name}:${l.count}`)).toEqual(["Maternity Hospitals:2"]);
    const maternity = hospitals.filter(hubs.inCategory("maternity-hospital"));
    expect(maternity.map((s) => s.name)).toEqual(["Asha Maternity", "Matru Care"]);
    expect(hubs.siteAreaLinks(ctx, maternity, (a) => a.slug).map((l) => l.url)).toEqual(["baner", "wakad"]);
    // Type slugs never clash with area slugs (the two share /[city]/hospitals/[slug]).
    const areaSlugs = new Set(ctx.areas.map((a) => a.slug));
    for (const t of ctx.hospitalTypes) expect(areaSlugs.has(t.slug), t.slug).toBe(false);
  });

  it("puts only non-empty hubs in the sitemap, plus indexable clinic and hospital pages", async () => {
    const urls = (await allSitemapEntries()).map((e) => e.url.replace(/^https?:\/\/[^/]+/, ""));
    for (const u of [
      "/pune",
      "/pune/clinics/skin",
      "/pune/clinics/skin/baner",
      "/pune/clinics/dental/aundh",
      "/pune/hospitals",
      "/pune/hospitals/wakad",
      "/pune/area/baner",
      "/pune/area/wakad",
      "/pune/clinic/aura-skin-clinic-baner",
      "/pune/hospital/sai-hospital-wakad",
      "/pune/hospitals/maternity-hospital",
      "/pune/hospitals/maternity-hospital/baner",
      "/pune/hospitals/maternity-hospital/wakad",
    ]) {
      expect(urls, u).toContain(u);
    }
    expect(urls).not.toContain("/pune/clinics/skin/aundh"); // empty
    expect(urls).not.toContain("/pune/clinics/ent"); // empty
    expect(urls).toContain("/pune/hospitals/baner"); // Matru Care
    expect(urls).not.toContain("/pune/hospitals/aundh"); // empty
    expect(urls).not.toContain("/pune/hospitals/small-hospital"); // the general type is /pune/hospitals
    expect(urls).not.toContain("/pune/hospitals/eye-hospital"); // empty type
    expect(urls).not.toContain("/pune/clinic/hidden-draft-clinic-baner"); // draft
    expect(urls).not.toContain("/pune/clinic/noindex-eye-clinic-baner"); // noindex page left out…
    expect(urls).toContain("/pune/clinics/eye"); // …but it still counts for its hub
  });

  it("words titles and metadata for what a hub lists, and noindexes empty hubs", () => {
    expect(listedKinds({ doctors: 3, clinics: 0, hospitals: 0 })).toBe("Doctors");
    expect(listedKinds({ doctors: 2, clinics: 1, hospitals: 1 })).toBe("Doctors, clinics and hospitals");
    expect(listedKinds({ doctors: 0, clinics: 2, hospitals: 0 })).toBe("Clinics");
    expect(countPhrase(1, { name: "ENT Clinic", plural: "ENT Clinics" })).toBe("1 ENT clinic");
    expect(countPhrase(3, { name: "Skin Clinic", plural: "Skin Clinics" })).toBe("3 skin clinics");
    const empty = hubMetadata({ title: "Hospitals in Baner, Pune", url: "https://x/", count: 0, place: "Baner, Pune", listing: "hospitals" });
    expect(empty.robots).toMatchObject({ index: false });
    const full = hubMetadata({ title: "Skin Clinics in Pune", url: "https://x/", count: 2, place: "Pune", listing: "clinics" });
    expect(full.description).toBe("Skin Clinics in Pune: timings, addresses, doctors and contact details for 2 clinics in Pune.");
  });
});
