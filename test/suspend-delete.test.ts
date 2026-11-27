import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));
vi.mock("@/lib/integrations/email", () => ({ sendEmail: async () => ({ ok: true }) }));

const role = { current: "superadmin" as "superadmin" | "sales" };
vi.mock("@/lib/auth/admin", async (load) => {
  const real = await load<typeof import("@/lib/auth/admin")>();
  return {
    ...real,
    requireAdmin: async (roles: readonly string[]) => {
      if (!roles.includes(role.current)) throw new Error("FORBIDDEN");
      return { id: "000000000000000000000001", name: "Test Admin", email: "admin@example.com", role: role.current };
    },
  };
});

const { connectToDatabase } = await import("@/lib/db");
const { seedMasters } = await import("@/lib/seed/masters");
const { seedSampleDoctors } = await import("@/lib/seed/samples");
const { seedDemoSites } = await import("@/lib/seed/demo-sites");
const { deleteDoctorAction, publishDoctorAction, suspendDoctorAction } = await import("@/app/admin/(dash)/doctors/actions");
const { deleteEstablishmentAction, publishEstablishmentAction, suspendEstablishmentAction } = await import("@/app/admin/(dash)/establishments/actions");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");
const { Inquiry } = await import("@/models/Inquiry");
const { Payment } = await import("@/models/Payment");
const { AuditLog } = await import("@/models/AuditLog");

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_suspend_delete_test";
  await connectToDatabase();
  await seedMasters();
  await seedSampleDoctors();
  await seedDemoSites();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("suspend, republish and delete", () => {
  it("suspends a doctor page and republishes it", async () => {
    const doc = await DoctorProfile.findOne({ status: "published" }).lean();
    const id = String(doc!._id);
    expect((await suspendDoctorAction({ id })).ok).toBe(true);
    expect((await DoctorProfile.findById(id).lean())!.status).toBe("suspended");
    expect((await publishDoctorAction({ id, allowUnpaid: true })).ok).toBe(true);
    expect((await DoctorProfile.findById(id).lean())!.status).toBe("published");
  });

  it("deletes a doctor page for good: enquiries and clinic links go, payments stay", async () => {
    const site = await Establishment.findOne({ kind: "clinic" }).lean();
    const doc = await DoctorProfile.findOne({ status: "published" }).lean();
    const id = doc!._id;
    await DoctorProfile.updateOne({ _id: id }, { $addToSet: { establishmentIds: site!._id } });
    await Establishment.updateOne({ _id: site!._id }, { $push: { doctors: { doctorProfileId: id } } });
    await Inquiry.collection.insertOne({ doctorId: id, name: "P", phone: "9999999999", status: "new", createdAt: new Date() });
    await Payment.collection.insertOne({ doctorId: id, amount: 100, date: new Date(), purpose: "setup", mode: "upi" });

    role.current = "sales";
    expect((await deleteDoctorAction({ id: String(id) })).ok).toBe(false);
    role.current = "superadmin";

    expect((await deleteDoctorAction({ id: String(id) })).ok).toBe(true);
    expect(await DoctorProfile.findById(id).lean()).toBeNull();
    expect(await Inquiry.countDocuments({ doctorId: id })).toBe(0);
    expect(await Payment.countDocuments({ doctorId: id })).toBe(1);
    expect(await Establishment.countDocuments({ "doctors.doctorProfileId": id })).toBe(0);
    expect(await AuditLog.countDocuments({ action: "doctor.delete", entityId: id })).toBe(1);
    expect((await deleteDoctorAction({ id: String(id) })).ok).toBe(false);
  });

  it("suspends, republishes and deletes a clinic site, unlinking its doctors", async () => {
    const site = await Establishment.findOne({ kind: "clinic", status: "published" }).lean();
    const id = String(site!._id);
    expect((await suspendEstablishmentAction({ id })).ok).toBe(true);
    expect((await Establishment.findById(id).lean())!.status).toBe("suspended");
    expect((await publishEstablishmentAction({ id, allowUnpaid: true })).ok).toBe(true);
    expect((await Establishment.findById(id).lean())!.status).toBe("published");

    const doctor = await DoctorProfile.findOne().lean();
    await DoctorProfile.updateOne({ _id: doctor!._id }, { $addToSet: { establishmentIds: new Types.ObjectId(id) } });

    expect((await deleteEstablishmentAction({ id })).ok).toBe(true);
    expect(await Establishment.findById(id).lean()).toBeNull();
    expect(await DoctorProfile.countDocuments({ establishmentIds: new Types.ObjectId(id) })).toBe(0);
  });
});
