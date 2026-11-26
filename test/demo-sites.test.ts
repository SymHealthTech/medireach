import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { seedMasters } from "@/lib/seed/masters";
import { seedDemoSites } from "@/lib/seed/demo-sites";
import { backfillUids } from "@/lib/uid";
import { Establishment } from "@/models/Establishment";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: "medireach_demo_sites_test" });
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("seedDemoSites", () => {
  it("publishes every sample clinic and hospital once, noindex, with hospital departments linked to its doctors", async () => {
    const first = await seedDemoSites();
    await seedDemoSites(); // re-run updates in place
    await backfillUids();

    const all = await Establishment.find().lean();
    expect(all).toHaveLength(Object.keys(SAMPLE_SITES).length);
    expect(first.length).toBe(all.length);
    for (const e of all) {
      expect(e.status).toBe("published");
      expect(e.seo.noindex).toBe(true);
      expect(e.uid).toMatch(e.kind === "hospital" ? /^MRH-/ : /^MRC-/);
      expect(e.categoryId).toBeTruthy();
    }

    const hospital = all.find((e) => e.kind === "hospital")!;
    expect(hospital.is24x7).toBe(true);
    expect(hospital.beds?.total).toBe(10);
    for (const dep of hospital.departments) expect(dep.doctorKeys?.length).toBe(1);
    expect(first.find((s) => s.kind === "hospital")!.url).toMatch(/^\/pune\/hospital\//);
  });
});
