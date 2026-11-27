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
import { Establishment } from "@/models/Establishment";
import { Specialty } from "@/models/Specialty";
import { syncEstablishmentDoctors } from "@/lib/establishments/links";
import type { CurrentAdmin } from "@/lib/auth/admin";

let mongod: MongoMemoryServer;
const admin: CurrentAdmin = { id: "507f1f77bcf86cd799439011", name: "Test Admin", email: "a@example.com", role: "superadmin" };
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

  it("has no separate visiting card choice: an old card code sent with the design is ignored", async () => {
    const f = emptyDoctorForm();
    f.firstName = "Ravi";
    f.lastName = "Kale";
    const doc = new DoctorProfile({ firstName: "x", lastName: "x" });
    await save(doc, "basics", f);
    await save(doc, "templates", { ...f, cardStyle: "DOC-AMBER", cardTemplateId: "t2" } as typeof f);
    const saved = (await DoctorProfile.findById(doc._id).lean()) as Record<string, unknown>;
    expect(saved.cardStyle).toBeUndefined();
    expect(saved.cardTemplateId).toBeUndefined();
    expect(docToForm(doc.toObject())).not.toHaveProperty("cardStyle");
  });

  it("saves and removes the Beyond medicine photo and story", async () => {
    const f = emptyDoctorForm();
    f.firstName = "Neha";
    f.lastName = "Joshi";
    const doc = new DoctorProfile({ firstName: "x", lastName: "x" });
    await save(doc, "basics", f);
    f.interests = ["Trekking"];
    f.interestsPhoto = { publicId: "p", url: "https://res.cloudinary.com/x/image/upload/p.jpg", caption: "Sinhagad at sunrise" };
    f.interestsStory = { title: "Sinhagad every Sunday", body: "It started with one climb.\n\nNow it's a habit." };
    await save(doc, "about", f);

    const back = docToForm((await DoctorProfile.findById(doc._id))!.toObject());
    expect(back.interestsPhoto).toMatchObject({ url: f.interestsPhoto.url, caption: "Sinhagad at sunrise" });
    expect(back.interestsStory).toEqual(f.interestsStory);

    await save(doc, "about", { ...f, interestsPhoto: undefined, interestsStory: { title: "", body: "" } });
    const cleared = (await DoctorProfile.findById(doc._id).lean())!;
    expect(cleared.interestsPhoto).toBeUndefined();
    expect(cleared.interestsStory).toBeUndefined();
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

  it("assigns founding numbers in order and the founding renewal price, only for admins", async () => {
    const f = emptyDoctorForm();
    f.firstName = "Ravi";
    f.lastName = "Kulkarni";
    f.founding = true;
    const a = new DoctorProfile({ firstName: "Ravi", lastName: "Kulkarni" });
    await save(a, "business", f);
    const b = new DoctorProfile({ firstName: "Sita", lastName: "Patil" });
    await save(b, "business", f);
    expect([a.foundingNumber, b.foundingNumber]).toEqual([1, 2]);
    expect(a).toMatchObject({ founding: true, renewalPrice: 499, renewalStatus: "active" });

    const c = new DoctorProfile({ firstName: "Om", lastName: "Rao" });
    await save(c, "business", f, sales);
    expect(c.founding).toBe(false);
    expect(c.foundingNumber).toBeUndefined();
    expect(c.renewalPrice).toBeUndefined();
  });

  it("sets the renewal due date one year after setup and works out the status", async () => {
    const f = emptyDoctorForm();
    f.setupPaidAt = "2026-11-10";
    const doc = new DoctorProfile({ firstName: "Asha", lastName: "Deshmukh" });
    await save(doc, "business", f);
    expect(doc).toMatchObject({ plan: "doctor", founding: false, renewalPrice: 999, renewalStatus: "active" });
    expect(docToForm(doc.toObject()).renewalDueDate).toBe("2027-11-10");

    // An explicit due date and price win; a date in the past is overdue.
    f.renewalDueDate = "2026-01-05";
    f.renewalPrice = 799;
    await save(doc, "business", f);
    expect(doc).toMatchObject({ renewalPrice: 799, renewalStatus: "overdue" });

    // A lapsed site stays lapsed until a renewal is recorded.
    doc.renewalStatus = "lapsed";
    await save(doc, "business", f);
    expect(doc.renewalStatus).toBe("lapsed");
  });

  it("links clinics and establishments, and keeps both sides in step", async () => {
    const x = await ids();
    const clinic = await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree Clinic" });
    const hospital = await Establishment.create({ kind: "hospital", plan: "hospital", name: "Sai Hospital" });
    const f = emptyDoctorForm();
    f.clinics = [{ ...emptyClinic(x.pune), name: "Shree Clinic", addressLine1: "A", areaId: x.kothrud, pincode: "411038", establishmentId: String(clinic._id) }];
    const doc = new DoctorProfile({ firstName: "Kiran", lastName: "Joshi" });
    await save(doc, "clinics", f);
    expect(doc.establishmentIds.map(String)).toEqual([String(clinic._id)]);
    expect(String(doc.clinics[0]!.establishmentId)).toBe(String(clinic._id));

    // Business step adds the hospital; the clinic link can't be dropped there.
    f.establishmentIds = [String(hospital._id)];
    await save(doc, "business", f);
    expect(doc.establishmentIds.map(String).sort()).toEqual([String(clinic._id), String(hospital._id)].sort());

    await syncEstablishmentDoctors(doc._id, [], doc.establishmentIds.map(String));
    await syncEstablishmentDoctors(doc._id, [], doc.establishmentIds.map(String)); // idempotent
    expect((await Establishment.findById(hospital._id).lean())!.doctors.map((d) => String(d.doctorProfileId))).toEqual([String(doc._id)]);

    f.establishmentIds = [];
    await save(doc, "business", f);
    await syncEstablishmentDoctors(doc._id, [String(clinic._id), String(hospital._id)], doc.establishmentIds.map(String));
    expect((await Establishment.findById(hospital._id).lean())!.doctors).toEqual([]);
    expect((await Establishment.findById(clinic._id).lean())!.doctors).toHaveLength(1);

    // Linking to a site that doesn't exist is refused.
    f.establishmentIds = ["507f1f77bcf86cd799439099"];
    await expect(save(doc, "business", f)).rejects.toThrow(/no longer exists/);
  });

  it("reads a not-yet-migrated v1 doctor as v2, and saving writes v2", async () => {
    const hospitalId = (await Establishment.create({ kind: "hospital", plan: "hospital", name: "Old Hospital" }))._id;
    const doc = new DoctorProfile({ firstName: "Old", lastName: "Record", plan: "hospital", foundingDoctor: true, foundingNumber: 50, hostingFreeUntil: null, hospitalAccountId: hospitalId });
    await doc.save();
    const f = docToForm(doc.toObject());
    expect(f).toMatchObject({ plan: "doctor_addon", founding: true, establishmentIds: [String(hospitalId)] });

    await save(doc, "business", f);
    expect(doc).toMatchObject({ plan: "doctor_addon", founding: true, foundingNumber: 50, renewalPrice: 499 });
    expect(doc.hospitalAccountId).toBeUndefined();
    expect(doc.hostingFreeUntil).toBeUndefined();
    expect(doc.establishmentIds.map(String)).toEqual([String(hospitalId)]);
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
    f.interestsStory = { title: "Running", body: "The best race of my life" };
    f.interestsPhoto = { publicId: "q", url: "https://res.cloudinary.com/x/q.jpg", caption: "The best runner" };
    const issues = scanFields(complianceTextFields(f), DEFAULT_BANNED_PHRASES).map((i) => i.field);
    expect(issues).toEqual(
      expect.arrayContaining(["shortBio", "interests.0", "gallery.0.caption", "interestsStory.body", "interestsPhoto.caption"]),
    );
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
