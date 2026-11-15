import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedMasters } from "@/lib/seed/masters";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Setting } from "@/models/Setting";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";
import { PUNE_AREAS } from "@/data/masters";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "medireach_portfolio_test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("seedMasters", () => {
  it("seeds every master list and is idempotent", async () => {
    const first = await seedMasters();
    expect(first.cities).toBe(1);
    expect(first.areas).toBe(PUNE_AREAS.length);
    expect(first.specialties).toBeGreaterThanOrEqual(40);
    expect(first.degrees).toBeGreaterThanOrEqual(30);
    expect(first.councils).toBeGreaterThanOrEqual(30);
    expect(first.templateSlots).toBe(10);
    expect(first.settings).toBe(1);

    const second = await seedMasters();
    expect(Object.values(second).every((n) => n === 0)).toBe(true);

    expect(await City.countDocuments()).toBe(1);
    expect(await Area.countDocuments()).toBe(PUNE_AREAS.length);
    expect(await Specialty.countDocuments()).toBe(first.specialties);
    expect(await Degree.countDocuments()).toBe(first.degrees);
    expect(await Council.countDocuments({ slug: "maharashtra-medical-council" })).toBe(1);
  });

  it("does not overwrite dashboard edits on re-run", async () => {
    await Specialty.updateOne({ slug: "dermatologist" }, { $set: { plural: "Skin Specialists" } });
    await seedMasters();
    const derm = await Specialty.findOne({ slug: "dermatologist" }).lean();
    expect(derm?.plural).toBe("Skin Specialists");
  });

  it("creates classic as the only ready + default slot per type", async () => {
    for (const type of ["portfolio", "card"] as const) {
      const slots = await TemplateSlot.find({ type }).sort({ key: 1 }).lean();
      expect(slots.map((s) => s.key)).toEqual(["classic", "t2", "t3", "t4", "t5"]);
      expect(slots.filter((s) => s.isDefault).map((s) => s.key)).toEqual(["classic"]);
      expect(slots.filter((s) => s.status === "ready").map((s) => s.key)).toEqual(["classic"]);
    }
  });

  it("creates the settings singleton with defaults", async () => {
    const s = await Setting.findOne().lean();
    expect(s).toMatchObject({ foundingTotal: 100, gstMode: "inclusive", prices: { update: 299 } });
  });
});

describe("DoctorProfile", () => {
  beforeEach(async () => {
    await DoctorProfile.deleteMany({});
  });

  it("allows many drafts without URL keys", async () => {
    await DoctorProfile.create({ firstName: "Amit", lastName: "Shah" });
    await DoctorProfile.create({ firstName: "Neha", lastName: "Joshi" });
    expect(await DoctorProfile.countDocuments({ status: "draft" })).toBe(2);
  });

  it("enforces slug uniqueness per city, and global shortSlug/subdomain uniqueness", async () => {
    const base = { firstName: "Amit", lastName: "Shah", citySlug: "pune" };
    await DoctorProfile.create({ ...base, slug: "dr-amit-shah-dentist", shortSlug: "dr-amit-shah", subdomain: "amit" });

    await expect(
      DoctorProfile.create({ ...base, slug: "dr-amit-shah-dentist", shortSlug: "dr-amit-shah-2" }),
    ).rejects.toThrow(/duplicate key/);
    // Same slug in another city is fine.
    await DoctorProfile.create({ ...base, citySlug: "mumbai", slug: "dr-amit-shah-dentist", shortSlug: "dr-amit-shah-mumbai" });
    await expect(
      DoctorProfile.create({ ...base, slug: "dr-amit-shah-2-dentist", shortSlug: "dr-amit-shah" }),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      DoctorProfile.create({ ...base, slug: "dr-amit-shah-3-dentist", subdomain: "amit" }),
    ).rejects.toThrow(/duplicate key/);
  });

  it("validates timings, short bio and award fields", async () => {
    const bad = new DoctorProfile({
      firstName: "Amit",
      lastName: "Shah",
      shortBio: "x".repeat(161),
      awards: [{ title: "Gold medal" }],
    });
    const err = bad.validateSync();
    expect(err?.errors["shortBio"]).toBeDefined();
    expect(err?.errors["awards.0.awardingBody"]).toBeDefined();
    expect(err?.errors["awards.0.year"]).toBeDefined();
  });

  it("caps gallery + award photos at 5", async () => {
    const photo = { publicId: "p", url: "https://res.cloudinary.com/x/p.jpg" };
    const doc = new DoctorProfile({
      firstName: "Amit",
      lastName: "Shah",
      gallery: Array.from({ length: 4 }, () => ({ ...photo, caption: "Clinic" })),
      awards: [
        { title: "Gold medal", awardingBody: "BJ Medical College", year: 2008, photo },
        { title: "Fellowship", awardingBody: "IAP", year: 2015, photo },
      ],
    });
    await expect(doc.validate()).rejects.toThrow(/At most 5 photos/);
  });

  it("has no review / rating / testimonial fields", () => {
    const paths = Object.keys(DoctorProfile.schema.paths).join(" ").toLowerCase();
    expect(paths).not.toMatch(/review(?!ed)|rating|testimonial|success/);
  });
});
