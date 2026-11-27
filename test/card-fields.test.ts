import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { removeOldCardFields } from "@/lib/migrations/card-fields";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake } from "@/models/Intake";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "medireach_card_fields_test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("removeOldCardFields", () => {
  it("removes the retired card fields only, leaves dates alone, and is safe to re-run", async () => {
    const edited = new Date("2026-11-01T00:00:00.000Z");
    // Documents as older versions saved them (raw inserts: the models no longer know these fields).
    const d1 = await DoctorProfile.collection.insertOne({ firstName: "A", lastName: "B", portfolioTemplateId: "t2", cardTemplateId: "t2", cardStyle: "DOC-AMBER", updatedAt: edited });
    const d2 = await DoctorProfile.collection.insertOne({ firstName: "C", lastName: "D", portfolioTemplateId: "classic" });
    const e1 = await Establishment.collection.insertOne({ name: "X Clinic", kind: "clinic", siteTemplateId: "classic", themeKey: "dental", cardTemplateId: "classic", cardStyle: "CLN-OCEAN" });
    const i1 = await Intake.collection.insertOne({ kind: "doctor", data: { fullName: "Asha", websiteDesign: "t3", cardStyle: "DOC-PLUM" } });

    expect(await removeOldCardFields()).toEqual({ doctors: 1, establishments: 1, intakes: 1 });

    const doc = await DoctorProfile.collection.findOne({ _id: d1.insertedId });
    expect(doc).not.toHaveProperty("cardTemplateId");
    expect(doc).not.toHaveProperty("cardStyle");
    expect(doc).toMatchObject({ portfolioTemplateId: "t2", updatedAt: edited }); // the website design and date stay
    expect(await DoctorProfile.collection.findOne({ _id: d2.insertedId })).toMatchObject({ portfolioTemplateId: "classic" });
    const site = await Establishment.collection.findOne({ _id: e1.insertedId });
    expect(site).not.toHaveProperty("cardStyle");
    expect(site).toMatchObject({ themeKey: "dental", siteTemplateId: "classic" });
    expect((await Intake.collection.findOne({ _id: i1.insertedId }))!.data).toEqual({ fullName: "Asha", websiteDesign: "t3" });

    expect(await removeOldCardFields()).toEqual({ doctors: 0, establishments: 0, intakes: 0 });
  });
});
