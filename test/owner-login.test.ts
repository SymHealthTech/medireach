import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath }));

// The signed-in account for the action tests (the real one reads the NextAuth session).
let current: unknown = null;
vi.mock("@/lib/auth/doctor", async (load) => {
  const real = await load<typeof import("@/lib/auth/doctor")>();
  return {
    ...real,
    requireAccount: async () => {
      if (!current) throw new real.DoctorAuthError();
      return current;
    },
  };
});

const { connectToDatabase } = await import("@/lib/db");
const { loginOwnerFor, sendLoginLink } = await import("@/lib/auth/login-link");
const { ownerSiteSchema, ownerSiteTextFields } = await import("@/lib/establishments/owner");
const { scanFields } = await import("@/lib/compliance/scan");
const { saveSiteAccountAction } = await import("@/app/account/actions");
const { AuditLog } = await import("@/models/AuditLog");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");

let mongod: MongoMemoryServer;
const ids = {} as { zClinic: string; aHospital: string; ashaClinic: string; other: string };

const site = (extra: Record<string, unknown>) => ({
  plan: "clinic",
  kind: "clinic",
  themeKey: "general-opd",
  status: "draft",
  address: { line1: "1 Sample Road", pincode: "411045" },
  contact: { phones: ["9800000101"] },
  timings: [{ day: 1, slots: [{ open: "10:00", close: "13:00" }] }],
  ...extra,
});

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_owner_login_test";
  await connectToDatabase();
  await DoctorProfile.create({ firstName: "Asha", lastName: "Sample", ownerEmail: "asha@example.com" });
  ids.zClinic = String((await Establishment.create(site({ name: "Zed Sample Clinic", ownerEmail: "owner@example.com" })))._id);
  ids.aHospital = String((await Establishment.create(site({ kind: "hospital", plan: "hospital", themeKey: "small-hospital", name: "Able Sample Hospital", ownerEmail: "owner@example.com" })))._id);
  ids.ashaClinic = String((await Establishment.create(site({ name: "Asha Sample Clinic", ownerEmail: "asha@example.com" })))._id);
  ids.other = String((await Establishment.create(site({ name: "Other Sample Clinic", ownerEmail: "someone-else@example.com" })))._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("who can log in", () => {
  it("accepts doctors, site owners and people who are both; nobody else", async () => {
    expect(await loginOwnerFor("  OWNER@example.com ")).toEqual({ name: "Able Sample Hospital", siteIds: [ids.aHospital, ids.zClinic] });
    const both = await loginOwnerFor("asha@example.com");
    expect(both).toMatchObject({ name: "Dr. Asha Sample", siteIds: [ids.ashaClinic] });
    expect(both?.doctorId).toBeTruthy();
    expect(await loginOwnerFor("nobody@example.com")).toBeNull();
  });

  it("sends a login link to a site-only owner, and nothing to unknown emails", async () => {
    expect(await sendLoginLink("owner@example.com")).toMatchObject({ url: expect.stringContaining("/login/verify?token=") });
    expect(await sendLoginLink("nobody@example.com")).toBeNull();
  });
});

describe("what owners may change", () => {
  const valid = {
    id: "a".repeat(24),
    address: { line1: "2 Sample Road", line2: "", pincode: "411045", landmark: "", parkingNote: "" },
    mapsUrl: "",
    phones: ["98000 00102", ""],
    whatsapp: "",
    emergencyPhone: "",
    is24x7: false,
    timings: [{ day: 2, slots: [{ open: "09:00", close: "12:00" }] }],
    appointmentNote: "",
    visitingHours: "",
  };

  it("needs a phone, an address and timings (or 24×7)", () => {
    expect(ownerSiteSchema.safeParse(valid).success).toBe(true);
    expect(ownerSiteSchema.safeParse({ ...valid, phones: [""] }).success).toBe(false);
    expect(ownerSiteSchema.safeParse({ ...valid, timings: [] }).success).toBe(false);
    expect(ownerSiteSchema.safeParse({ ...valid, timings: [], is24x7: true }).success).toBe(true);
    expect(ownerSiteSchema.safeParse({ ...valid, address: { ...valid.address, pincode: "4110" } }).success).toBe(false);
  });

  it("scans the free text for NMC-banned wording", () => {
    const input = ownerSiteSchema.parse({ ...valid, appointmentNote: "Best clinic in Pune" });
    expect(scanFields(ownerSiteTextFields(input)).map((i) => i.field)).toEqual(["appointmentNote"]);
  });
});

describe("saving a site from /account", () => {
  const payload = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    address: { line1: "3 New Road", line2: "", pincode: "411045", landmark: "Near the bus stop", parkingNote: "" },
    mapsUrl: "",
    phones: ["9800000199"],
    whatsapp: "",
    emergencyPhone: "9800000911",
    is24x7: false,
    timings: [{ day: 3, slots: [{ open: "17:00", close: "20:30" }] }, { day: 4, slots: [] }],
    appointmentNote: "Walk-ins welcome",
    visitingHours: "11 am – 1 pm",
    ...extra,
  });

  async function signInAs(email: string) {
    current = {
      email,
      name: "Owner",
      doctor: await DoctorProfile.findOne({ ownerEmail: email }),
      sites: await Establishment.find({ ownerEmail: email }).sort({ name: 1 }),
    };
  }

  it("refuses without a login", async () => {
    current = null;
    expect(await saveSiteAccountAction(payload(ids.zClinic))).toMatchObject({ ok: false, error: expect.stringMatching(/log in/) });
  });

  it("saves the owner's own site and logs who changed what", async () => {
    await signInAs("owner@example.com");
    const res = await saveSiteAccountAction(payload(ids.zClinic));
    expect(res.ok).toBe(true);
    const doc = (await Establishment.findById(ids.zClinic).lean())!;
    expect(doc.address.line1).toBe("3 New Road");
    expect(doc.address.landmark).toBe("Near the bus stop");
    expect(doc.contact.phones).toEqual(["9800000199"]);
    expect(doc.timings).toEqual([expect.objectContaining({ day: 3 })]); // empty days dropped
    expect(doc.visitingHours).toBeUndefined(); // hospital-only field, ignored for a clinic
    const log = await AuditLog.findOne({ action: "clinic.self_edit" }).lean();
    expect(log?.actor.role).toBe("owner");
    expect(Object.keys(log?.diff ?? {})).toEqual(expect.arrayContaining(["address", "phones", "timings"]));
  });

  it("lets a hospital owner set visiting hours and the emergency number", async () => {
    await signInAs("owner@example.com");
    expect((await saveSiteAccountAction(payload(ids.aHospital))).ok).toBe(true);
    const doc = (await Establishment.findById(ids.aHospital).lean())!;
    expect(doc.visitingHours).toBe("11 am – 1 pm");
    expect(doc.contact.emergencyPhone).toBe("9800000911");
  });

  it("never edits a site that belongs to another email", async () => {
    await signInAs("owner@example.com");
    const res = await saveSiteAccountAction(payload(ids.other));
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/can't edit that site/) });
    expect((await Establishment.findById(ids.other).lean())!.address.line1).toBe("1 Sample Road");
  });

  it("rejects wording the NMC guidelines don't allow", async () => {
    await signInAs("owner@example.com");
    const res = await saveSiteAccountAction(payload(ids.zClinic, { appointmentNote: "Best clinic in Pune" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.appointmentNote).toMatch(/Not allowed/);
  });

  it("saves a published site with older gaps it didn't cause, and refreshes the live page", async () => {
    // Published but incomplete (no city, area, category or owner approval): the team's to fix,
    // so they don't block the owner's timings or phone changes.
    await Establishment.updateOne({ _id: ids.zClinic }, { $set: { status: "published", citySlug: "pune", slug: "zed-sample-clinic" } });
    await signInAs("owner@example.com");
    revalidatePath.mockClear();
    const res = await saveSiteAccountAction(payload(ids.zClinic, { appointmentNote: "Please call before visiting" }));
    expect(res.ok).toBe(true);
    expect((await Establishment.findById(ids.zClinic).lean())!.appointmentNote).toBe("Please call before visiting");
    expect(revalidatePath).toHaveBeenCalledWith("/pune/clinic/zed-sample-clinic");
  });
});
