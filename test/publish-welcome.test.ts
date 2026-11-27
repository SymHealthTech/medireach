import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));

type Sent = { to: string; subject: string; text: string; html: string };
const sent: Sent[] = [];
vi.mock("@/lib/integrations/email", () => ({
  sendEmail: async (m: Sent) => {
    sent.push(m);
    return { ok: true };
  },
}));

// Signed in as a superadmin (the real check reads the session cookie).
vi.mock("@/lib/auth/admin", async (load) => {
  const real = await load<typeof import("@/lib/auth/admin")>();
  return { ...real, requireAdmin: async () => ({ id: "000000000000000000000001", name: "Test Admin", email: "admin@example.com", role: "superadmin" }) };
});

const { connectToDatabase } = await import("@/lib/db");
const { seedMasters } = await import("@/lib/seed/masters");
const { seedSampleDoctors } = await import("@/lib/seed/samples");
const { seedDemoSites } = await import("@/lib/seed/demo-sites");
const { publishDoctorAction, unpublishDoctorAction } = await import("@/app/admin/(dash)/doctors/actions");
const { publishEstablishmentAction } = await import("@/app/admin/(dash)/establishments/actions");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");
const { Intake } = await import("@/models/Intake");

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_publish_welcome_test";
  await connectToDatabase();
  await seedMasters();
  await seedSampleDoctors();
  await seedDemoSites();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  sent.length = 0;
});

/** A seeded (publishable) site, put back to a never-published draft. */
async function neverPublished<T extends { _id: unknown }>(model: typeof DoctorProfile | typeof Establishment, filter: Record<string, unknown>, set: Record<string, unknown>) {
  const doc = (await (model as typeof DoctorProfile).findOne(filter).lean()) as unknown as T;
  await (model as typeof DoctorProfile).updateOne({ _id: doc._id }, { $set: { status: "draft", ...set }, $unset: { publishedAt: 1 } });
  return String(doc._id);
}

describe("welcome email on first publish", () => {
  it("emails the doctor once, on the first publish only, with the live link and the website form ref", async () => {
    const id = await neverPublished(DoctorProfile, {}, { ownerEmail: "asha.welcome@example.com" });
    await Intake.create({ kind: "doctor", email: "asha.welcome@example.com", ref: "MR-WELC01", status: "in_review", data: {}, photos: { gallery: [] }, convertedTo: { kind: "doctor", id } });

    const res = await publishDoctorAction({ id });
    expect(res.ok).toBe(true);
    expect(res.ok && res.data.welcome).toEqual({ sent: "asha.welcome@example.com" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("asha.welcome@example.com");
    expect(sent[0]!.subject).toBe("Your MediReach website is live");
    const doc = await DoctorProfile.findById(id).lean();
    expect(sent[0]!.text).toContain(`/${doc!.citySlug}/doctor/${doc!.slug}`);
    expect(sent[0]!.text).toContain("ref MR-WELC01");
    expect((await Intake.findOne({ ref: "MR-WELC01" }).lean())!.status).toBe("done");

    // Republishing, or publishing again after an unpublish, sends nothing.
    expect((await publishDoctorAction({ id })).ok).toBe(true);
    expect((await unpublishDoctorAction({ id })).ok).toBe(true);
    const again = await publishDoctorAction({ id });
    expect(again.ok && again.data.welcome).toBeUndefined();
    expect(sent).toHaveLength(1);
  });

  it("without a login email: publishes, sends nothing and says how to send it", async () => {
    const id = await neverPublished(DoctorProfile, { ownerEmail: { $exists: false } }, {});
    const res = await publishDoctorAction({ id });
    expect(res.ok).toBe(true);
    expect(res.ok && res.data.welcome?.note).toMatch(/turn on the doctor's login/);
    expect(sent).toHaveLength(0);
  });

  it("emails a clinic or hospital owner on its first publish", async () => {
    const id = await neverPublished(Establishment, { kind: "clinic" }, { ownerEmail: "owner.welcome@example.com" });
    const res = await publishEstablishmentAction({ id });
    expect(res.ok).toBe(true);
    expect(res.ok && res.data.welcome).toEqual({ sent: "owner.welcome@example.com" });
    const site = await Establishment.findById(id).lean();
    expect(sent[0]!.subject).toBe("Your MediReach website is live");
    expect(sent[0]!.text).toContain(`/${site!.citySlug}/clinic/${site!.slug}`);
  });
});
