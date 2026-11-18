import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { DEFAULT_PRICES, PRICE_KEYS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { Setting, SETTINGS_KEY } from "@/models/Setting";
import { PRICING } from "@/content/marketing";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_settings_test";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const raw = () => mongoose.connection.db!.collection("settings");

describe("getSettings", () => {
  beforeEach(async () => {
    await raw().deleteMany({});
  });

  it("returns every v2 price with defaults when nothing is saved", async () => {
    const s = await getSettings();
    expect(s.prices).toEqual(DEFAULT_PRICES);
    expect(s.renewalGraceDays).toBe(30);
  });

  it("falls back to the saved v1 GP and update prices until migrate:v2 runs", async () => {
    await raw().insertOne({ key: SETTINGS_KEY, prices: { gp: 2199, consultant: 3299, update: 349 } });
    const s = await getSettings();
    expect(s.prices.doctorSetup).toBe(2199);
    expect(s.prices.updatePrice).toBe(349);
    expect(s.prices.clinicSetup).toBe(DEFAULT_PRICES.clinicSetup); // consultant price is not carried over
    expect(s.prices).not.toHaveProperty("gp");
  });

  it("prefers saved v2 prices, and a dotted save keeps the other keys", async () => {
    await raw().insertOne({ key: SETTINGS_KEY, prices: { ...DEFAULT_PRICES, gp: 2199 } });
    // Same shape of update the Settings action sends.
    await Setting.updateOne({ key: SETTINGS_KEY }, { $set: { "prices.clinicSetup": 3499, renewalGraceDays: 15 } });
    const s = await getSettings();
    expect(s.prices).toMatchObject({ clinicSetup: 3499, doctorSetup: DEFAULT_PRICES.doctorSetup, hospitalSetup: DEFAULT_PRICES.hospitalSetup });
    expect(s.renewalGraceDays).toBe(15);
  });
});

describe("pricing content", () => {
  it("shows the three products, each pointing at real Settings price keys", () => {
    expect(PRICING.plans.map((p) => p.key)).toEqual(["doctor", "clinic", "hospital"]);
    for (const p of PRICING.plans) {
      expect(PRICE_KEYS).toContain(p.setup);
      expect(PRICE_KEYS).toContain(p.renewal);
      expect(p.features.some((f) => /visiting card/i.test(f)), p.key).toBe(true);
    }
  });

  it("never writes a price into the copy", () => {
    const text = JSON.stringify(PRICING);
    expect(text).not.toMatch(/₹\s?\d/);
  });
});
