import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { createLoginCode, checkLoginCode } from "@/lib/auth/login-code";
import { createSessionToken } from "@/lib/auth/session";
import { seedMasters } from "@/lib/seed/masters";
import { checkIntakeCode, createIntakeCode, INTAKE_CODE_MAX_ATTEMPTS } from "@/lib/intake/code";
import { createSiteFromIntake, parseDoctorLine, splitDoctorName } from "@/lib/intake/convert";
import { intakeCodeEmail, intakeSavedEmail } from "@/lib/intake/emails";
import {
  emptyIntakeData,
  intakeDataSchema,
  mergeIntake,
  missingForSubmit,
  requiredProgress,
  withDefaults,
  type IntakeData,
} from "@/lib/intake/form";
import { isOurPhoto, saveIntake } from "@/lib/intake/server";
import { createIntakeToken, verifyIntakeToken } from "@/lib/intake/session";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake } from "@/models/Intake";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_intake_test";
  await connectToDatabase();
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const photo = (n: number) => ({ publicId: `medireach-portfolio/intake/p${n}`, url: `https://res.cloudinary.com/demo/image/upload/v1/medireach-portfolio/intake/p${n}.jpg` });

function fullDoctor(): IntakeData {
  return {
    ...emptyIntakeData("doctor"),
    fullName: "Dr. Asha R Kulkarni",
    mobile: "+91 98765-43210",
    specialty: "general physician",
    qualifications: "MBBS – BJ Medical College – 2008\nMD – KEM – 2012",
    registrationNumber: "MMC 12345",
    council: "Maharashtra Medical Council",
    languages: "English, Marathi",
    services: "Diabetes care\n- Health check-ups",
    instagram: "instagram.com/drasha",
    clinics: [{ name: "Asha Clinic", address: "Shop 4, Karve Road", area: "kothrud", city: "Pune", pincode: "411038", timings: "Mon–Sat 10–1", phone: "020 2546 1234", fee: "₹500", mapsUrl: "", appointmentNote: "" }],
  };
}

describe("form definitions", () => {
  it("normalises and validates, and drops unknown keys", () => {
    const r = intakeDataSchema("doctor").safeParse({ ...fullDoctor(), hacker: "x" });
    expect(r.success).toBe(true);
    const d = r.data!;
    expect(d.mobile).toBe("9876543210");
    expect(d.instagram).toBe("https://instagram.com/drasha");
    expect((d.clinics as { fee: string }[])[0]!.fee).toBe("500");
    expect("hacker" in d).toBe(false);

    const bad = intakeDataSchema("doctor").safeParse({ mobile: "12345", clinics: [{ pincode: "41103" }] });
    expect(bad.success).toBe(false);
    const keys = bad.error!.issues.map((i) => i.path.join("."));
    expect(keys).toEqual(expect.arrayContaining(["mobile", "clinics.0.pincode"]));
  });

  it("lists what's missing before sending, including inside clinics", () => {
    const blank = emptyIntakeData("doctor");
    const missing = missingForSubmit("doctor", blank).map((m) => m.key);
    expect(missing).toEqual(expect.arrayContaining(["fullName", "mobile", "registrationNumber", "clinics.0.name", "clinics.0.timings"]));
    expect(missing).not.toContain("clinics.0.city"); // defaults to Pune
    expect(missingForSubmit("doctor", fullDoctor())).toEqual([]);
    expect(missingForSubmit("doctor", { ...fullDoctor(), clinics: [] }).map((m) => m.key)).toContain("clinics");
    const p = requiredProgress("doctor", blank);
    expect(p.done).toBeLessThan(p.total);
    expect(missingForSubmit("hospital", emptyIntakeData("hospital")).map((m) => m.key)).toEqual(expect.arrayContaining(["regAuthority", "regNumber"]));
  });

  it("merges a fresh form into a saved one (typed values win, blanks are filled)", () => {
    const saved = withDefaults("doctor", { fullName: "Dr. Asha Kulkarni", specialty: "GP", clinics: [{ name: "Saved clinic" }] });
    const typed = withDefaults("doctor", { specialty: "Dermatologist" });
    const m = mergeIntake("doctor", typed, saved);
    expect(m.fullName).toBe("Dr. Asha Kulkarni");
    expect(m.specialty).toBe("Dermatologist");
    expect((m.clinics as { name: string }[])[0]!.name).toBe("Saved clinic");
  });

  it("accepts only our own Cloudinary uploads", () => {
    expect(isOurPhoto(photo(1))).toBe(true);
    expect(isOurPhoto({ publicId: "medireach-portfolio/doctor-photo/x", url: photo(1).url })).toBe(false);
    expect(isOurPhoto({ publicId: photo(1).publicId, url: "https://evil.example/x.jpg" })).toBe(false);
    expect(isOurPhoto({ publicId: photo(1).publicId, url: "https://res.cloudinary.com/other/image/upload/x.jpg" })).toBe(false);
  });

  it("parses names and doctor lines", () => {
    expect(splitDoctorName("Dr. Amit R. Kulkarni")).toEqual({ title: "Dr.", firstName: "Amit", middleName: "R.", lastName: "Kulkarni" });
    expect(splitDoctorName("Amit")).toBeNull();
    expect(parseDoctorLine("Dr. Neha Joshi – MBBS, MD – Dermatologist")).toEqual({ name: "Dr. Neha Joshi", qualifications: "MBBS, MD", specialty: "Dermatologist" });
  });
});

describe("saving and ownership", () => {
  beforeEach(async () => {
    await Intake.deleteMany({});
  });

  it("creates the first form for an email without proof and starts a session", async () => {
    const r = await saveIntake({ kind: "doctor", email: "Asha@Example.com", data: { fullName: "Dr. Asha Kulkarni" }, photos: { gallery: [photo(1)] } }, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sessionEmail).toBe("asha@example.com");
    expect(r.notify).toEqual(["saved"]);
    expect(r.intake.ref).toMatch(/^MR-[2-9A-Z]{6}$/);
    expect(r.intake.status).toBe("draft");
    const doc = await Intake.findById(r.intake.id).lean();
    expect(doc?.name).toBe("Dr. Asha Kulkarni");
    expect(doc?.missingCount).toBeGreaterThan(0);
  });

  it("needs a code to touch an existing email's forms from another browser", async () => {
    const first = await saveIntake({ kind: "doctor", email: "a@example.com", data: {}, photos: {} }, null);
    expect(first.ok).toBe(true);
    const id = first.ok ? first.intake.id : "";

    const again = await saveIntake({ kind: "doctor", email: "a@example.com", data: { fullName: "Hijack" }, photos: {} }, null);
    expect(again).toMatchObject({ ok: false, needsCode: true, email: "a@example.com" });
    // A different kind for the same email also needs the code (the session would open every form).
    expect(await saveIntake({ kind: "clinic", email: "a@example.com", data: {}, photos: {} }, null)).toMatchObject({ needsCode: true });
    // By id with someone else's session: refused.
    const other = await saveIntake({ id, kind: "doctor", email: "a@example.com", data: {}, photos: {} }, "b@example.com");
    expect(other).toMatchObject({ ok: false, needsCode: true });
    expect((await Intake.findById(id).lean())?.name).toBeUndefined();

    const owner = await saveIntake({ id, kind: "doctor", email: "a@example.com", data: { fullName: "Dr. A B" }, photos: {} }, "a@example.com");
    expect(owner.ok).toBe(true);
    if (owner.ok) expect(owner.sessionEmail).toBeUndefined();
  });

  it("lets the owner change the email only to an unused address", async () => {
    const a = await saveIntake({ kind: "doctor", email: "one@example.com", data: {}, photos: {} }, null);
    await saveIntake({ kind: "clinic", email: "two@example.com", data: {}, photos: {} }, null);
    const id = a.ok ? a.intake.id : "";
    expect(await saveIntake({ id, kind: "doctor", email: "two@example.com", data: {}, photos: {} }, "one@example.com")).toMatchObject({ ok: false });
    const moved = await saveIntake({ id, kind: "doctor", email: "three@example.com", data: {}, photos: {} }, "one@example.com");
    expect(moved).toMatchObject({ ok: true, sessionEmail: "three@example.com" });
  });

  it("sends only complete forms, then marks later edits as updates", async () => {
    const r = await saveIntake({ kind: "doctor", email: "s@example.com", data: { fullName: "Dr. S K" }, photos: {}, submit: true }, null);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(Object.keys((r as { fieldErrors?: object }).fieldErrors ?? {})).toContain("registrationNumber");
    expect(await Intake.countDocuments()).toBe(0); // a refused send saves nothing

    const sent = await saveIntake({ kind: "doctor", email: "s@example.com", data: fullDoctor(), photos: {}, submit: true }, null);
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.intake.status).toBe("submitted");
    expect(sent.notify).toEqual(expect.arrayContaining(["saved", "submitted", "team_new"]));

    const edit = await saveIntake({ id: sent.intake.id, kind: "doctor", email: "s@example.com", data: fullDoctor(), photos: {} }, "s@example.com");
    expect(edit.ok && edit.intake.status).toBe("submitted");
    expect((await Intake.findById(sent.intake.id).lean())?.updatedAfterSubmitAt).toBeInstanceOf(Date);

    await Intake.updateOne({ _id: sent.intake.id }, { $set: { status: "done" } });
    expect(await saveIntake({ id: sent.intake.id, kind: "doctor", email: "s@example.com", data: fullDoctor(), photos: {} }, "s@example.com")).toMatchObject({ ok: false });
    // The dashboard can still edit a closed form.
    expect(await saveIntake({ id: sent.intake.id, kind: "doctor", email: "s@example.com", data: fullDoctor(), photos: {} }, null, { asAdmin: true })).toMatchObject({ ok: true });
  });

  it("rejects photos that aren't our uploads and caps the gallery", async () => {
    const r = await saveIntake({ kind: "doctor", email: "p@example.com", data: {}, photos: { gallery: [{ publicId: "x", url: "https://evil.example/a.jpg" }] } }, null);
    expect(r).toMatchObject({ ok: false });
    const many = await saveIntake({ kind: "doctor", email: "p@example.com", data: {}, photos: { gallery: [1, 2, 3, 4, 5, 6].map(photo) } }, null);
    expect(many).toMatchObject({ ok: false });
  });
});

describe("codes and sessions", () => {
  it("checks codes once, burns them after too many tries, and keeps them apart from login codes", async () => {
    const code = await createIntakeCode("c@example.com");
    expect(await checkIntakeCode("c@example.com", code === "000000" ? "111111" : "000000")).toBe(false);
    expect(await checkIntakeCode("C@Example.com", code)).toBe(true);
    expect(await checkIntakeCode("c@example.com", code)).toBe(false);

    const c2 = await createIntakeCode("c@example.com");
    for (let i = 0; i < INTAKE_CODE_MAX_ATTEMPTS; i++) await checkIntakeCode("c@example.com", c2 === "123456" ? "654321" : "123456");
    expect(await checkIntakeCode("c@example.com", c2)).toBe(false);

    // A form code is not a login code, and the other way round.
    const login = await createLoginCode("d@example.com");
    expect(await checkIntakeCode("d@example.com", login)).toBe(false);
    const form = await createIntakeCode("d@example.com");
    expect(await checkLoginCode("d@example.com", form)).toBe(false);
  });

  it("only accepts its own session tokens", async () => {
    expect(await verifyIntakeToken(await createIntakeToken("e@example.com"))).toBe("e@example.com");
    expect(await verifyIntakeToken(await createSessionToken({ sub: "e@example.com", role: "superadmin", name: "x" }))).toBeNull();
    expect(await verifyIntakeToken("garbage")).toBeNull();
  });

  it("builds escaped emails with the continue link", () => {
    const m = intakeSavedEmail({ name: "<b>A</b>", email: "a@b.co", ref: "MR-ABCDEF", kindLabel: "Doctor website" });
    expect(m.html).not.toContain("<b>A</b>");
    expect(m.text).toContain("/get-started/continue?email=a%40b.co");
    expect(intakeCodeEmail({ code: "123456" }).subject).toContain("123456");
  });
});

describe("creating the website draft", () => {
  it("maps a doctor form onto a draft profile, with the rest in internal notes", async () => {
    const r = await saveIntake({ kind: "doctor", email: "conv@example.com", data: fullDoctor(), photos: { profile: photo(9), gallery: [photo(10)] } }, null);
    expect(r.ok).toBe(true);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    const made = await createSiteFromIntake(intake!);
    expect(made.href).toBe(`/admin/doctors/${made.id}`);
    const doc = await DoctorProfile.findById(made.id).lean();
    expect(doc).toMatchObject({ status: "draft", firstName: "Asha", middleName: "R", lastName: "Kulkarni", mobile: "9876543210", ownerEmail: "conv@example.com", source: "inbound" });
    expect(doc!.primarySpecialtyId).toBeDefined();
    expect(doc!.registration.councilId).toBeDefined();
    expect(doc!.clinics).toHaveLength(1);
    expect(doc!.clinics[0]).toMatchObject({ name: "Asha Clinic", pincode: "411038", fee: 500 });
    expect(doc!.services.map((s) => s.name)).toEqual(["Diabetes care", "Health check-ups"]);
    expect(doc!.photo?.publicId).toBe(photo(9).publicId);
    expect(doc!.gallery).toHaveLength(1);
    expect(doc!.links.instagram).toBe("https://instagram.com/drasha");
    expect(doc!.citySlug).toBe("pune");
    expect(doc!.internalNotes).toContain(intake!.ref);
    expect(doc!.internalNotes).toContain("MBBS – BJ Medical College – 2008");
  });

  it("maps a clinic form onto a draft establishment", async () => {
    const data = {
      ...emptyIntakeData("clinic"),
      name: "Shree Skin Clinic",
      clinicType: "Skin clinic",
      contactName: "Neha",
      mobile: "9876500000",
      address: "Karve Road",
      area: "Kothrud",
      city: "Pune",
      pincode: "411038",
      phones: "020 1234 5678, 98765 00000",
      timings: "Mon–Sat 10–7",
      doctors: "Dr. Neha Joshi – MBBS, MD – Dermatologist",
      services: "Acne care",
    };
    const r = await saveIntake({ kind: "clinic", email: "clinic@example.com", data, photos: { logo: photo(20) } }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    const made = await createSiteFromIntake(intake!);
    const e = await Establishment.findById(made.id).lean();
    expect(e).toMatchObject({ kind: "clinic", plan: "clinic", status: "draft", name: "Shree Skin Clinic", themeKey: "skin", ownerEmail: "clinic@example.com" });
    expect(e!.address.areaId).toBeDefined();
    expect(e!.contact.phones).toEqual(["020 1234 5678", "98765 00000"]);
    expect(e!.doctors[0]).toMatchObject({ name: "Dr. Neha Joshi", specialty: "Dermatologist" });
    expect(e!.logo?.publicId).toBe(photo(20).publicId);
    expect(e!.slug).toBeTruthy();
  });

  it("refuses a doctor form without a full name", async () => {
    const r = await saveIntake({ kind: "doctor", email: "noname@example.com", data: { fullName: "Asha" }, photos: {} }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    await expect(createSiteFromIntake(intake!)).rejects.toThrow(/first and last name/);
  });
});
