import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { affectsRenewal, applyPaymentToRenewal } from "@/lib/payments/apply";
import { listRenewalPrice, renewalReminderText } from "@/lib/renewals";
import { DEFAULT_PRICES } from "@/lib/constants";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_payments_test";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const day = (s: string) => new Date(`${s}T12:00:00+05:30`);
const ymd = (d?: Date | null) => d?.toISOString().slice(0, 10);

describe("payments and renewals", () => {
  it("setup starts the renewal one year later and fills the list price", async () => {
    const d = await DoctorProfile.create({ firstName: "Asha", lastName: "Kale" });
    const change = await applyPaymentToRenewal({ doctorId: d._id, purpose: "setup", date: day("2026-11-10") });
    const after = (await DoctorProfile.findById(d._id).lean())!;
    expect(ymd(after.setupPaidAt)).toBe("2026-11-10");
    expect(ymd(after.renewalDueDate)).toBe("2027-11-10");
    expect(after.renewalPrice).toBe(DEFAULT_PRICES.renewalDoctor);
    expect(change?.restored).toBe(false);
  });

  it("renewal moves the due date on a year from the due date, not the payment date", async () => {
    const d = await DoctorProfile.create({ firstName: "Ravi", lastName: "Pawar", renewalDueDate: day("2026-12-01"), renewalPrice: 799 });
    await applyPaymentToRenewal({ doctorId: d._id, purpose: "renewal", date: day("2026-11-20") });
    const after = (await DoctorProfile.findById(d._id).lean())!;
    expect(ymd(after.renewalDueDate)).toBe("2027-12-01");
    expect(after.renewalPrice).toBe(799); // an existing price is kept
  });

  it("renewal brings a lapsed site back", async () => {
    const d = await DoctorProfile.create({ firstName: "Om", lastName: "Joshi", renewalDueDate: day("2025-06-01"), renewalStatus: "lapsed" });
    const change = await applyPaymentToRenewal({ doctorId: d._id, purpose: "renewal", date: day("2026-11-17") });
    expect(change?.restored).toBe(true);
    const after = (await DoctorProfile.findById(d._id).lean())!;
    expect(ymd(after.renewalDueDate)).toBe("2026-06-01");
    expect(after.renewalStatus).toBe("overdue"); // still a year behind, but live again
  });

  it("prices clinic and hospital renewals by product and founding", async () => {
    const h = await Establishment.create({ kind: "hospital", plan: "hospital", name: "Sai Hospital", founding: true });
    await applyPaymentToRenewal({ establishmentId: h._id, purpose: "setup", date: day("2026-11-01") });
    expect((await Establishment.findById(h._id).lean())!.renewalPrice).toBe(DEFAULT_PRICES.foundingRenewalHospital);

    const c = await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree Clinic" });
    await applyPaymentToRenewal({ establishmentId: c._id, purpose: "setup", date: day("2026-11-01") });
    expect((await Establishment.findById(c._id).lean())!.renewalPrice).toBe(DEFAULT_PRICES.renewalClinic);
  });

  it("leaves renewals alone for updates and domains", async () => {
    expect(affectsRenewal("update")).toBe(false);
    expect(affectsRenewal("domain")).toBe(false);
    expect(affectsRenewal("doctor_addon")).toBe(true);
    const d = await DoctorProfile.create({ firstName: "Neha", lastName: "Rao" });
    expect(await applyPaymentToRenewal({ doctorId: d._id, purpose: "update", date: day("2026-11-01") })).toBeNull();
    expect((await DoctorProfile.findById(d._id).lean())!.renewalDueDate).toBeUndefined();
  });

  it("list prices follow the founding offer", () => {
    expect(listRenewalPrice("doctor", true, DEFAULT_PRICES)).toBe(499);
    expect(listRenewalPrice("clinic", true, DEFAULT_PRICES)).toBe(499);
    expect(listRenewalPrice("hospital", true, DEFAULT_PRICES)).toBe(999);
    expect(listRenewalPrice("hospital", false, DEFAULT_PRICES)).toBe(1499);
  });

  it("writes a plain reminder that says due or was due", () => {
    const now = new Date("2026-11-17T06:00:00Z");
    const soon = renewalReminderText({ name: "Dr. Asha Kale", product: "doctor", due: new Date("2026-12-01T06:00:00Z"), price: 999, link: "https://asha.medireach.co.in", now });
    expect(soon).toContain("is due on 1 December 2026: ₹999");
    expect(soon).toContain("https://asha.medireach.co.in");
    const late = renewalReminderText({ name: "Sai Hospital", product: "hospital", due: new Date("2026-11-01T06:00:00Z"), price: 1499, now });
    expect(late).toContain("was due on 1 November 2026");
    expect(late).toContain("hospital website");
    expect(late).not.toContain("!");
  });
});
