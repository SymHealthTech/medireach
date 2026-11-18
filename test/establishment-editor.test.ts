import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { seedMasters } from "@/lib/seed/masters";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { emptyEstablishmentForm, publishBlockers, sectionPayload, sectionSchemas, type EstablishmentForm } from "@/lib/establishments/form";
import { applySection, docToForm, ensureUrlKeys, publishProblems, scanEstablishment, subdomainSuggestions } from "@/lib/establishments/server";
import { syncDoctorLinksFromEstablishment } from "@/lib/establishments/links";
import { establishmentDescription, establishmentIntro, establishmentTitle } from "@/lib/seo/establishment";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

let mongod: MongoMemoryServer;
const admin: CurrentAdmin = { id: "507f1f77bcf86cd799439011", name: "Test Admin", email: "a@example.com", role: "admin" };
const sales: CurrentAdmin = { ...admin, role: "sales" };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_est_editor_test";
  await connectToDatabase();
  await seedMasters();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function ids() {
  const pune = (await City.findOne({ slug: "pune" }).lean())!;
  const baner = (await Area.findOne({ slug: "baner", cityId: pune._id }).lean())!;
  const skin = (await ClinicCategory.findOne({ slug: "skin" }).lean())!;
  const hosp = (await ClinicCategory.findOne({ slug: "small-hospital" }).lean())!;
  return { pune: String(pune._id), baner: String(baner._id), skin: String(skin._id), hosp: String(hosp._id) };
}

type Doc = InstanceType<typeof Establishment>;
async function save(doc: Doc, step: keyof typeof sectionSchemas, form: EstablishmentForm, who = admin) {
  const parsed = sectionSchemas[step].parse(sectionPayload(step, form));
  await applySection(doc, step, parsed as never, who);
  await ensureUrlKeys(doc);
  await doc.save();
}

async function clinicReady(name = "Shree Skin Clinic") {
  const x = await ids();
  const f = emptyEstablishmentForm("clinic");
  f.name = name;
  f.categoryId = x.skin;
  f.themeKey = "skin";
  f.shortDescription = "Skin and hair clinic in Baner with dermatology consultations and laser procedures.";
  f.address = { ...f.address, line1: "12 Baner Road", cityId: x.pune, areaId: x.baner, pincode: "411045" };
  f.phones = ["9800000001"];
  f.approval = { ownerApprovedAt: "2026-11-15", approvedVia: "whatsapp" };
  const doc = new Establishment({ kind: "clinic", plan: "clinic", name: "x" });
  await save(doc, "basics", f);
  await save(doc, "location", f);
  await save(doc, "review", f);
  return { doc, f, x };
}

describe("clinic/hospital editor (server)", () => {
  it("builds a clinic step by step, generates addresses and becomes publishable", async () => {
    const { doc } = await clinicReady();
    expect(doc).toMatchObject({ citySlug: "pune", slug: "shree-skin-clinic-baner", shortSlug: "shree-skin-clinic", plan: "clinic" });
    expect(publishProblems(doc, scanEstablishment(doc, DEFAULT_BANNED_PHRASES))).toEqual([]);
  });

  it("de-duplicates page slugs per city and never makes a dr- short link", async () => {
    const a = await clinicReady("Dr Patil Clinic");
    const b = await clinicReady("Dr Patil Clinic");
    expect(a.doc.slug).toBe("dr-patil-clinic-baner");
    expect(b.doc.slug).toBe("dr-patil-clinic-baner-2");
    expect(a.doc.shortSlug).toBe("patil-clinic");
    expect(b.doc.shortSlug).toBe("patil-clinic-baner");
    expect(subdomainSuggestions("Shree Skin Clinic")).toEqual(["shreeskinclinic", "shree-skin-clinic"]);
  });

  it("checks the category matches the type, and the area matches the city", async () => {
    const x = await ids();
    const f = emptyEstablishmentForm("clinic");
    f.name = "Mismatch";
    f.categoryId = x.hosp;
    await expect(save(new Establishment({ kind: "clinic", plan: "clinic", name: "x" }), "basics", f)).rejects.toThrow(/for hospitals/);
  });

  it("requires a registration number to publish a hospital, and caps beds at 10", async () => {
    const x = await ids();
    const f = emptyEstablishmentForm("hospital");
    f.name = "Sai Hospital";
    f.categoryId = x.hosp;
    f.address = { ...f.address, line1: "1 Wakad Road", cityId: x.pune, areaId: x.baner, pincode: "411057" };
    f.phones = ["9800000002"];
    f.approval = { ownerApprovedAt: "2026-11-15", approvedVia: "in_person" };
    expect(publishBlockers(f).map((b) => b.message)).toContain("Hospital registration (authority and number)");

    f.beds = { total: 11, types: [] };
    expect(sectionSchemas.extras.safeParse(sectionPayload("extras", f)).success).toBe(false);
    f.beds = { total: 8, types: [{ type: "General", count: 6 }, { type: "ICU", count: 3 }] };
    expect(sectionSchemas.extras.safeParse(sectionPayload("extras", f)).success).toBe(false);
    f.beds = { total: 8, types: [{ type: "General", count: 6 }, { type: "ICU", count: 2 }] };
    f.registration = { authority: "PMC Nursing Home Registration", number: "NH-1234" };
    expect(publishBlockers(f)).toEqual([]);

    const doc = new Establishment({ kind: "hospital", plan: "hospital", name: "x" });
    for (const step of ["basics", "location", "extras", "review"] as const) await save(doc, step, f);
    expect(doc.beds?.total).toBe(8);
    expect(publishProblems(doc, [])).toEqual([]);
  });

  it("keeps hospital-only details off clinic sites", async () => {
    const { doc, f } = await clinicReady("Plain Clinic");
    f.visitingHours = "4 pm to 7 pm";
    f.beds = { total: 4, types: [] };
    f.insurance = { cashless: true, providers: ["Star Health"] };
    await save(doc, "extras", f);
    expect(doc.beds).toBeUndefined();
    expect(doc.visitingHours).toBeUndefined();
    expect(doc.insurance?.providers).toEqual(["Star Health"]);
  });

  it("links doctors both ways and keeps departments to the team", async () => {
    const x = await ids();
    const amit = await DoctorProfile.create({ firstName: "Amit", lastName: "Shah" });
    const neha = await DoctorProfile.create({
      firstName: "Neha",
      lastName: "Rao",
      clinics: [{ name: "Sai", addressLine1: "A", areaId: x.baner, cityId: x.pune, state: "MH", pincode: "411057" }],
    });
    const f = emptyEstablishmentForm("hospital");
    f.name = "Sai Hospital Two";
    f.categoryId = x.hosp;
    const doc = new Establishment({ kind: "hospital", plan: "hospital", name: "x" });
    await save(doc, "basics", f);

    f.doctors = [
      { key: "a", doctorProfileId: String(amit._id), name: "", qualifications: "", specialty: "", role: "" },
      { key: "n", doctorProfileId: String(neha._id), name: "", qualifications: "", specialty: "", role: "Consultant" },
      { key: "v", doctorProfileId: "", name: "Dr. Visiting", qualifications: "MS", specialty: "Surgeon", role: "" },
    ];
    await save(doc, "doctors", f);
    await syncDoctorLinksFromEstablishment(doc._id, [], [String(amit._id), String(neha._id)]);
    expect((await DoctorProfile.findById(amit._id).lean())!.establishmentIds.map(String)).toEqual([String(doc._id)]);

    f.departments = [{ key: "d", name: "Medicine", description: "", doctorIds: [String(amit._id), String(neha._id)] }];
    await save(doc, "extras", f);
    expect(doc.departments[0]!.doctorIds).toHaveLength(2);

    // Removing a doctor from the team drops them from departments and unlinks their page.
    await DoctorProfile.updateOne({ _id: neha._id }, { $set: { "clinics.0.establishmentId": doc._id } });
    f.doctors = f.doctors.filter((d) => d.key !== "n");
    await save(doc, "doctors", f);
    await syncDoctorLinksFromEstablishment(doc._id, [String(amit._id), String(neha._id)], [String(amit._id)]);
    expect(doc.departments[0]!.doctorIds.map(String)).toEqual([String(amit._id)]);
    const nehaAfter = (await DoctorProfile.findById(neha._id).lean())!;
    expect(nehaAfter.establishmentIds).toEqual([]);
    expect(nehaAfter.clinics[0]!.establishmentId).toBeUndefined();

    // A department can't list someone outside the team.
    f.departments = [{ key: "d", name: "Medicine", description: "", doctorIds: [String(neha._id)] }];
    await expect(save(doc, "extras", f)).rejects.toThrow(/isn't on the Doctors step/);
  });

  it("caps the gallery by type, prices renewals by type, and only admins set founding", async () => {
    const { doc, f } = await clinicReady("Gallery Clinic");
    const photo = { publicId: "p", url: "https://res.cloudinary.com/x/p.jpg", caption: "Reception" };
    f.gallery = Array.from({ length: 9 }, (_, i) => ({ ...photo, publicId: `p${i}` }));
    await expect(save(doc, "gallery", f)).rejects.toThrow(/At most 8 photos/);

    f.founding = true;
    f.setupPaidAt = "2026-11-01";
    await save(doc, "business", f, sales);
    expect(doc.founding).toBe(false);
    await save(doc, "business", f);
    expect(doc).toMatchObject({ founding: true, renewalPrice: 499, renewalStatus: "active" });
    expect(docToForm(doc.toObject()).renewalDueDate).toBe("2027-11-01");
    expect(doc.foundingNumber).toBeGreaterThan(0);
  });

  it("scans tagline, services and captions for NMC phrases", async () => {
    const f = emptyEstablishmentForm("clinic");
    f.tagline = "Best skin clinic in Pune";
    f.services = [{ name: "Laser", description: "100% results guaranteed", group: "" }];
    const doc = new Establishment({ kind: "clinic", plan: "clinic", name: "Scan", tagline: f.tagline, services: f.services });
    const fields = scanEstablishment(doc, DEFAULT_BANNED_PHRASES).map((i) => i.field);
    expect(fields).toContain("tagline");
    expect(fields).toContain("services.0.description");
  });

  it("writes titles and intros in the spec's format", () => {
    const base = { kind: "clinic" as const, name: "Shree Skin Clinic", categoryName: "Skin Clinic", area: "Baner", city: "Pune" };
    expect(establishmentTitle(base)).toBe("Shree Skin Clinic – Skin Clinic in Baner, Pune | MediReach");
    expect(establishmentTitle({ ...base, kind: "hospital", name: "Sai Hospital" })).toBe("Sai Hospital – Hospital in Baner, Pune | MediReach");
    expect(establishmentDescription(base)).toBe("Shree Skin Clinic, skin clinic in Baner, Pune. Doctors, services, timings, address and contact.");
    expect(establishmentIntro({ ...base, doctorCount: 3 })).toBe("Shree Skin Clinic is a skin clinic in Baner, Pune, with 3 doctors.");
    expect(establishmentIntro({ ...base, categoryName: "ENT Clinic" })).toBe("Shree Skin Clinic is an ENT clinic in Baner, Pune.");
  });
});
