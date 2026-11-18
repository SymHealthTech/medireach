import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import type { Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { countFoundingCustomers, nextFoundingNumber } from "@/lib/founding";
import { migrateV2 } from "@/lib/migrations/v2";
import { seedMasters } from "@/lib/seed/masters";
import { City } from "@/models/City";
import { Counter } from "@/models/Counter";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

let mongod: MongoMemoryServer;
const db = () => mongoose.connection.db as unknown as Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "medireach_establishments_test" });
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const photo = { publicId: "p", url: "https://res.cloudinary.com/x/p.jpg", caption: "Reception" };

describe("Establishment", () => {
  beforeEach(async () => {
    await Establishment.deleteMany({});
  });

  it("saves an incomplete draft with defaults", async () => {
    const e = await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree Skin Clinic" });
    expect(e).toMatchObject({ status: "draft", themeKey: "general-opd", siteTemplateId: "classic", renewalStatus: "active", founding: false });
  });

  it("limits a hospital to 10 beds, and bed types to the total", async () => {
    const tooMany = new Establishment({ kind: "hospital", plan: "hospital", name: "H", beds: { total: 11, types: [] } });
    expect(tooMany.validateSync()?.errors["beds.total"]).toBeDefined();

    const mismatch = new Establishment({ kind: "hospital", plan: "hospital", name: "H", beds: { total: 6, types: [{ type: "General", count: 4 }, { type: "ICU", count: 3 }] } });
    await expect(mismatch.validate()).rejects.toThrow(/add up to 7/);
  });

  it("caps the gallery at 8 photos for clinics and 12 for hospitals", async () => {
    const clinic = new Establishment({ kind: "clinic", plan: "clinic", name: "C", gallery: Array.from({ length: 9 }, () => photo) });
    await expect(clinic.validate()).rejects.toThrow(/At most 8 photos/);
    const hospital = new Establishment({ kind: "hospital", plan: "hospital", name: "H", gallery: Array.from({ length: 12 }, () => photo) });
    await expect(hospital.validate()).resolves.toBeUndefined();
  });

  it("rejects unknown themes and keeps slugs unique per city", async () => {
    expect(new Establishment({ kind: "clinic", plan: "clinic", name: "C", themeKey: "neon" }).validateSync()?.errors["themeKey"]).toBeDefined();
    await Establishment.create({ kind: "clinic", plan: "clinic", name: "A", citySlug: "pune", slug: "shree-skin-clinic-baner" });
    await expect(Establishment.create({ kind: "clinic", plan: "clinic", name: "B", citySlug: "pune", slug: "shree-skin-clinic-baner" })).rejects.toThrow(/duplicate key/);
  });

  it("lets one owner email own several sites", async () => {
    await Establishment.create({ kind: "clinic", plan: "clinic", name: "A", ownerEmail: "owner@example.com" });
    await Establishment.create({ kind: "hospital", plan: "hospital", name: "B", ownerEmail: "owner@example.com" });
    expect(await Establishment.countDocuments({ ownerEmail: "owner@example.com" })).toBe(2);
  });

  it("has no review / rating / testimonial / before-after fields", () => {
    const paths = Object.keys(Establishment.schema.paths).join(" ").toLowerCase();
    expect(paths).not.toMatch(/review(?!ed)|rating|testimonial|success|before|after/);
  });
});

describe("founding numbers", () => {
  beforeEach(async () => {
    await Promise.all([DoctorProfile.deleteMany({}), Establishment.deleteMany({}), Counter.deleteMany({})]);
  });

  it("continues from the highest existing number, across doctors and establishments", async () => {
    await DoctorProfile.create({ firstName: "A", lastName: "B", founding: true, foundingNumber: 3 });
    await Establishment.create({ kind: "clinic", plan: "clinic", name: "C", founding: true, foundingNumber: 7 });
    expect(await nextFoundingNumber()).toBe(8);
    expect(await nextFoundingNumber()).toBe(9);
  });

  it("hands out unique numbers under concurrency", async () => {
    const numbers = await Promise.all(Array.from({ length: 10 }, () => nextFoundingNumber()));
    expect(new Set(numbers).size).toBe(10);
    expect(Math.max(...numbers)).toBe(10);
  });

  it("counts founding customers across all products (and unmigrated doctors)", async () => {
    await DoctorProfile.create({ firstName: "A", lastName: "B", founding: true });
    await DoctorProfile.create({ firstName: "C", lastName: "D", foundingDoctor: true });
    await DoctorProfile.create({ firstName: "E", lastName: "F" });
    await Establishment.create({ kind: "hospital", plan: "hospital", name: "H", founding: true });
    expect(await countFoundingCustomers()).toBe(3);
  });
});

describe("migrate:v2", () => {
  const now = new Date("2026-11-17T00:00:00Z");

  beforeEach(async () => {
    await Promise.all([
      DoctorProfile.deleteMany({}),
      Establishment.deleteMany({}),
      Payment.deleteMany({}),
      db().collection("hospitals").deleteMany({}),
    ]);
  });

  async function legacyData() {
    const pune = await City.findOne({ slug: "pune" }).lean();
    const hospitalId = new Types.ObjectId();
    await db().collection("hospitals").insertOne({ _id: hospitalId, name: "Old Hospital", cityId: pune!._id, address: "1 Road", phone: "919800000000", pricePerDoctor: 1200 });
    const docs = db().collection("doctorprofiles");
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    await docs.insertMany([
      { _id: a, firstName: "A", lastName: "Visiting", status: "published", plan: "consultant", foundingDoctor: false, hostingFreeUntil: new Date("2028-06-01"), hospitalAccountId: hospitalId, clinics: [{ name: "Old Hospital", hospitalId }] },
      { _id: b, firstName: "B", lastName: "Founding", status: "published", plan: "gp", foundingDoctor: true, foundingNumber: 1, hostingFreeUntil: null, clinics: [] },
    ]);
    await db().collection("payments").insertMany([
      { doctorId: a, amount: 2999, purpose: "setup", mode: "upi", date: new Date("2026-11-01") },
      { doctorId: b, amount: 1999, purpose: "setup", mode: "cash", date: new Date("2025-10-20") },
      { hospitalId, amount: 12000, purpose: "hospital_bulk", mode: "bank", date: new Date("2026-11-02") },
    ]);
    return { hospitalId, a, b };
  }

  it("writes nothing in a dry run", async () => {
    await legacyData();
    const report = await migrateV2(db(), { apply: false, now });
    expect(report.changes.length).toBeGreaterThan(0);
    expect(await Establishment.countDocuments()).toBe(0);
    expect(await db().collection("doctorprofiles").countDocuments({ plan: "doctor" })).toBe(0);
  });

  it("maps plans, founding, renewals, links and payments, then is idempotent", async () => {
    const { hospitalId, a, b } = await legacyData();
    const report = await migrateV2(db(), { apply: true, now });
    expect(report.warnings.join("\n")).toMatch(/free hosting forever/);

    const est = await Establishment.findById(hospitalId).lean();
    expect(est).toMatchObject({ kind: "hospital", status: "draft", plan: "hospital", name: "Old Hospital", themeKey: "small-hospital", renewalPrice: 1499 });
    expect(est!.doctors.map((d) => String(d.doctorProfileId))).toEqual([String(a)]);
    expect(est!.categoryId).toBeDefined();
    // The migrated draft is a valid Establishment document.
    await expect(Establishment.hydrate(est!).validate()).resolves.toBeUndefined();

    const da = await DoctorProfile.findById(a).lean();
    expect(da).toMatchObject({ plan: "doctor", founding: false, renewalPrice: 999, renewalStatus: "active" });
    expect(da!.setupPaidAt).toEqual(new Date("2026-11-01"));
    expect(da!.renewalDueDate).toEqual(new Date("2028-06-01")); // longer free-hosting promise kept
    expect(da!.establishmentIds.map(String)).toEqual([String(hospitalId)]);
    expect(String(da!.clinics[0]!.establishmentId)).toBe(String(hospitalId));

    const db_ = await DoctorProfile.findById(b).lean();
    expect(db_).toMatchObject({ plan: "doctor", founding: true, renewalPrice: 499, renewalStatus: "overdue" });
    expect(db_!.renewalDueDate).toEqual(new Date("2026-10-20"));

    const pay = await Payment.findOne({ establishmentId: hospitalId }).lean();
    expect(pay?.purpose).toBe("doctor_addon");

    const again = await migrateV2(db(), { apply: true, now });
    expect(again.changes).toEqual([]);
  });

  it("drops legacy fields only when asked", async () => {
    const { a } = await legacyData();
    await migrateV2(db(), { apply: true, now });
    expect(await db().collection("doctorprofiles").findOne({ _id: a })).toHaveProperty("hospitalAccountId");

    await migrateV2(db(), { apply: true, dropLegacy: true, now });
    const raw = await db().collection("doctorprofiles").findOne({ _id: a });
    expect(raw).not.toHaveProperty("hospitalAccountId");
    expect(raw).not.toHaveProperty("foundingDoctor");
    expect(raw!.clinics[0]).not.toHaveProperty("hospitalId");
    expect(raw!.clinics[0]).toHaveProperty("establishmentId");
    expect((await migrateV2(db(), { apply: true, dropLegacy: true, now })).changes).toEqual([]);
  });
});
