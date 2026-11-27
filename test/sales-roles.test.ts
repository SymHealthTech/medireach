import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Super admin + sales executives: staff-ID users, ownership of websites,
 * review-only for sales, the payment check before publishing, and the owner's
 * code before a sales executive can change a live website.
 */

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: () => { throw new Error("REDIRECT"); } }));

type Sent = { to: string; subject: string; text: string; html: string };
const sent: Sent[] = [];
vi.mock("@/lib/integrations/email", () => ({
  sendEmail: async (m: Sent) => {
    sent.push(m);
    return { ok: true };
  },
}));

type Who = { id: string; name: string; email: string; role: "superadmin" | "sales"; staffId?: string };
const SUPER: Who = { id: "000000000000000000000001", name: "Satish", email: "owner@example.com", role: "superadmin" };
const as = { current: SUPER };
vi.mock("@/lib/auth/admin", async (load) => {
  const real = await load<typeof import("@/lib/auth/admin")>();
  return {
    ...real,
    requireAdmin: async (roles: readonly string[] = ["superadmin", "sales"]) => {
      if (!roles.includes(as.current.role)) throw new real.ForbiddenError();
      return as.current;
    },
  };
});

const { connectToDatabase } = await import("@/lib/db");
const { seedMasters } = await import("@/lib/seed/masters");
const { seedSampleDoctors } = await import("@/lib/seed/samples");
const { emptyDoctorForm, sectionPayload } = await import("@/lib/doctors/form");
const doctors = await import("@/app/admin/(dash)/doctors/actions");
const settings = await import("@/app/admin/(dash)/settings/actions");
const unlock = await import("@/app/admin/(dash)/edit-unlock-actions");
const { migrateDashboardRoles } = await import("@/lib/admin/migrate-roles");
const { UNPAID_FIELD } = await import("@/lib/constants");
const { Admin } = await import("@/models/Admin");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Payment } = await import("@/models/Payment");

let mongod: MongoMemoryServer;
let asha: Who;
let ravi: Who;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_sales_roles_test";
  await connectToDatabase();
  await seedMasters();
  await seedSampleDoctors();
  // An old-style unique email index, as on existing databases: two sales users without email must still work.
  await Admin.init();
  await Admin.collection.dropIndex("email_1");
  await Admin.collection.createIndex({ email: 1 }, { unique: true });
  await Admin.create({ _id: new Types.ObjectId(SUPER.id), name: SUPER.name, email: SUPER.email, role: "superadmin", passwordHash: "x" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  sent.length = 0;
  as.current = SUPER;
});

async function newDraft(first: string) {
  const f = emptyDoctorForm();
  f.firstName = first;
  f.lastName = "Test";
  const res = await doctors.saveDoctorSectionAction({ step: "basics", data: sectionPayload("basics", f) });
  if (!res.ok) throw new Error(res.error);
  return res.data.id;
}

describe("dashboard users", () => {
  it("super admin adds sales executives with staff IDs (no email needed) and a super admin needs an email", async () => {
    const a = await settings.createAdminUserAction({ name: "Asha Patil", email: "", mobile: "98765 43210", role: "sales", password: "a-long-password-1" });
    const r = await settings.createAdminUserAction({ name: "Ravi Kale", email: "", mobile: "", role: "sales", password: "a-long-password-2" });
    expect(a.ok && a.data.loginId).toBe("MRS-1001");
    expect(r.ok && r.data.loginId).toBe("MRS-1002");
    const noEmail = await settings.createAdminUserAction({ name: "Boss", email: "", mobile: "", role: "superadmin", password: "a-long-password-3" });
    expect(noEmail.ok).toBe(false);
    asha = { id: a.ok ? a.data.id : "", name: "Asha Patil", email: "", role: "sales", staffId: "MRS-1001" };
    ravi = { id: r.ok ? r.data.id : "", name: "Ravi Kale", email: "", role: "sales", staffId: "MRS-1002" };
    expect((await Admin.findById(asha.id).lean())!.mobile).toBe("9876543210");
  });

  it("sales executives can't manage users or reset passwords", async () => {
    as.current = asha;
    expect((await settings.resetAdminPasswordAction({ id: asha.id, password: "my-own-new-password" })).ok).toBe(false);
    expect((await settings.createAdminUserAction({ name: "X", email: "", mobile: "", role: "sales", password: "a-long-password-9" })).ok).toBe(false);
  });
});

describe("sales executive: own work, up to review", () => {
  let mine: string;

  it("a new doctor belongs to the sales executive who made it", async () => {
    as.current = asha;
    mine = await newDraft("Meera");
    const d = await DoctorProfile.findById(mine).lean();
    expect(String(d!.salesAdminId)).toBe(asha.id);
    expect(d!.salesExecutive).toBe("Asha Patil");
    expect(d!.salesExecutiveId).toBe("MRS-1001");
  });

  it("another sales executive can't touch it", async () => {
    as.current = ravi;
    const f = emptyDoctorForm();
    f.firstName = "Hacked";
    f.lastName = "Test";
    expect((await doctors.saveDoctorSectionAction({ id: mine, step: "basics", data: sectionPayload("basics", f) })).ok).toBe(false);
    expect((await doctors.duplicateDoctorAction({ id: mine })).ok).toBe(false);
    expect((await doctors.deleteDoctorAction({ id: mine })).ok).toBe(false);
    expect((await doctors.submitForReviewAction({ id: mine })).ok).toBe(false);
  });

  it("sales can send for review but not publish, unpublish or suspend", async () => {
    as.current = asha;
    expect((await doctors.submitForReviewAction({ id: mine })).ok).toBe(true);
    expect((await doctors.publishDoctorAction({ id: mine, allowUnpaid: true })).ok).toBe(false);
    expect((await doctors.suspendDoctorAction({ id: mine })).ok).toBe(false);
    expect((await doctors.unpublishDoctorAction({ id: mine })).ok).toBe(false);
  });

  it("sales can delete their own draft, but never a website that was published", async () => {
    as.current = asha;
    const draft = await newDraft("Temp");
    expect((await doctors.deleteDoctorAction({ id: draft })).ok).toBe(true);
    const live = await DoctorProfile.findOne({ status: "published" }).lean();
    await DoctorProfile.updateOne({ _id: live!._id }, { $set: { salesAdminId: new Types.ObjectId(asha.id) } });
    const res = await doctors.deleteDoctorAction({ id: String(live!._id) });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toMatch(/super admin/);
  });

  it("super admin moves a website to another executive by picking them on the Review step", async () => {
    const d = (await DoctorProfile.findById(mine).lean())!;
    const f = { ...emptyDoctorForm(), plan: d.plan, salesExecutive: "ravi  kale", salesExecutiveId: "" };
    const res = await doctors.saveDoctorSectionAction({ id: mine, step: "business", data: sectionPayload("business", f as never) });
    expect(res.ok).toBe(true);
    const after = (await DoctorProfile.findById(mine).lean())!;
    expect(String(after.salesAdminId)).toBe(ravi.id);
    expect(after.salesExecutiveId).toBe("MRS-1002");
  });
});

describe("publishing waits for the payment", () => {
  it("asks for confirmation when no payment is recorded, then publishes", async () => {
    const d = await DoctorProfile.findOne({ status: "published" }).lean();
    const id = String(d!._id);
    await DoctorProfile.updateOne({ _id: d!._id }, { $set: { status: "review" }, $unset: { setupPaidAt: 1 } });
    await Payment.deleteMany({ doctorId: d!._id });
    const first = await doctors.publishDoctorAction({ id });
    expect(first.ok).toBe(false);
    expect(!first.ok && first.fieldErrors?.[UNPAID_FIELD]).toBeTruthy();
    expect((await doctors.publishDoctorAction({ id, allowUnpaid: true })).ok).toBe(true);
  });

  it("publishes straight away once a payment is recorded", async () => {
    const d = await DoctorProfile.findOne({ status: "published" }).lean();
    await DoctorProfile.updateOne({ _id: d!._id }, { $set: { status: "review" }, $unset: { setupPaidAt: 1 } });
    await Payment.collection.insertOne({ doctorId: d!._id, amount: 4999, date: new Date(), purpose: "setup", mode: "upi" });
    expect((await doctors.publishDoctorAction({ id: String(d!._id) })).ok).toBe(true);
  });
});

describe("live websites: sales need the owner's code", () => {
  it("blocks the save, emails the owner a code, and a correct code unlocks editing", async () => {
    const d = await DoctorProfile.findOne({ status: "published" }).lean();
    const id = String(d!._id);
    await DoctorProfile.updateOne({ _id: d!._id }, { $set: { salesAdminId: new Types.ObjectId(asha.id), ownerEmail: "dr.live@example.com" } });
    const form = { ...emptyDoctorForm(), firstName: d!.firstName, lastName: d!.lastName, title: d!.title ?? "Dr.", displayName: "Dr. Changed Name" };
    as.current = asha;

    const blocked = await doctors.saveDoctorSectionAction({ id, step: "basics", data: sectionPayload("basics", form) });
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.error).toMatch(/code/);

    const send = await unlock.sendEditCodeAction({ kind: "doctor", id });
    expect(send.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("dr.live@example.com");
    expect(sent[0]!.text).toContain("Asha Patil");
    const code = sent[0]!.subject.slice(0, 6);
    expect(code).toMatch(/^\d{6}$/);

    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    expect((await unlock.redeemEditCodeAction({ kind: "doctor", id, code: wrong })).ok).toBe(false);
    // Another executive can't use it.
    as.current = ravi;
    expect((await unlock.redeemEditCodeAction({ kind: "doctor", id, code })).ok).toBe(false);
    as.current = asha;
    const ok = await unlock.redeemEditCodeAction({ kind: "doctor", id, code });
    expect(ok.ok).toBe(true);
    // Used up: the same code doesn't work twice.
    expect((await unlock.redeemEditCodeAction({ kind: "doctor", id, code })).ok).toBe(false);

    const saved = await doctors.saveDoctorSectionAction({ id, step: "basics", data: sectionPayload("basics", form) });
    expect(saved.ok).toBe(true);
    expect((await DoctorProfile.findById(id).lean())!.displayName).toBe("Dr. Changed Name");
  });

  it("the super admin edits a live website directly", async () => {
    const d = await DoctorProfile.findOne({ status: "published" }).lean();
    const form = { ...emptyDoctorForm(), firstName: d!.firstName, lastName: d!.lastName, title: d!.title ?? "Dr.", displayName: "Dr. By Owner" };
    expect((await doctors.saveDoctorSectionAction({ id: String(d!._id), step: "basics", data: sectionPayload("basics", form) })).ok).toBe(true);
  });
});

describe("removing a sales executive and migrating old data", () => {
  it("deleting a sales executive keeps their websites with the super admin", async () => {
    const before = await DoctorProfile.countDocuments({ salesAdminId: new Types.ObjectId(ravi.id) });
    expect(before).toBeGreaterThan(0);
    expect((await settings.deleteAdminUserAction({ id: ravi.id })).ok).toBe(true);
    expect(await Admin.findById(ravi.id).lean()).toBeNull();
    expect(await DoctorProfile.countDocuments({ salesAdminId: new Types.ObjectId(ravi.id) })).toBe(0);
    expect((await settings.deleteAdminUserAction({ id: SUPER.id })).ok).toBe(false); // not yourself
  });

  it("migration: old admins become super admins, sales get staff IDs, records get their owner", async () => {
    await Admin.collection.insertOne({ name: "Old Admin", email: "old@example.com", role: "admin", passwordHash: "x", active: true });
    await Admin.collection.insertOne({ name: "Neha Joshi", role: "sales", passwordHash: "x", active: true });
    const d = await DoctorProfile.findOne({ salesAdminId: { $exists: false } }).lean();
    await DoctorProfile.updateOne({ _id: d!._id }, { $set: { salesExecutive: "Neha Joshi" } });
    const r = await migrateDashboardRoles();
    expect(r.promoted).toBe(1);
    expect(r.staffIds).toEqual(["Neha Joshi: MRS-1003"]);
    expect(r.owned).toBeGreaterThanOrEqual(1);
    const neha = await Admin.findOne({ name: "Neha Joshi" }).lean();
    expect(String((await DoctorProfile.findById(d!._id).lean())!.salesAdminId)).toBe(String(neha!._id));
    expect((await Admin.findOne({ email: "old@example.com" }).lean())!.role).toBe("superadmin");
  });
});
