import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { seedMasters } from "@/lib/seed/masters";
import { sectionSchemas, emptyDoctorForm, emptyClinic, publishBlockers, sectionPayload, complianceTextFields } from "@/lib/doctors/form";
import { applySection, docToForm, ensureUrlKeys, publishProblems, scanDoctor, urlKeyAvailable } from "@/lib/doctors/server";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { scanFields } from "@/lib/compliance/scan";
import { fillShareTemplate } from "@/lib/share-message";
import { seoHealth } from "@/lib/admin/seo-health";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";
import type { CurrentAdmin } from "@/lib/auth/admin";

let mongod: MongoMemoryServer;
const admin: CurrentAdmin = { id: "507f1f77bcf86cd799439011", name: "Test Admin", email: "a@example.com", role: "admin" };
const sales: CurrentAdmin = { ...admin, role: "sales" };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_doctors_test";
  await connectToDatabase();
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function ids() {
  const pune = (await City.findOne({ slug: "pune" }).lean())!;
  const kothrud = (await Area.findOne({ slug: "kothrud", cityId: pune._id }).lean())!;
  const gp = (await Specialty.findOne({ slug: "general-physician" }).lean())!;
  const mmc = (await Council.findOne({ slug: "maharashtra-medical-council" }).lean())!;
  const mbbs = (await Degree.findOne({ slug: "mbbs" }).lean())!;
  return { pune: String(pune._id), kothrud: String(kothrud._id), gp: String(gp._id), mmc: String(mmc._id), mbbs: String(mbbs._id) };
}

/** Run one editor step through the same validation + apply path the action uses. */
async function save(doc: InstanceType<typeof DoctorProfile>, step: keyof typeof sectionSchemas, form: ReturnType<typeof emptyDoctorForm>, who = admin) {
  const parsed = sectionSchemas[step].parse(sectionPayload(step, form));
  await applySection(doc, step, parsed as never, who);
  await ensureUrlKeys(doc);
  await doc.save();
}

describe("doctor editor (server)", () => {
  it("builds a draft step by step, generates URL keys and becomes publishable", async () => {
    const x = await ids();
    const f = emptyDoctorForm();
    f.firstName = "Amit";
    f.lastName = "Shah";
    const doc = new DoctorProfile({ firstName: "x", lastName: "x" });
    await save(doc, "basics", f);
    expect(doc.shortSlug).toBeUndefined(); // waits for the clinic (area suffix on clash)
    expect(doc.slug).toBeUndefined(); // needs specialty + clinic first

    f.registration = { councilId: x.mmc, number: "2010/01/1234", year: 2010, nmrId: "" };
    f.qualifications = [{ degreeId: x.mbbs, specialization: "", institute: "BJ Medical College", year: 2008 }];
    await save(doc, "registration", f);
    f.primarySpecialtyId = x.gp;
    f.services = [{ name: "Diabetes care", description: "" }];
    await save(doc, "practice", f);
    f.clinics = [{ ...emptyClinic(x.pune), name: "Shah Clinic", addressLine1: "1 Karve Road", areaId: x.kothrud, pincode: "411038" }];
    await save(doc, "clinics", f);
    expect(doc.citySlug).toBe("pune");
    expect(doc.slug).toBe("dr-amit-shah-general-physician");
    expect(doc.shortSlug).toBe("dr-amit-shah");

    // Not publishable until the doctor's approval is recorded.
    expect(publishProblems(doc, [])).toEqual(["Doctor's approval (date and how they approved)"]);
    f.approval = { doctorApprovedAt: "2026-11-15", approvedVia: "whatsapp" };
    await save(doc, "review", f);
    expect(publishProblems(doc, scanDoctor(doc, DEFAULT_BANNED_PHRASES))).toEqual([]);
    expect(docToForm(doc.toObject()).approval).toEqual({ doctorApprovedAt: "2026-11-15", approvedVia: "whatsapp" });
  });

  it("de-duplicates slugs and short slugs", async () => {
    const x = await ids();
    const f = emptyDoctorForm();
    f.firstName = "Amit";
    f.lastName = "Shah";
    f.primarySpecialtyId = x.gp;
    f.clinics = [{ ...emptyClinic(x.pune), name: "Other Clinic", addressLine1: "2 Road", areaId: x.kothrud, pincode: "411038" }];
    const doc = new DoctorProfile({ firstName: "x", lastName: "x" });
    await save(doc, "basics", f);
    await save(doc, "practice", f);
    await save(doc, "clinics", f);
    expect(doc.shortSlug).toBe("dr-amit-shah-kothrud");
    expect(doc.slug).toBe("dr-amit-shah-general-physician-2");
    expect(await urlKeyAvailable("shortSlug", "dr-amit-shah", {})).toBe(false);
    expect(await urlKeyAvailable("shortSlug", "dr-amit-shah", { excludeId: String((await DoctorProfile.findOne({ shortSlug: "dr-amit-shah" }))!._id) })).toBe(true);
  });

  it("rejects an area from another city", async () => {
    const x = await ids();
    const mumbai = await City.create({ name: "Mumbai", slug: "mumbai", state: "Maharashtra" });
    const f = emptyDoctorForm();
    f.firstName = "Neha";
    f.lastName = "Joshi";
    f.clinics = [{ ...emptyClinic(String(mumbai._id)), name: "C", addressLine1: "A", areaId: x.kothrud, pincode: "400001" }];
    const doc = new DoctorProfile({ firstName: "Neha", lastName: "Joshi" });
    await expect(save(doc, "clinics", f)).rejects.toThrow(/area doesn't belong/);
  });

  it("assigns founding numbers in order, only for admins", async () => {
    const f = emptyDoctorForm();
    f.firstName = "Ravi";
    f.lastName = "Kulkarni";
    f.foundingDoctor = true;
    const a = new DoctorProfile({ firstName: "Ravi", lastName: "Kulkarni" });
    await save(a, "business", f);
    const b = new DoctorProfile({ firstName: "Sita", lastName: "Patil" });
    await save(b, "business", f);
    expect([a.foundingNumber, b.foundingNumber]).toEqual([1, 2]);
    expect(a.hostingFreeUntil).toBeNull(); // founding = free forever

    const c = new DoctorProfile({ firstName: "Om", lastName: "Rao" });
    await save(c, "business", f, sales);
    expect(c.foundingDoctor).toBe(false);
    expect(c.foundingNumber).toBeUndefined();
  });

  it("validates step input (registration year, award fields, gallery limit)", () => {
    expect(sectionSchemas.basics.safeParse(sectionPayload("basics", { ...emptyDoctorForm(), firstName: "", lastName: "X" })).success).toBe(false);
    const about = sectionPayload("about", {
      ...emptyDoctorForm(),
      awards: [{ title: "Gold medal", awardingBody: "", year: 2010 }],
    });
    const res = sectionSchemas.about.safeParse(about);
    expect(res.success).toBe(false);
    const img = { publicId: "p", url: "https://res.cloudinary.com/x/image/upload/p.jpg", caption: "" };
    const tooMany = sectionSchemas.about.safeParse(sectionPayload("about", { ...emptyDoctorForm(), gallery: Array(6).fill(img) }));
    expect(tooMany.success).toBe(false);
    const foreignImage = sectionSchemas.basics.safeParse(
      sectionPayload("basics", { ...emptyDoctorForm(), firstName: "A", lastName: "B", photo: { publicId: "p", url: "https://evil.example/p.jpg" } }),
    );
    expect(foreignImage.success).toBe(false);
  });

  it("scans every free-text field for NMC phrases", () => {
    const f = { ...emptyDoctorForm(), shortBio: "The best doctor", interests: ["Guaranteed fun"] };
    f.gallery = [{ publicId: "p", url: "https://res.cloudinary.com/x/p.jpg", caption: "100% results" }];
    const issues = scanFields(complianceTextFields(f), DEFAULT_BANNED_PHRASES).map((i) => i.field);
    expect(issues).toEqual(expect.arrayContaining(["shortBio", "interests.0", "gallery.0.caption"]));
    expect(publishBlockers(f).map((b) => b.field)).toContain("registration");
  });
});

describe("small helpers", () => {
  it("fills the WhatsApp share template and always includes the link", () => {
    expect(fillShareTemplate("Hi, see {name}: {link}", { name: "Dr. A", link: "https://x" })).toBe("Hi, see Dr. A: https://x");
    expect(fillShareTemplate("Hello", { name: "Dr. A", link: "https://x" })).toBe("Hello https://x");
  });

  it("reports SEO health gaps", () => {
    const h = seoHealth({ photo: undefined, shortBio: "", clinics: [], seo: { noindex: true }, compliance: { issues: [{ field: "a", phrase: "best" }] } } as never);
    expect(h).toEqual({ missing: ["Photo", "Short bio", "Clinic"], issues: 1, noindex: true });
  });
});
