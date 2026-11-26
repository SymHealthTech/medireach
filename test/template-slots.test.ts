import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedMasters } from "@/lib/seed/masters";
import { syncTemplateSlots } from "@/lib/seed/template-slots";
import { TemplateSlot } from "@/models/TemplateSlot";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "medireach_template_slots_test" });
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const slot = (type: string, key: string) => TemplateSlot.findOne({ type, key }).lean();

describe("syncTemplateSlots", () => {
  it("renames old default names, keeps custom ones, marks built designs ready and is safe to re-run", async () => {
    // An older database: old names, built designs still "coming soon", one name changed by an admin.
    await TemplateSlot.updateOne({ type: "portfolio", key: "classic" }, { $set: { name: "Classic" } });
    await TemplateSlot.updateOne({ type: "portfolio", key: "t3" }, { $set: { name: "Minimal Mono", status: "coming_soon" } });
    await TemplateSlot.updateOne({ type: "card", key: "t3" }, { $set: { name: "My card", status: "coming_soon" } });

    const changes = await syncTemplateSlots();
    expect(changes.map((c) => c.slot)).toContain("portfolio/t3");

    expect(await slot("portfolio", "classic")).toMatchObject({ name: "Serene Care", status: "ready" });
    expect(await slot("portfolio", "t3")).toMatchObject({ name: "Modern Edge", status: "ready" });
    expect(await slot("portfolio", "t2")).toMatchObject({ status: "ready" });
    expect(await slot("card", "t3")).toMatchObject({ name: "My card", status: "ready" }); // custom name kept
    expect(await slot("portfolio", "t4")).toMatchObject({ status: "coming_soon" }); // not built yet

    expect(await syncTemplateSlots()).toEqual([]);
  });
});
