import "server-only";
import { Types, type HydratedDocument } from "mongoose";
import { scanFields, type ComplianceIssue } from "@/lib/compliance/scan";
import { can, type CurrentAdmin } from "@/lib/auth/admin";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { doctorSlug, shortSlugCandidates, slugify, subdomainError } from "@/lib/slug";
import { toDateInput } from "@/lib/format";
import { ActionError } from "@/lib/admin/action";
import {
  ALL_DAYS,
  complianceTextFields,
  publishBlockers,
  randomKey,
  sectionSchemas,
  type DoctorForm,
  type StepKey,
} from "@/lib/doctors/form";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";
import type { z } from "zod";

/** Server-side doctor editing: DB ↔ form mapping, section saves, URL keys, publish checks. */

export type DoctorDocument = HydratedDocument<DoctorProfileDoc>;

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function docToForm(d: DoctorProfileDoc): DoctorForm {
  return {
    id: String(d._id),
    status: d.status,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : undefined,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    slug: s(d.slug),
    shortSlug: s(d.shortSlug),
    citySlug: s(d.citySlug),
    subdomain: s(d.subdomain),
    title: d.title || "Dr.",
    firstName: d.firstName,
    middleName: s(d.middleName),
    lastName: d.lastName,
    displayName: s(d.displayName),
    gender: d.gender ?? "",
    ...(d.photo ? { photo: { publicId: d.photo.publicId, url: d.photo.url, alt: d.photo.alt } } : {}),
    languages: [...d.languages],
    practiceSinceYear: d.practiceSinceYear ?? undefined,
    systemOfMedicine: d.systemOfMedicine,
    registration: {
      councilId: s(d.registration?.councilId),
      number: s(d.registration?.number),
      year: d.registration?.year ?? undefined,
      nmrId: s(d.registration?.nmrId),
    },
    qualifications: d.qualifications.map((q) => ({
      degreeId: s(q.degreeId),
      specialization: s(q.specialization),
      institute: q.institute,
      year: q.year ?? undefined,
    })),
    practitionerType: d.practitionerType,
    primarySpecialtyId: s(d.primarySpecialtyId),
    secondarySpecialtyIds: d.secondarySpecialtyIds.map(String),
    services: d.services.map((x) => ({ name: x.name, description: s(x.description) })),
    conditionsTreated: [...d.conditionsTreated],
    clinics: d.clinics.map((c) => ({
      key: String(c._id),
      name: c.name,
      type: c.type,
      addressLine1: c.addressLine1,
      addressLine2: s(c.addressLine2),
      cityId: s(c.cityId),
      areaId: s(c.areaId),
      state: c.state,
      pincode: c.pincode,
      mapsUrl: s(c.mapsUrl),
      lat: c.geo ? String(c.geo.lat) : "",
      lng: c.geo ? String(c.geo.lng) : "",
      phone: s(c.phone),
      timings: ALL_DAYS.map((day) => ({
        day,
        slots: (c.timings.find((x) => x.day === day)?.slots ?? []).map((sl) => ({ open: sl.open, close: sl.close })),
      })),
      appointmentNote: s(c.appointmentNote),
      fee: c.fee ?? undefined,
      showFee: Boolean(c.showFee),
      hospitalId: s(c.hospitalId),
    })),
    mobile: s(d.mobile),
    whatsapp: s(d.whatsapp),
    email: s(d.email),
    links: {
      googleBusiness: s(d.links?.googleBusiness),
      practo: s(d.links?.practo),
      instagram: s(d.links?.instagram),
      facebook: s(d.links?.facebook),
      linkedin: s(d.links?.linkedin),
      youtube: s(d.links?.youtube),
      website: s(d.links?.website),
    },
    ownerEmail: s(d.ownerEmail),
    shortBio: s(d.shortBio),
    fullBio: s(d.fullBio),
    awards: d.awards.map((a) => ({
      title: a.title,
      awardingBody: a.awardingBody,
      year: a.year,
      ...(a.photo ? { photo: { publicId: a.photo.publicId, url: a.photo.url, alt: a.photo.alt } } : {}),
    })),
    memberships: d.memberships.map((m) => ({ name: m.name, since: m.since ?? undefined })),
    publications: d.publications.map((p) => ({ title: p.title, journal: s(p.journal), year: p.year ?? undefined, url: s(p.url) })),
    interests: [...d.interests],
    gallery: d.gallery.map((g) => ({ publicId: g.publicId, url: g.url, alt: g.alt, caption: g.caption ?? "" })),
    seo: {
      titleOverride: s(d.seo?.titleOverride),
      descriptionOverride: s(d.seo?.descriptionOverride),
      noindex: Boolean(d.seo?.noindex),
    },
    plan: d.plan,
    foundingDoctor: d.foundingDoctor,
    foundingNumber: d.foundingNumber ?? undefined,
    hostingForever: d.hostingFreeUntil === null,
    hostingFreeUntil: d.hostingFreeUntil ? toDateInput(d.hostingFreeUntil) : "",
    freeUpdateUsed: d.freeUpdateUsed,
    ownDomain: {
      name: s(d.ownDomain?.name),
      status: d.ownDomain?.status ?? "requested",
      cost: d.ownDomain?.cost ?? undefined,
      renewalDate: d.ownDomain?.renewalDate ? toDateInput(d.ownDomain.renewalDate) : "",
    },
    hospitalAccountId: s(d.hospitalAccountId),
    salesExecutive: s(d.salesExecutive),
    source: d.source ?? "",
    internalNotes: s(d.internalNotes),
    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    approval: {
      doctorApprovedAt: d.compliance?.doctorApprovedAt ? toDateInput(d.compliance.doctorApprovedAt) : "",
      approvedVia: d.compliance?.approvedVia ?? "",
    },
  };
}

const toOid = (v: string | undefined) => (v ? new Types.ObjectId(v) : undefined);

type SectionData<K extends StepKey> = z.output<(typeof sectionSchemas)[K]>;

/**
 * Apply one validated section to the document. Returns the paths changed (for
 * the audit log). Role limits: sales can't set founding / hosting / domain.
 */
export async function applySection<K extends StepKey>(
  doc: DoctorDocument,
  step: K,
  input: SectionData<K>,
  admin: CurrentAdmin,
): Promise<void> {
  switch (step) {
    case "basics": {
      const d = input as SectionData<"basics">;
      doc.set({
        title: d.title || "Dr.",
        firstName: d.firstName,
        middleName: d.middleName,
        lastName: d.lastName,
        displayName: d.displayName,
        gender: d.gender,
        photo: d.photo,
        languages: d.languages,
        practiceSinceYear: d.practiceSinceYear,
      });
      break;
    }
    case "registration": {
      const d = input as SectionData<"registration">;
      doc.set({
        systemOfMedicine: d.systemOfMedicine,
        registration: {
          councilId: toOid(d.registration.councilId),
          number: d.registration.number,
          year: d.registration.year,
          nmrId: d.registration.nmrId,
        },
        qualifications: d.qualifications.map((q) => ({ ...q, degreeId: new Types.ObjectId(q.degreeId) })),
      });
      break;
    }
    case "practice": {
      const d = input as SectionData<"practice">;
      doc.set({
        practitionerType: d.practitionerType,
        primarySpecialtyId: toOid(d.primarySpecialtyId),
        secondarySpecialtyIds: d.secondarySpecialtyIds
          .filter((id) => id !== d.primarySpecialtyId)
          .map((id) => new Types.ObjectId(id)),
        services: d.services,
        conditionsTreated: d.conditionsTreated,
      });
      break;
    }
    case "clinics": {
      const d = input as SectionData<"clinics">;
      // Area must belong to the clinic's city.
      const areas = await Area.find({ _id: { $in: d.clinics.map((c) => c.areaId) } }).select({ cityId: 1 }).lean();
      d.clinics.forEach((c, i) => {
        const area = areas.find((a) => String(a._id) === c.areaId);
        if (!area || String(area.cityId) !== c.cityId) {
          throw new ActionError("The area doesn't belong to the selected city.", { [`clinics.${i}.areaId`]: "Choose an area in this city." });
        }
      });
      doc.set({
        clinics: d.clinics.map((c) => ({
          ...(/^[a-f0-9]{24}$/i.test(c.key) ? { _id: new Types.ObjectId(c.key) } : {}),
          name: c.name,
          type: c.type,
          addressLine1: c.addressLine1,
          addressLine2: c.addressLine2,
          cityId: new Types.ObjectId(c.cityId),
          areaId: new Types.ObjectId(c.areaId),
          state: c.state,
          pincode: c.pincode,
          mapsUrl: c.mapsUrl,
          geo: c.lat && c.lng ? { lat: Number(c.lat), lng: Number(c.lng) } : undefined,
          phone: c.phone,
          timings: c.timings.filter((x) => x.slots.length > 0),
          appointmentNote: c.appointmentNote,
          fee: c.fee,
          showFee: c.showFee,
          hospitalId: c.type === "hospital_visiting" ? toOid(c.hospitalId) : undefined,
        })),
      });
      break;
    }
    case "contact": {
      const d = input as SectionData<"contact">;
      doc.set({ mobile: d.mobile, whatsapp: d.whatsapp, email: d.email, links: d.links, ownerEmail: d.ownerEmail });
      break;
    }
    case "about": {
      const d = input as SectionData<"about">;
      doc.set({
        shortBio: d.shortBio,
        fullBio: sanitizeBioHtml(d.fullBio) || undefined,
        awards: d.awards,
        memberships: d.memberships,
        publications: d.publications,
        interests: d.interests,
        gallery: d.gallery,
      });
      break;
    }
    case "seo": {
      const d = input as SectionData<"seo">;
      if (d.subdomain) {
        const err = subdomainError(d.subdomain);
        if (err) throw new ActionError(err, { subdomain: err });
      }
      await assertUrlKeysFree(doc, { slug: d.slug, shortSlug: d.shortSlug, subdomain: d.subdomain });
      doc.set({ slug: d.slug ?? doc.slug, shortSlug: d.shortSlug ?? doc.shortSlug, subdomain: d.subdomain, seo: d.seo });
      break;
    }
    case "business": {
      const d = input as SectionData<"business">;
      doc.set({
        plan: d.plan,
        freeUpdateUsed: d.freeUpdateUsed,
        hospitalAccountId: toOid(d.hospitalAccountId),
        salesExecutive: d.salesExecutive,
        source: d.source,
        internalNotes: d.internalNotes,
      });
      if (can.publish(admin.role)) {
        if (d.foundingDoctor && !doc.foundingNumber) {
          const last = await DoctorProfile.findOne({ foundingNumber: { $type: "number" } })
            .sort({ foundingNumber: -1 })
            .select({ foundingNumber: 1 })
            .lean();
          doc.foundingNumber = (last?.foundingNumber ?? 0) + 1;
        }
        if (!d.foundingDoctor) doc.foundingNumber = undefined;
        doc.foundingDoctor = d.foundingDoctor;
        doc.hostingFreeUntil = d.foundingDoctor || d.hostingForever ? null : d.hostingFreeUntil;
        doc.ownDomain = d.ownDomain.name
          ? { name: d.ownDomain.name, status: d.ownDomain.status, cost: d.ownDomain.cost, renewalDate: d.ownDomain.renewalDate }
          : undefined;
      }
      break;
    }
    case "templates": {
      const d = input as SectionData<"templates">;
      const ready = await TemplateSlot.find({ status: "ready" }).select({ type: 1, key: 1 }).lean();
      const ok = (type: string, key: string) => ready.some((r) => r.type === type && r.key === key);
      if (!ok("portfolio", d.portfolioTemplateId)) throw new ActionError("That portfolio design isn't ready yet.");
      if (!ok("card", d.cardTemplateId)) throw new ActionError("That card design isn't ready yet.");
      doc.set(d);
      break;
    }
    case "review": {
      const d = input as SectionData<"review">;
      doc.set({
        "compliance.doctorApprovedAt": d.approval.doctorApprovedAt,
        "compliance.approvedVia": d.approval.approvedVia,
      });
      break;
    }
  }
}

/** Throw a field error if any URL key is used by another doctor. */
export async function assertUrlKeysFree(
  doc: DoctorDocument,
  keys: { slug?: string; shortSlug?: string; subdomain?: string },
): Promise<void> {
  const others = { _id: { $ne: doc._id } };
  if (keys.slug && doc.citySlug && (await DoctorProfile.exists({ ...others, citySlug: doc.citySlug, slug: keys.slug }))) {
    throw new ActionError("That page address is already taken in this city.", { slug: "Already taken." });
  }
  if (keys.shortSlug && (await DoctorProfile.exists({ ...others, shortSlug: keys.shortSlug }))) {
    throw new ActionError("That short link is already taken.", { shortSlug: "Already taken." });
  }
  if (keys.subdomain && (await DoctorProfile.exists({ ...others, subdomain: keys.subdomain }))) {
    throw new ActionError("That website address is already taken.", { subdomain: "Already taken." });
  }
}

/** Is a URL key free? Used by the live availability check. */
export async function urlKeyAvailable(
  kind: "slug" | "shortSlug" | "subdomain",
  value: string,
  opts: { excludeId?: string; citySlug?: string },
): Promise<boolean> {
  const filter: Record<string, unknown> = { [kind]: value };
  if (opts.excludeId) filter._id = { $ne: new Types.ObjectId(opts.excludeId) };
  if (kind === "slug") filter.citySlug = opts.citySlug ?? "pune";
  return !(await DoctorProfile.exists(filter));
}

/**
 * Fill in city slug, canonical slug and short slug once we have enough data
 * (name, primary specialty and primary clinic for the slug; name and primary
 * clinic for the short link). Existing keys are kept so
 * published URLs don't change unexpectedly.
 */
export async function ensureUrlKeys(doc: DoctorDocument): Promise<void> {
  const clinic = doc.clinics[0];
  if (clinic) {
    const city = await City.findById(clinic.cityId).select({ slug: 1 }).lean();
    if (city && !doc.citySlug) doc.citySlug = city.slug;
  }
  if (!doc.slug && doc.citySlug && doc.primarySpecialtyId) {
    const spec = await Specialty.findById(doc.primarySpecialtyId).select({ slug: 1 }).lean();
    if (spec) {
      const base = doctorSlug(doc.firstName, doc.lastName, spec.slug);
      let candidate = base;
      for (let n = 2; await DoctorProfile.exists({ _id: { $ne: doc._id }, citySlug: doc.citySlug, slug: candidate }); n++) {
        candidate = `${base}-${n}`;
      }
      doc.slug = candidate;
    }
  }
  // Wait for the primary clinic so a clash can use the area suffix
  // (dr-first-last-area) before falling back to -2, -3…
  if (!doc.shortSlug && doc.firstName && doc.lastName && clinic) {
    const areaSlug = (await Area.findById(clinic.areaId).select({ slug: 1 }).lean())?.slug;
    for (const candidate of shortSlugCandidates(doc.firstName, doc.lastName, areaSlug)) {
      if (!(await DoctorProfile.exists({ _id: { $ne: doc._id }, shortSlug: candidate }))) {
        doc.shortSlug = candidate;
        break;
      }
    }
  }
}

/** Suggested subdomain: first name, else first-last (shown in the SEO step). */
export function subdomainSuggestions(firstName: string, lastName: string): string[] {
  const first = slugify(firstName);
  const both = slugify(`${firstName} ${lastName}`);
  return [first, both, `dr-${both}`].filter((x, i, a) => x.length >= 3 && !subdomainError(x) && a.indexOf(x) === i);
}

export function scanDoctor(doc: DoctorProfileDoc, phrases: readonly string[]): ComplianceIssue[] {
  return scanFields(complianceTextFields(docToForm(doc)), phrases);
}

/** All reasons a doctor can't be published right now (empty = OK). */
export function publishProblems(doc: DoctorProfileDoc, issues: ComplianceIssue[]): string[] {
  const problems = publishBlockers(docToForm(doc)).map((b) => b.message);
  if (!doc.slug || !doc.citySlug) problems.push("Page address (set name, primary specialty and a clinic)");
  if (issues.length > 0) problems.push(`${issues.length} compliance issue${issues.length === 1 ? "" : "s"} to fix`);
  return problems;
}

export function newClinicKey(): string {
  return randomKey();
}
