import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// The data module caches with Next's unstable_cache; outside Next, run the query directly.
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));

const { connectToDatabase } = await import("@/lib/db");
const { sharedUrlKeyTaken } = await import("@/lib/url-keys");
const { urlKeyAvailable } = await import("@/lib/doctors/server");
const { getRouteBySubdomain } = await import("@/lib/public/data");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");
const { sitePath } = await import("@/lib/site");

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_urlkeys_test";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([DoctorProfile.deleteMany({}), Establishment.deleteMany({})]);
});

describe("shared subdomain and short-link namespace", () => {
  it("a clinic's subdomain blocks a doctor from taking it, and the other way round", async () => {
    const clinic = await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree Skin", subdomain: "shreeskin" });
    const doc = await DoctorProfile.create({ firstName: "Amit", lastName: "Shah", subdomain: "amit" });

    expect(await sharedUrlKeyTaken("subdomain", "shreeskin", { kind: "doctor", id: doc._id })).toBe(true);
    expect(await sharedUrlKeyTaken("subdomain", "amit", { kind: "establishment", id: clinic._id })).toBe(true);
    // A site never blocks itself.
    expect(await sharedUrlKeyTaken("subdomain", "shreeskin", { kind: "establishment", id: clinic._id })).toBe(false);
    expect(await sharedUrlKeyTaken("subdomain", "amit", { kind: "doctor", id: doc._id })).toBe(false);
    expect(await sharedUrlKeyTaken("subdomain", "free-name")).toBe(false);

    // The doctor editor's live check sees clinic subdomains.
    expect(await urlKeyAvailable("subdomain", "shreeskin", { excludeId: String(doc._id) })).toBe(false);
    expect(await urlKeyAvailable("subdomain", "amit", { excludeId: String(doc._id) })).toBe(true);
  });

  it("checks short links across both, but page slugs only among doctors", async () => {
    await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree", shortSlug: "shree-clinic", citySlug: "pune", slug: "dr-amit-shah-dentist" });
    expect(await urlKeyAvailable("shortSlug", "shree-clinic", {})).toBe(false);
    // /pune/doctor/… and /pune/clinic/… can't collide.
    expect(await urlKeyAvailable("slug", "dr-amit-shah-dentist", { citySlug: "pune" })).toBe(true);
  });
});

describe("subdomain → site route", () => {
  it("finds published doctors and clinics/hospitals, never drafts", async () => {
    await DoctorProfile.create({ firstName: "Amit", lastName: "Shah", status: "published", citySlug: "pune", slug: "dr-amit-shah-dentist", subdomain: "amit" });
    await Establishment.create({ kind: "hospital", plan: "hospital", name: "Sai", status: "published", citySlug: "pune", slug: "sai-hospital-wakad", subdomain: "saihospital" });
    await Establishment.create({ kind: "clinic", plan: "clinic", name: "Draft", status: "draft", citySlug: "pune", slug: "draft-clinic", subdomain: "draftclinic" });

    const doctor = await getRouteBySubdomain("amit");
    expect(doctor).toEqual({ kind: "doctor", citySlug: "pune", slug: "dr-amit-shah-dentist" });
    expect(sitePath(doctor!)).toBe("/pune/doctor/dr-amit-shah-dentist");

    const hospital = await getRouteBySubdomain("saihospital");
    expect(hospital).toEqual({ kind: "hospital", citySlug: "pune", slug: "sai-hospital-wakad" });
    expect(sitePath(hospital!)).toBe("/pune/hospital/sai-hospital-wakad");

    expect(await getRouteBySubdomain("draftclinic")).toBeNull();
    expect(await getRouteBySubdomain("nobody")).toBeNull();
  });
});
