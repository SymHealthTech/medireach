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
    requireDoctor: async () => {
      const c = current as { doctor?: unknown } | null;
      if (!c?.doctor) throw new real.DoctorAuthError();
      return { ...c, id: String((c.doctor as { _id: unknown })._id) };
    },
  };
});

const { connectToDatabase } = await import("@/lib/db");
const { loginOwnerFor, sendLoginLink } = await import("@/lib/auth/login-link");
const { saveMySiteSectionAction } = await import("@/app/account/actions");
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

describe("owners update their whole site from /account", () => {
  const timings = (extra: Record<string, unknown> = {}) => ({ is24x7: false, timings: [{ day: 3, slots: [{ open: "17:00", close: "20:30" }] }, { day: 4, slots: [] }], appointmentNote: "Walk-ins welcome", ...extra });

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
    expect(await saveMySiteSectionAction({ id: ids.zClinic, step: "timings", data: timings() })).toMatchObject({ ok: false, error: expect.stringMatching(/log in/) });
  });

  it("saves a section of the owner's own site and logs who changed what", async () => {
    await signInAs("owner@example.com");
    const res = await saveMySiteSectionAction({ id: ids.zClinic, step: "timings", data: timings() });
    expect(res.ok).toBe(true);
    const doc = (await Establishment.findById(ids.zClinic).lean())!;
    expect(doc.timings).toEqual([expect.objectContaining({ day: 3 })]);
    expect(doc.appointmentNote).toBe("Walk-ins welcome");
    const log = await AuditLog.findOne({ action: "clinic.self_edit.timings" }).lean();
    expect(log?.actor.role).toBe("owner");
  });

  it("can't touch the page address, business or publishing", async () => {
    await signInAs("owner@example.com");
    for (const step of ["seo", "business", "publish"]) {
      expect((await saveMySiteSectionAction({ id: ids.zClinic, step, data: {} })).ok).toBe(false);
    }
  });

  it("never edits a site that belongs to another email", async () => {
    await signInAs("owner@example.com");
    const res = await saveMySiteSectionAction({ id: ids.other, step: "timings", data: timings() });
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/can't edit that site/) });
  });

  it("rejects wording the NMC guidelines don't allow", async () => {
    await signInAs("owner@example.com");
    const res = await saveMySiteSectionAction({ id: ids.zClinic, step: "timings", data: timings({ appointmentNote: "Best clinic in Pune" }) });
    expect(res.ok).toBe(false);
  });

  it("saves a published site with older gaps it didn't cause, and refreshes the live page", async () => {
    await Establishment.updateOne({ _id: ids.zClinic }, { $set: { status: "published", citySlug: "pune", slug: "zed-sample-clinic" } });
    await signInAs("owner@example.com");
    revalidatePath.mockClear();
    const res = await saveMySiteSectionAction({ id: ids.zClinic, step: "timings", data: timings({ appointmentNote: "Please call before visiting" }) });
    expect(res.ok).toBe(true);
    expect((await Establishment.findById(ids.zClinic).lean())!.appointmentNote).toBe("Please call before visiting");
    expect(revalidatePath).toHaveBeenCalledWith("/pune/clinic/zed-sample-clinic");
  });
});

describe("website UIDs", () => {
  it("gives every website a permanent UID per product, which owners can't change", async () => {
    const { backfillUids, normalizeUid, UID_RE } = await import("@/lib/uid");
    const fresh = await Establishment.create(site({ name: "New Sample Clinic", ownerEmail: "owner@example.com" }));
    expect(fresh.uid).toMatch(/^MRC-\d{6}$/);
    await backfillUids();
    const doctor = (await DoctorProfile.findOne({ ownerEmail: "asha@example.com" }).lean())!;
    const hospital = (await Establishment.findById(ids.aHospital).lean())!;
    expect(doctor.uid).toMatch(/^MRD-\d{6}$/);
    expect(hospital.uid).toMatch(/^MRH-\d{6}$/);
    expect(UID_RE.test(doctor.uid!)).toBe(true);
    expect(normalizeUid(" mrd 100001 ")).toBe("MRD-100001");
    // Immutable: a later save can't change it.
    const doc = (await Establishment.findById(ids.aHospital))!;
    doc.set({ uid: "MRH-999999" });
    await doc.save();
    expect((await Establishment.findById(ids.aHospital).lean())!.uid).toBe(hospital.uid);
    // A doctor saving their own page keeps their UID.
    const me = await DoctorProfile.findOne({ ownerEmail: "asha@example.com" });
    current = { email: "asha@example.com", name: "Dr. Asha Sample", doctor: me, sites: [] };
    const { saveMyDoctorSectionAction } = await import("@/app/account/actions");
    const res = await saveMyDoctorSectionAction({
      step: "basics",
      data: { title: "Dr.", firstName: "Asha", middleName: "", lastName: "Sample", displayName: "", gender: "", languages: ["English"], practiceSinceYear: 2015 },
    });
    expect(res.ok).toBe(true);
    const after = (await DoctorProfile.findById(me!._id).lean())!;
    expect(after.uid).toBe(doctor.uid);
    expect(after.languages).toEqual(["English"]);
    // Team-only sections are refused.
    expect((await saveMyDoctorSectionAction({ step: "seo", data: {} })).ok).toBe(false);
  });
});
