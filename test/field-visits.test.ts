import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Field visits (sales executives' daily work list) and matching website forms
 * to them on the three confirming fields: doctor's name, clinic name, mobile.
 */

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));
vi.mock("@/lib/integrations/email", () => ({ sendEmail: async () => ({ ok: true }) }));

type Who = { id: string; name: string; email: string; role: "superadmin" | "sales"; staffId?: string };
const SUPER: Who = { id: "000000000000000000000001", name: "Satish", email: "owner@example.com", role: "superadmin" };
const ASHA: Who = { id: "000000000000000000000011", name: "Asha Patil", email: "", role: "sales", staffId: "MRS-1001" };
const RAVI: Who = { id: "000000000000000000000012", name: "Ravi Kale", email: "", role: "sales", staffId: "MRS-1002" };
const as = { current: ASHA };
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
const { intakeKeys, matchedFields, mobilesIn, normName, visitKeys } = await import("@/lib/visits/keys");
const { todayIST, daysBefore } = await import("@/lib/visits/days");
const { linkIntakeToSales } = await import("@/lib/visits/match");
const { emptyIntakeData } = await import("@/lib/intake/form");
const { saveIntake } = await import("@/lib/intake/server");
const visits = await import("@/app/admin/(dash)/visits/actions");
const intakes = await import("@/app/admin/(dash)/intakes/actions");
const assign = await import("@/app/admin/(dash)/assign-actions");
const { intakeScope } = await import("@/lib/admin/scope");
const { Admin } = await import("@/models/Admin");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Intake } = await import("@/models/Intake");
const { Visit } = await import("@/models/Visit");

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_visits_test";
  await connectToDatabase();
  await seedMasters();
  for (const u of [SUPER, ASHA, RAVI]) {
    await Admin.create({ _id: new Types.ObjectId(u.id), name: u.name, email: u.email || undefined, staffId: u.staffId, role: u.role, passwordHash: "x" });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  as.current = ASHA;
  await Promise.all([Visit.deleteMany({}), Intake.deleteMany({})]);
});

const visit = (patch: Record<string, string> = {}) => ({
  day: todayIST(),
  kind: "doctor" as const,
  doctorName: "Dr. Amit Kulkarni",
  clinicName: "Kulkarni Clinic",
  mobile: "98765 43210",
  area: "Kothrud",
  outcome: "will_fill_form" as const,
  followUpOn: "",
  notes: "",
  ...patch,
});

let refN = 0;
/** A sent website form (stored directly; the save path is tested separately). */
async function sentForm(kind: "doctor" | "clinic", data: Record<string, unknown>) {
  const doc = await Intake.create({ kind, email: `f${++refN}@example.com`, ref: `MR-T${refN}`, status: "submitted", data, matchKeys: intakeKeys(kind, data), photos: { gallery: [] } });
  await linkIntakeToSales(doc._id);
  return Intake.findById(doc._id).lean();
}

describe("match keys", () => {
  it("normalises names and finds mobiles", () => {
    expect(normName("Dr.  Amit S. Kulkarni")).toBe("amit s kulkarni");
    expect(mobilesIn("+91 98765-43210, 020 2546 1234 / 9123456789")).toEqual(["9876543210", "9123456789"]);
    expect(visitKeys({ doctorName: "Dr Amit Kulkarni", clinicName: "Kulkarni Clinic", mobile: "9876543210" })).toEqual(["m:9876543210", "n:amit kulkarni", "c:kulkarni clinic"]);
    const doctorKeys = intakeKeys("doctor", { fullName: "Amit Kulkarni", mobile: "9000000000", clinics: [{ name: "Kulkarni Clinic", phone: "98765 43210" }] });
    expect(matchedFields(doctorKeys, visitKeys({ clinicName: "KULKARNI clinic", mobile: "+919876543210" }))).toEqual(["mobile", "clinic name"]);
    const clinicKeys = intakeKeys("clinic", { name: "Shah Skin Clinic", contactName: "Neha Shah", phones: "9822012345", doctors: [{ name: "Dr. Rahul Shah" }] });
    expect(clinicKeys).toEqual(expect.arrayContaining(["m:9822012345", "c:shah skin clinic", "n:neha shah", "n:rahul shah"]));
  });
});

describe("work list", () => {
  it("a sales executive logs visits; one of the names is required; dates stay recent", async () => {
    expect((await visits.createVisitAction(visit())).ok).toBe(true);
    expect((await visits.createVisitAction(visit({ doctorName: "", clinicName: "" }))).ok).toBe(false);
    expect((await visits.createVisitAction(visit({ day: daysBefore(todayIST(), 60) }))).ok).toBe(false);
    const saved = await Visit.findOne().lean();
    expect(saved!.mobile).toBe("9876543210");
    expect(saved!.salesName).toBe("Asha Patil");
    expect(saved!.staffId).toBe("MRS-1001");
  });

  it("another sales executive can't edit or delete it; the super admin can't log visits as themself", async () => {
    const r = await visits.createVisitAction(visit());
    const id = r.ok ? r.data.id : "";
    as.current = RAVI;
    expect((await visits.updateVisitAction({ id, data: visit({ outcome: "not_interested" }) })).ok).toBe(false);
    expect((await visits.deleteVisitAction({ id })).ok).toBe(false);
    as.current = SUPER;
    expect((await visits.createVisitAction(visit())).ok).toBe(false);
    expect((await visits.updateVisitAction({ id, data: visit({ notes: "Corrected" }) })).ok).toBe(true);
  });
});

describe("form ↔ visit matching", () => {
  it("a form sent after the visit joins that sales executive (on the mobile alone)", async () => {
    await visits.createVisitAction(visit({ doctorName: "Someone Else", clinicName: "" }));
    const form = await sentForm("doctor", { fullName: "Dr. Amit Kulkarni", mobile: "9876543210", clinics: [] });
    expect(String(form!.salesAdminId)).toBe(ASHA.id);
    expect(form!.salesMatch!.by).toBe("visit");
    expect(form!.salesMatch!.on).toEqual(["mobile"]);
    const v = await Visit.findOne().lean();
    expect(String(v!.intakeId)).toBe(String(form!._id));
    // Asha now sees the form; Ravi doesn't.
    expect(await Intake.countDocuments({ _id: form!._id, ...(await intakeScope(ASHA)) })).toBe(1);
    expect(await Intake.countDocuments({ _id: form!._id, ...(await intakeScope(RAVI)) })).toBe(0);
  });

  it("a visit logged after the form came in links it too (on the clinic name)", async () => {
    const form = await sentForm("clinic", { name: "Shah Skin Clinic", contactName: "Neha Shah", mobile: "9822012345" });
    expect(form!.salesAdminId).toBeUndefined();
    const r = await visits.createVisitAction(visit({ kind: "clinic", doctorName: "", clinicName: "shah skin clinic", mobile: "" }));
    expect(r.ok && r.data.formFilled).toBe(true);
    expect(String((await Intake.findById(form!._id).lean())!.salesAdminId)).toBe(ASHA.id);
  });

  it("two executives visited: nobody gets it until the super admin picks, and the pick is final", async () => {
    await visits.createVisitAction(visit());
    as.current = RAVI;
    await visits.createVisitAction(visit({ doctorName: "", mobile: "" })); // Ravi met them at the clinic
    const form = await sentForm("doctor", { fullName: "Dr. Amit Kulkarni", mobile: "9876543210", clinics: [{ name: "Kulkarni Clinic" }] });
    expect(form!.salesAdminId).toBeUndefined();
    expect(form!.salesCandidates!.map((c) => c.name).sort()).toEqual(["Asha Patil", "Ravi Kale"]);

    as.current = SUPER;
    expect((await intakes.assignIntakeSalesAction({ id: String(form!._id), salesAdminId: RAVI.id })).ok).toBe(true);
    await linkIntakeToSales(form!._id); // automatic matching runs again (e.g. the form is edited)
    const after = (await Intake.findById(form!._id).lean())!;
    expect(String(after.salesAdminId)).toBe(RAVI.id);
    expect(after.salesMatch!.by).toBe("admin");
    expect(await Visit.countDocuments({ intakeId: form!._id, salesAdminId: new Types.ObjectId(RAVI.id) })).toBe(1);
    expect(await Visit.countDocuments({ intakeId: form!._id, salesAdminId: new Types.ObjectId(ASHA.id) })).toBe(0);

    as.current = ASHA; // only the super admin assigns
    expect((await intakes.assignIntakeSalesAction({ id: String(form!._id), salesAdminId: ASHA.id })).ok).toBe(false);
  });

  it("the staff ID typed on the form wins", async () => {
    await visits.createVisitAction(visit());
    const form = await sentForm("doctor", { fullName: "Dr. Amit Kulkarni", mobile: "9876543210", salesStaffId: "mrs 1002", clinics: [] });
    expect(String(form!.salesAdminId)).toBe(RAVI.id);
    expect(form!.salesMatch!.by).toBe("form");
  });

  it("deleting the only matching visit unlinks the form", async () => {
    const r = await visits.createVisitAction(visit());
    const form = await sentForm("doctor", { fullName: "Dr. Amit Kulkarni", mobile: "9876543210", clinics: [] });
    expect(form!.salesAdminId).toBeDefined();
    expect((await visits.deleteVisitAction({ id: r.ok ? r.data.id : "" })).ok).toBe(true);
    expect((await Intake.findById(form!._id).lean())!.salesAdminId).toBeUndefined();
  });

  it("the public form save stores match keys and links a sent form", async () => {
    await visits.createVisitAction(visit());
    // The same complete form the intake tests send, with this doctor's name and mobile.
    const data = {
      ...emptyIntakeData("doctor"),
      fullName: "Dr. Amit Kulkarni",
      mobile: "+91 98765-43210",
      specialty: "general physician",
      qualifications: "MBBS – BJ Medical College – 2008\nMD – KEM – 2012",
      registrationNumber: "MMC 12345",
      council: "Maharashtra Medical Council",
      languages: "English, Marathi",
      services: "Diabetes care",
      clinics: [{ name: "Amit Clinic", address: "Shop 4, Karve Road", area: "kothrud", city: "Pune", pincode: "411038", timings: "Mon–Sat 10–1", phone: "020 2546 1234", fee: "₹500", mapsUrl: "", location: "18.507400,73.807700", appointmentNote: "" }],
      visitingAt: "",
      websiteDesign: "classic",
      cardStyle: "doc-amber",
      designDecision: "discuss",
    };
    const res = await saveIntake({ kind: "doctor", email: "amit@example.com", data, photos: {}, submit: true }, null);
    expect(res.ok ? "" : res.error).toBe("");
    const form = await Intake.findOne({ email: "amit@example.com" }).lean();
    expect(form!.matchKeys).toEqual(expect.arrayContaining(["m:9876543210", "n:amit kulkarni", "c:amit clinic"]));
    expect(String(form!.salesAdminId)).toBe(ASHA.id);
  });
});

describe("websites follow the form", () => {
  it("the draft made from a matched form belongs to the sales executive", async () => {
    await visits.createVisitAction(visit());
    const form = await sentForm("doctor", { fullName: "Dr. Amit Kulkarni", mobile: "9876543210", clinics: [] });
    as.current = SUPER;
    const res = await intakes.createSiteFromIntakeAction({ id: String(form!._id) });
    expect(res.ok).toBe(true);
    const site = await DoctorProfile.findById((await Intake.findById(form!._id).lean())!.convertedTo!.id).lean();
    expect(String(site!.salesAdminId)).toBe(ASHA.id);
    expect(site!.salesExecutiveId).toBe("MRS-1001");
  });

  it("the super admin assigns a website directly; sales can't", async () => {
    const doc = await DoctorProfile.create({ firstName: "Manual", lastName: "Assign", status: "draft" });
    as.current = RAVI;
    expect((await assign.assignSiteSalesAction({ kind: "doctor", id: String(doc._id), salesAdminId: RAVI.id })).ok).toBe(false);
    as.current = SUPER;
    expect((await assign.assignSiteSalesAction({ kind: "doctor", id: String(doc._id), salesAdminId: RAVI.id })).ok).toBe(true);
    const after = (await DoctorProfile.findById(doc._id).lean())!;
    expect(String(after.salesAdminId)).toBe(RAVI.id);
    expect(after.salesExecutive).toBe("Ravi Kale");
    expect((await assign.assignSiteSalesAction({ kind: "doctor", id: String(doc._id), salesAdminId: null })).ok).toBe(true);
    expect((await DoctorProfile.findById(doc._id).lean())!.salesAdminId).toBeUndefined();
  });
});
