import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { needsCompression, targetSize } from "@/lib/client/compress-image";
import { compressOptionsFor } from "@/lib/client/upload-image";
import { createLoginCode, checkLoginCode } from "@/lib/auth/login-code";
import { createSessionToken } from "@/lib/auth/session";
import { seedMasters } from "@/lib/seed/masters";
import { checkIntakeCode, createIntakeCode, INTAKE_CODE_MAX_ATTEMPTS } from "@/lib/intake/code";
import { createSiteFromIntake, splitDoctorName } from "@/lib/intake/convert";
import { ClinicCategory } from "@/models/ClinicCategory";
import { intakeCodeEmail, intakeSavedEmail } from "@/lib/intake/emails";
import {
  allPhotos,
  DESIGN_GROUPS,
  DESIGNS_PER_TYPE,
  cleanPastedText,
  doctorRoleLabel,
  emptyIntakeData,
  parseDoctorLine,
  parseLocation,
  intakeDataSchema,
  mergeIntake,
  missingForSubmit,
  requiredProgress,
  withDefaults,
  type DoctorEntry,
  type IntakeData,
  type RepeatItem,
} from "@/lib/intake/form";
import { doctorHints, parseQualificationLine, siteHints } from "@/lib/intake/hints";
import { isOurPhoto, saveIntake } from "@/lib/intake/server";
import { findOrCreateMaster } from "@/lib/masters/server";
import { createIntakeToken, verifyIntakeToken } from "@/lib/intake/session";
import { Area } from "@/models/Area";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
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
    clinics: [{ name: "Asha Clinic", address: "Shop 4, Karve Road", area: "kothrud", city: "Pune", pincode: "411038", timings: "Mon–Sat 10–1", phone: "020 2546 1234", fee: "₹500", mapsUrl: "", location: "18.507400,73.807700", appointmentNote: "" }],
    visitingAt: "Ruby Hall Clinic, Pune",
    interests: "Running, trekking",
    beyondTitle: "My first marathon",
    websiteDesign: "classic",
    cardStyle: "doc-amber",
    designDecision: "discuss",
    beyondStory: "First paragraph.\r\n\r\n\r\nSecond paragraph.\u200B",
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

  it("asks to specify 'Other' system of medicine only when chosen, and allows 2 clinics", () => {
    expect(missingForSubmit("doctor", fullDoctor()).map((m) => m.key)).not.toContain("systemOther");
    expect(missingForSubmit("doctor", { ...fullDoctor(), systemOfMedicine: "other" }).map((m) => m.key)).toContain("systemOther");
    expect(missingForSubmit("doctor", { ...fullDoctor(), systemOfMedicine: "other", systemOther: "Naturopathy" })).toEqual([]);
    const clinic = (fullDoctor().clinics as object[])[0];
    expect(intakeDataSchema("doctor").safeParse({ clinics: [clinic, clinic] }).success).toBe(true);
    expect(intakeDataSchema("doctor").safeParse({ clinics: [clinic, clinic, clinic] }).success).toBe(false);
  });

  it("asks for the design decision, and drops unknown design codes instead of failing", () => {
    expect(missingForSubmit("doctor", { ...fullDoctor(), designDecision: "" }).map((m) => m.key)).toEqual(["designDecision"]);
    const d = intakeDataSchema("doctor").parse({ ...fullDoctor(), websiteDesign: "t3", cardStyle: "BLUE-ish" });
    expect(d.websiteDesign).toBe(""); // t3 isn't built yet
    expect(d.cardStyle).toBe("");
    expect(intakeDataSchema("doctor").parse(fullDoctor()).cardStyle).toBe("DOC-AMBER");
    expect(intakeDataSchema("clinic").parse({ websiteDesign: "dental" }).websiteDesign).toBe("dental");
    expect(intakeDataSchema("doctor").safeParse({ designDecision: "maybe" }).success).toBe(false);
  });

  it("clinic and hospital types: a list with 'Other, please specify'", () => {
    const base = { ...emptyIntakeData("clinic"), name: "X", contactName: "Y", mobile: "9876500000", address: "A", area: "Kothrud", pincode: "411038", phones: "020 1234 5678", timings: "10–7", designDecision: "final" };
    expect(missingForSubmit("clinic", { ...base, clinicType: "skin" })).toEqual([]);
    expect(missingForSubmit("clinic", { ...base, clinicType: "other" }).map((m) => m.key)).toEqual(["clinicTypeOther"]);
    expect(missingForSubmit("clinic", { ...base, clinicType: "" }).map((m) => m.key)).toEqual(["clinicType"]);
    // Older free-text answers map to the list by name, or become "not chosen".
    expect(intakeDataSchema("clinic").parse({ clinicType: "Skin clinic" }).clinicType).toBe("skin");
    expect(intakeDataSchema("clinic").parse({ clinicType: "something odd" }).clinicType).toBe("");
    expect(missingForSubmit("hospital", { ...emptyIntakeData("hospital"), hospitalType: "other" }).map((m) => m.key)).toContain("hospitalTypeOther");
  });

  it("decides when to compress images, per upload purpose", () => {
    expect(targetSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(targetSize(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    expect(needsCompression({ width: 4032, height: 3024, size: 3_000_000, type: "image/jpeg" })).toBe(true); // phone photo
    expect(needsCompression({ width: 1200, height: 900, size: 2_000_000, type: "image/jpeg" })).toBe(true); // heavy file
    expect(needsCompression({ width: 1200, height: 900, size: 200_000, type: "image/jpeg" })).toBe(false); // already small
    expect(needsCompression({ width: 1200, height: 900, size: 200_000, type: "image/png" })).toBe(true); // PNG photo
    expect(needsCompression({ width: 600, height: 600, size: 80_000, type: "image/png" }, { keepAlpha: true })).toBe(false); // small logo
    expect(compressOptionsFor("logo")).toEqual({ maxSide: 1200, keepAlpha: true });
    expect(compressOptionsFor("gallery").maxSide).toBe(2000);
  });

  it("cleans pasted stories and checks map pins", () => {
    expect(cleanPastedText("A\r\n\r\n\r\n\r\nB  \nC\u200B\u00A0D")).toBe("A\n\nB\nC D");
    const d = intakeDataSchema("doctor").parse(fullDoctor());
    expect(d.beyondStory).toBe("First paragraph.\n\nSecond paragraph.");
    expect(parseLocation("18.5074, 73.8077")).toEqual({ lat: 18.5074, lng: 73.8077 });
    expect(parseLocation("x,y")).toBeNull();
    expect(parseLocation("95,10")).toBeNull();
    expect(intakeDataSchema("clinic").safeParse({ location: "hello" }).success).toBe(false);
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

  it("clinic doctors: separate entries, up to 5, blank ones ignored, a name needed once anything is typed", () => {
    const base: IntakeData = { ...emptyIntakeData("clinic"), name: "X", clinicType: "skin", contactName: "Y", mobile: "9876500000", address: "A", area: "Kothrud", pincode: "411038", phones: "020 1234 5678", timings: "10–7", designDecision: "final" };
    expect(base.doctors).toHaveLength(1); // one empty doctor to start with
    expect(missingForSubmit("clinic", base)).toEqual([]); // an untouched entry doesn't block sending
    const noName = { ...base, doctors: [{ name: "", designation: "Dermatologist", education: "", role: "", portfolioUrl: "" }] };
    expect(missingForSubmit("clinic", noName).map((m) => m.key)).toEqual(["doctors.0.name"]);
    const doc = (name: string): DoctorEntry => ({ name, designation: "", education: "", role: "consultant", portfolioUrl: "" });
    const parsed = intakeDataSchema("clinic").parse({ doctors: [doc("Dr. A"), { name: "", designation: "", education: "", role: "", portfolioUrl: "" }, { ...doc("Dr. B"), portfolioUrl: "drb.example.com" }] });
    expect((parsed.doctors as DoctorEntry[]).map((d) => d.name)).toEqual(["Dr. A", "Dr. B"]); // blank entry dropped
    expect((parsed.doctors as DoctorEntry[])[1]!.portfolioUrl).toBe("https://drb.example.com");
    expect(intakeDataSchema("clinic").safeParse({ doctors: Array.from({ length: 6 }, (_, i) => doc(`Dr. ${i}`)) }).success).toBe(false);
    expect(intakeDataSchema("clinic").safeParse({ doctors: [{ ...doc("Dr. A"), role: "boss" }] }).success).toBe(true); // unknown role → not chosen
    expect(intakeDataSchema("clinic").parse({}).visitingDoctors).toBeUndefined();
  });

  it("doctor role 'Other': asks to specify it, and shows their words", () => {
    const base: IntakeData = { ...emptyIntakeData("clinic"), name: "X", clinicType: "skin", contactName: "Y", mobile: "9876500000", address: "A", area: "Kothrud", pincode: "411038", phones: "020 1234 5678", timings: "10–7", designDecision: "final" };
    const doc = (role: string, roleOther = ""): DoctorEntry => ({ name: "Dr. A", designation: "", education: "", role, roleOther, portfolioUrl: "" });
    expect(missingForSubmit("clinic", { ...base, doctors: [doc("other")] }).map((m) => m.key)).toEqual(["doctors.0.roleOther"]);
    expect(missingForSubmit("clinic", { ...base, doctors: [doc("other", "Dietitian")] })).toEqual([]);
    expect(requiredProgress("clinic", { ...base, doctors: [doc("other")] }).total).toBe(requiredProgress("clinic", { ...base, doctors: [doc("consultant")] }).total + 1);
    const hosp = { ...emptyIntakeData("hospital"), departments: [{ name: "Medicine", doctors: [doc("other")] }] };
    expect(missingForSubmit("hospital", hosp).map((m) => m.key)).toContain("departments.0.doctors.0.roleOther");
    // Kept only with "Other".
    const parsed = intakeDataSchema("clinic").parse({ doctors: [doc("other", "Dietitian"), doc("consultant", "left over")] }).doctors as DoctorEntry[];
    expect(parsed.map((d) => d.roleOther)).toEqual(["Dietitian", ""]);
    expect(doctorRoleLabel(parsed[0]!)).toBe("Dietitian");
    expect(doctorRoleLabel(parsed[1]!)).toBe("Consultant");
    expect(doctorRoleLabel(doc("other"))).toBe("");
  });

  it("website designs for clinics and hospitals: grouped by type, three per type", () => {
    expect(DESIGN_GROUPS.clinic.map((g) => g.value)).toContain("skin");
    expect(DESIGN_GROUPS.hospital.map((g) => g.value)).toEqual(["multispecialty", "general", "maternity", "children", "orthopaedic", "surgical", "eye", "ent"]);
    for (const g of [...DESIGN_GROUPS.clinic, ...DESIGN_GROUPS.hospital]) {
      expect(g.designs).toHaveLength(DESIGNS_PER_TYPE);
      expect(g.designs[0]!.ready).toBe(true); // each type has its specialty design today
    }
    const skin = DESIGN_GROUPS.clinic.find((g) => g.value === "skin")!;
    expect(skin.designs.map((d) => [d.value, d.ready])).toEqual([["skin", true], ["skin:2", false], ["skin:3", false]]);
    // Every built design can be saved; "coming soon" slots can't.
    for (const kind of ["clinic", "hospital"] as const) {
      for (const d of DESIGN_GROUPS[kind].flatMap((g) => g.designs)) {
        expect(intakeDataSchema(kind).parse({ websiteDesign: d.value }).websiteDesign).toBe(d.ready ? d.value : "");
      }
    }
  });

  it("hospital departments: many departments, each with its own doctors", () => {
    const blank = emptyIntakeData("hospital");
    expect(blank.doctors).toBeUndefined();
    expect(missingForSubmit("hospital", blank).map((m) => m.key)).not.toContain("departments.0.name"); // empty department is ignored
    const doc = (name: string): DoctorEntry => ({ name, designation: "", education: "", role: "", portfolioUrl: "" });
    const data = { ...blank, departments: [{ name: "Orthopaedics", doctors: [doc("Dr. A Patil"), doc("Dr. S Rao")] }, { name: "", doctors: [doc("Dr. C")] }, { name: "Medicine", doctors: [doc("")] }] };
    expect(missingForSubmit("hospital", data).map((m) => m.key)).toContain("departments.1.name");
    const parsed = intakeDataSchema("hospital").parse(data);
    expect((parsed.departments as RepeatItem[])[0]!.doctors).toHaveLength(2);
    expect((parsed.departments as RepeatItem[])[2]!.doctors).toEqual([]);
  });

  it("upgrades older doctor lists typed as text lines", () => {
    const clinic = withDefaults("clinic", { doctors: "Dr. Neha Joshi – MBBS, MD – Dermatologist", visitingDoctors: "Dr. A Rao – MD – Cardiologist" });
    expect(clinic.doctors).toEqual([
      { name: "Dr. Neha Joshi", education: "MBBS, MD", designation: "Dermatologist", role: "", roleOther: "", portfolioUrl: "" },
      { name: "Dr. A Rao", education: "MD", designation: "Cardiologist", role: "visiting", roleOther: "", portfolioUrl: "" },
    ]);
    const hospital = withDefaults("hospital", { departments: "Orthopaedics – Dr. A Patil, Dr. S Rao\nGeneral Medicine", doctors: "Dr. X – MBBS – Physician" });
    const deps = hospital.departments as RepeatItem[];
    expect(deps.map((d) => d.name)).toEqual(["Orthopaedics", "General Medicine", ""]);
    expect((deps[0]!.doctors as DoctorEntry[]).map((d) => d.name)).toEqual(["Dr. A Patil", "Dr. S Rao"]);
    expect((deps[2]!.doctors as DoctorEntry[])[0]).toMatchObject({ name: "Dr. X", designation: "Physician" });
    // A page opened before the change still saves.
    expect((intakeDataSchema("clinic").parse({ doctors: "Dr. Neha Joshi – MBBS" }).doctors as DoctorEntry[])[0]!.name).toBe("Dr. Neha Joshi");
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

  it("parses qualification lines, and builds editor hints from a form", () => {
    expect(parseQualificationLine("MBBS – BJ Medical College, Pune – 2008")).toEqual({ degree: "MBBS", specialization: "", institute: "BJ Medical College, Pune", year: 2008 });
    expect(parseQualificationLine("MD (Medicine) – KEM Hospital, Mumbai – 2012")).toEqual({ degree: "MD", specialization: "Medicine", institute: "KEM Hospital, Mumbai", year: 2012 });
    expect(parseQualificationLine("BAMS,")).toEqual({ degree: "BAMS", specialization: "", institute: "" });
    expect(parseQualificationLine("MBBS from BJMC (2008)")).toEqual({ degree: "MBBS", specialization: "", institute: "BJMC", year: 2008 });
    expect(parseQualificationLine("MBBS, BJMC, 2008")).toEqual({ degree: "MBBS", specialization: "", institute: "BJMC", year: 2008 });
    expect(parseQualificationLine("  ")).toBeNull();
    const h = doctorHints("MR-1", { ...fullDoctor(), qualifications: "BAMS,\nMD", council: "MCIM" });
    expect(h).toMatchObject({ ref: "MR-1", council: "MCIM", qualificationLines: ["BAMS,", "MD"] });
    expect(h.qualifications.map((q) => q.degree)).toEqual(["BAMS", "MD"]);
    expect(h.clinics[0]).toMatchObject({ name: "Asha Clinic", pincode: "411038" });
    expect(siteHints("MR-2", "clinic", { ...emptyIntakeData("clinic"), clinicType: "skin", area: "Kothrud" })).toMatchObject({ ref: "MR-2", category: "Skin Clinic", area: "Kothrud", city: "Pune", doctors: [], services: [] });
    expect(siteHints("MR-3", "clinic", { ...emptyIntakeData("clinic"), clinicType: "other", clinicTypeOther: "Sleep clinic" }).category).toBe("Sleep clinic");
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

  it("never overwrites a saved form from a fresh, blank form in the same browser", async () => {
    const first = await saveIntake({ kind: "doctor", email: "same@example.com", data: { fullName: "Dr. Saved Name" }, photos: {} }, null);
    expect(first.ok).toBe(true);
    const fresh = await saveIntake({ kind: "doctor", email: "same@example.com", data: { specialty: "ENT" }, photos: {} }, "same@example.com");
    expect(fresh).toMatchObject({ ok: false, existing: { ref: first.ok ? first.intake.ref : "" } });
    expect((await Intake.findOne({ email: "same@example.com" }).lean())?.name).toBe("Dr. Saved Name");
    // A different email from the same browser starts its own form.
    expect(await saveIntake({ kind: "doctor", email: "other@example.com", data: {}, photos: {} }, "same@example.com")).toMatchObject({ ok: true, sessionEmail: "other@example.com" });
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
    const badDoctor = { doctors: [{ name: "Dr. A", designation: "", education: "", role: "", portfolioUrl: "", photo: { publicId: "x", url: "https://evil.example/a.jpg" } }] };
    expect(await saveIntake({ kind: "clinic", email: "p2@example.com", data: badDoctor, photos: {} }, null)).toMatchObject({ ok: false });
    const goodDoctor = { doctors: [{ ...badDoctor.doctors[0], photo: photo(30) }] };
    const ok = await saveIntake({ kind: "clinic", email: "p2@example.com", data: goodDoctor, photos: {} }, null);
    expect(ok).toMatchObject({ ok: true });
    const saved = await Intake.findById(ok.ok ? ok.intake.id : "").lean();
    expect(allPhotos({ gallery: [], viaWhatsapp: false }, "clinic", saved!.data as IntakeData).map((p) => p.publicId)).toEqual([photo(30).publicId]);
    const many = await saveIntake({ kind: "doctor", email: "p@example.com", data: {}, photos: { gallery: Array.from({ length: 6 }, (_, i) => photo(i)) } }, null);
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
    const r = await saveIntake({ kind: "doctor", email: "conv@example.com", data: fullDoctor(), photos: { profile: photo(9), beyond: photo(15), gallery: [10, 11, 12, 13, 14].map(photo) } }, null);
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
    expect(doc!.gallery).toHaveLength(5);
    expect(doc!.internalNotes).toContain("Ruby Hall Clinic");
    expect(doc!.clinics[0]!.geo).toEqual({ lat: 18.5074, lng: 73.8077 });
    expect(doc!.clinics[0]!.mapsUrl).toBe("https://www.google.com/maps/search/?api=1&query=18.507400,73.807700");
    expect(doc!.interestsStory).toEqual({ title: "My first marathon", body: "First paragraph.\n\nSecond paragraph." });
    // The "Beyond medicine" photo goes with the story; timings typed as text are read into the week.
    expect(doc!.interestsPhoto).toMatchObject({ publicId: photo(15).publicId, caption: "My first marathon" });
    expect(doc!.clinics[0]!.timings.find((t) => t.day === 1)?.slots).toEqual([{ open: "10:00", close: "13:00" }]);
    expect(doc!.clinics[0]!.timings.find((t) => t.day === 0)?.slots ?? []).toEqual([]);
    expect(doc!.portfolioTemplateId).toBe("classic");
    expect(doc!.cardStyle).toBe("DOC-AMBER");
    expect(doc!.internalNotes).toContain("NOT FINAL");
    expect(doc!.links.instagram).toBe("https://instagram.com/drasha");
    expect(doc!.citySlug).toBe("pune");
    expect(doc!.internalNotes).toContain(intake!.ref);
    expect(doc!.internalNotes).toContain("MBBS – BJ Medical College – 2008");
    // Qualifications land in the real field, degrees matched by name.
    const degrees = await Degree.find({ _id: { $in: doc!.qualifications.map((q) => q.degreeId) } }).lean();
    expect(doc!.qualifications.map((q) => [degrees.find((d) => String(d._id) === String(q.degreeId))?.name, q.institute, q.year])).toEqual([
      ["MBBS", "BJ Medical College", 2008],
      ["MD", "KEM", 2012],
    ]);
    expect(doc!.internalNotes).not.toContain("Please enter in the editor: qualifications");
  });

  it("adds a council, degree and area the lists don't have yet (what the applicant typed)", async () => {
    const data = { ...fullDoctor(), council: "MCIM", qualifications: "BAMS,\nMD (Kayachikitsa)", clinics: [{ ...(fullDoctor().clinics as RepeatItem[])[0], area: "Zz New Area" }] };
    const r = await saveIntake({ kind: "doctor", email: "conv2@example.com", data, photos: {} }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    const made = await createSiteFromIntake(intake!);
    const doc = await DoctorProfile.findById(made.id).lean();
    expect((await Council.findById(doc!.registration.councilId).lean())?.name).toBe("MCIM");
    expect(doc!.qualifications).toHaveLength(2);
    expect(doc!.qualifications[1]).toMatchObject({ specialization: "Kayachikitsa", institute: "" });
    expect(doc!.clinics).toHaveLength(1);
    expect((await Area.findById(doc!.clinics[0]!.areaId).lean())?.name).toBe("Zz New Area");
    // A second form with the same council doesn't make a duplicate.
    expect((await findOrCreateMaster("council", "mcim")).created).toBe(false);
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
      doctors: [
        { name: "Dr. Neha Joshi", designation: "Dermatologist", education: "MBBS, MD", role: "founder", portfolioUrl: "https://drneha.example.com", photo: photo(21) },
        { name: "Dr. A Rao", designation: "Cardiologist", education: "MD", role: "visiting", portfolioUrl: "" },
      ],
      awards: "NABH accreditation – 2022",
      services: "Acne care",
      websiteDesign: "dental",
      designDecision: "final",
    };
    const r = await saveIntake({ kind: "clinic", email: "clinic@example.com", data, photos: { logo: photo(20) } }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    const made = await createSiteFromIntake(intake!);
    const e = await Establishment.findById(made.id).lean();
    expect(e).toMatchObject({ kind: "clinic", plan: "clinic", status: "draft", name: "Shree Skin Clinic", themeKey: "dental", ownerEmail: "clinic@example.com" });
    expect(e!.internalNotes).toContain("Final choice.");
    expect(e!.address.areaId).toBeDefined();
    expect(e!.contact.phones).toEqual(["020 1234 5678", "98765 00000"]);
    expect(e!.doctors[0]).toMatchObject({ name: "Dr. Neha Joshi", specialty: "Dermatologist", qualifications: "MBBS, MD", role: "Founder / Owner" });
    expect(e!.doctors[1]).toMatchObject({ name: "Dr. A Rao", specialty: "Cardiologist", role: "Visiting consultant" });
    expect(e!.categoryId).toBeDefined();
    expect(e!.internalNotes).toContain("NABH accreditation – 2022");
    expect(e!.internalNotes).toContain("https://drneha.example.com");
    expect(e!.internalNotes).toContain(photo(21).url);
    expect(e!.logo?.publicId).toBe(photo(20).publicId);
    expect(e!.slug).toBeTruthy();
  });

  it("maps hospital departments and their doctors", async () => {
    const doc = (name: string, designation = ""): DoctorEntry => ({ name, designation, education: "", role: "consultant", portfolioUrl: "" });
    const data = {
      ...emptyIntakeData("hospital"),
      name: "Sample Care Hospital",
      departments: [
        { name: "Orthopaedics", doctors: [doc("Dr. A Patil", "Orthopaedic Surgeon"), doc("Dr. S Rao")] },
        { name: "Emergency", doctors: [doc("Dr. A Patil", "Orthopaedic Surgeon")] },
      ],
    };
    const r = await saveIntake({ kind: "hospital", email: "hosp@example.com", data, photos: {} }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    const made = await createSiteFromIntake(intake!);
    const e = await Establishment.findById(made.id).lean();
    expect(e!.departments.map((d) => d.name)).toEqual(["Orthopaedics", "Emergency"]);
    expect(e!.doctors.map((d) => d.name)).toEqual(["Dr. A Patil", "Dr. S Rao"]); // each doctor once
    expect(e!.doctors[0]).toMatchObject({ specialty: "Orthopaedic Surgeon", role: "Consultant" });
    // Each department keeps its doctors (by key: none has a portfolio yet).
    const key = (n: string) => e!.doctors.find((d) => d.name === n)!.key;
    expect(e!.departments.map((d) => d.doctorKeys)).toEqual([[key("Dr. A Patil"), key("Dr. S Rao")], [key("Dr. A Patil")]]);
    expect(e!.internalNotes).not.toContain("which doctors are in which department");
    expect(e!.internalNotes).toContain("Department 2:");
  });

  it("puts a hospital in the category for its type (or the general Hospital one)", async () => {
    const make = async (email: string, hospitalType: string) => {
      const r = await saveIntake({ kind: "hospital", email, data: { ...emptyIntakeData("hospital"), name: `Type ${hospitalType || "none"} Hospital`, hospitalType }, photos: {} }, null);
      const made = await createSiteFromIntake((await Intake.findById(r.ok ? r.intake.id : "").lean())!);
      const e = await Establishment.findById(made.id).lean();
      return (await ClinicCategory.findById(e!.categoryId).lean())!;
    };
    expect(await make("maternity@example.com", "maternity")).toMatchObject({ slug: "maternity-hospital", kind: "hospital", name: "Maternity Hospital" });
    expect((await make("ent@example.com", "ent")).slug).toBe("ent-hospital");
    expect((await make("notype@example.com", "")).slug).toBe("small-hospital");
    expect(siteHints("MR-9", "hospital", { ...emptyIntakeData("hospital"), hospitalType: "children" }).category).toBe("Children's Hospital");
  });

  it("refuses a doctor form without a full name", async () => {
    const r = await saveIntake({ kind: "doctor", email: "noname@example.com", data: { fullName: "Asha" }, photos: {} }, null);
    const intake = await Intake.findById(r.ok ? r.intake.id : "").lean();
    await expect(createSiteFromIntake(intake!)).rejects.toThrow(/first and last name/);
  });
});
