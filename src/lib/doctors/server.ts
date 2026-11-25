import "server-only";
import { Types, type HydratedDocument } from "mongoose";
import { scanFields, type ComplianceIssue } from "@/lib/compliance/scan";
import { can, type CurrentAdmin } from "@/lib/auth/admin";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { doctorSlug, shortSlugCandidates, slugify, subdomainError } from "@/lib/slug";
import { toDateInput } from "@/lib/format";
import { nextFoundingNumber } from "@/lib/founding";
import { computeRenewalStatus, firstRenewalDue } from "@/lib/renewals";
import { getSettings } from "@/lib/settings";
import { Establishment } from "@/models/Establishment";
import { sharedUrlKeyTaken } from "@/lib/url-keys";
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
const uniq = (ids: string[]) => [...new Set(ids)];
const toOids = (ids: string[]) => ids.map((x) => new Types.ObjectId(x));

/** Establishment links, including v1 hospital links on doctors not yet migrated (same ids after migrate:v2). */
function linkedEstablishmentIds(d: DoctorProfileDoc): string[] {
  return uniq([
    ...(d.establishmentIds ?? []).map(String),
    ...(d.hospitalAccountId ? [String(d.hospitalAccountId)] : []),
    ...d.clinics.flatMap((c) => (c.establishmentId ? [String(c.establishmentId)] : c.hospitalId ? [String(c.hospitalId)] : [])),
  ]);
}

async function assertEstablishmentsExist(ids: string[], field: string): Promise<void> {
  const wanted = uniq(ids);
  if (!wanted.length) return;
  const found = await Establishment.countDocuments({ _id: { $in: toOids(wanted) } });
  if (found !== wanted.length) throw new ActionError("A linked clinic or hospital no longer exists. Pick it again.", { [field]: "Not found." });
}

export function docToForm(d: DoctorProfileDoc): DoctorForm {
  return {
    id: String(d._id),
    ...(d.uid ? { uid: d.uid } : {}),
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
    systemOther: s(d.systemOther),
    registration: {
      councilId: s(d.registration?.councilId),
      number: s(d.registration?.number),
      year: d.registration?.year ?? undefined,
      nmrId: s(d.registration?.nmrId),
    },
    qualifications: d.qualifications.map((q) => ({
      degreeId: s(q.degreeId),
      specialization: s(q.specialization),
      institute: q.institute ?? "",
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
      // `hospitalId` covers doctors not yet migrated (migrate:v2 keeps the same id).
      establishmentId: s(c.establishmentId ?? c.hospitalId),
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
    ...(d.interestsPhoto
      ? { interestsPhoto: { publicId: d.interestsPhoto.publicId, url: d.interestsPhoto.url, alt: d.interestsPhoto.alt, caption: s(d.interestsPhoto.caption) } }
      : {}),
    interestsStory: { title: s(d.interestsStory?.title), body: s(d.interestsStory?.body) },
    gallery: d.gallery.map((g) => ({ publicId: g.publicId, url: g.url, alt: g.alt, caption: g.caption ?? "" })),
    seo: {
      titleOverride: s(d.seo?.titleOverride),
      descriptionOverride: s(d.seo?.descriptionOverride),
      noindex: Boolean(d.seo?.noindex),
    },
    // Old v1 values (not migrated yet) read as their v2 equivalents; saving the Business step writes v2.
    plan: d.plan === "hospital" || d.plan === "doctor_addon" ? "doctor_addon" : "doctor",
    founding: Boolean(d.founding || d.foundingDoctor),
    foundingNumber: d.foundingNumber ?? undefined,
    setupPaidAt: d.setupPaidAt ? toDateInput(d.setupPaidAt) : "",
    renewalPrice: d.renewalPrice ?? undefined,
    renewalDueDate: d.renewalDueDate ? toDateInput(d.renewalDueDate) : "",
    renewalStatus: d.renewalStatus ?? "active",
    freeUpdateUsed: d.freeUpdateUsed,
    ownDomain: {
      name: s(d.ownDomain?.name),
      status: d.ownDomain?.status ?? "requested",
      cost: d.ownDomain?.cost ?? undefined,
      renewalDate: d.ownDomain?.renewalDate ? toDateInput(d.ownDomain.renewalDate) : "",
    },
    establishmentIds: linkedEstablishmentIds(d),
    salesExecutive: s(d.salesExecutive),
    salesExecutiveId: s(d.salesExecutiveId),
    source: d.source ?? "",
    internalNotes: s(d.internalNotes),
    portfolioTemplateId: d.portfolioTemplateId,
    cardTemplateId: d.cardTemplateId,
    cardStyle: d.cardStyle ?? "",
    showHealthTips: d.showHealthTips !== false,
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
  admin: CurrentAdmin | null,
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
        systemOther: d.systemOfMedicine === "other" ? d.systemOther : undefined,
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
          establishmentId: toOid(c.establishmentId),
          hospitalId: undefined, // v1 link, replaced by establishmentId
        })),
      });
      // A clinic linked to an establishment also links the doctor to it.
      const clinicLinks = d.clinics.map((c) => c.establishmentId).filter((x): x is string => Boolean(x));
      await assertEstablishmentsExist(clinicLinks, "clinics");
      doc.establishmentIds = toOids(uniq([...doc.establishmentIds.map(String), ...clinicLinks]));
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
        // undefined unsets the photo when it was removed.
        interestsPhoto: d.interestsPhoto,
        interestsStory: d.interestsStory.title ? d.interestsStory : undefined,
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
      // Clinic links can't be dropped here; unlink the clinic in the Clinics step instead.
      const clinicLinks = doc.clinics.map((c) => c.establishmentId).filter(Boolean).map(String);
      const links = uniq([...d.establishmentIds, ...clinicLinks]);
      await assertEstablishmentsExist(d.establishmentIds, "establishmentIds");
      doc.set({
        plan: d.plan,
        freeUpdateUsed: d.freeUpdateUsed,
        establishmentIds: toOids(links),
        hospitalAccountId: undefined, // v1 link, replaced by establishmentIds
        salesExecutive: d.salesExecutive,
        salesExecutiveId: d.salesExecutiveId,
        source: d.source,
        internalNotes: d.internalNotes,
      });
      if (admin && can.publish(admin.role)) {
        if (d.founding && !doc.foundingNumber) doc.foundingNumber = await nextFoundingNumber();
        if (!d.founding) doc.foundingNumber = undefined;
        doc.founding = d.founding;
        doc.foundingDoctor = d.founding; // keep the v1 flag in step until migrate:v2 --drop-legacy
        doc.hostingFreeUntil = undefined;

        // Empty price = the list price from Settings (the form pre-fills it when founding is toggled).
        const { prices } = await getSettings();
        doc.renewalPrice = d.renewalPrice ?? (d.founding ? prices.foundingRenewal : prices.renewalDoctor);
        doc.setupPaidAt = d.setupPaidAt;
        doc.renewalDueDate = d.renewalDueDate ?? (d.setupPaidAt ? firstRenewalDue(d.setupPaidAt) : undefined);
        doc.ownDomain = d.ownDomain.name
          ? { name: d.ownDomain.name, status: d.ownDomain.status, cost: d.ownDomain.cost, renewalDate: d.ownDomain.renewalDate }
          : undefined;
      }
      // A lapsed site stays lapsed until a renewal is recorded (renewals job / payments).
      if (doc.renewalStatus !== "lapsed") doc.renewalStatus = computeRenewalStatus(doc.renewalDueDate);
      break;
    }
    case "templates": {
      const d = input as SectionData<"templates">;
      const ready = await TemplateSlot.find({ status: "ready" }).select({ type: 1, key: 1 }).lean();
      const ok = (type: string, key: string) => ready.some((r) => r.type === type && r.key === key);
      if (!ok("portfolio", d.portfolioTemplateId)) throw new ActionError("That portfolio design isn't ready yet.");
      if (!ok("card", d.cardTemplateId)) throw new ActionError("That card design isn't ready yet.");
      // cardStyle is undefined when the default is chosen, which clears the field.
      doc.set({ portfolioTemplateId: d.portfolioTemplateId, cardTemplateId: d.cardTemplateId, cardStyle: d.cardStyle, showHealthTips: d.showHealthTips });
      break;
    }
    case "review":
    case "publish": {
      const d = input as SectionData<"publish">;
      doc.set({
        "compliance.doctorApprovedAt": d.approval.doctorApprovedAt,
        "compliance.approvedVia": d.approval.approvedVia,
      });
      break;
    }
  }
}

/**
 * Throw a field error if a URL key is taken. The page slug is per city among
 * doctors; short links and website addresses (subdomains) are shared with
 * clinics and hospitals.
 */
export async function assertUrlKeysFree(
  doc: DoctorDocument,
  keys: { slug?: string; shortSlug?: string; subdomain?: string },
): Promise<void> {
  const owner = { kind: "doctor" as const, id: doc._id };
  if (keys.slug && doc.citySlug && (await DoctorProfile.exists({ _id: { $ne: doc._id }, citySlug: doc.citySlug, slug: keys.slug }))) {
    throw new ActionError("That page address is already taken in this city.", { slug: "Already taken." });
  }
  if (keys.shortSlug && (await sharedUrlKeyTaken("shortSlug", keys.shortSlug, owner))) {
    throw new ActionError("That short link is already taken.", { shortSlug: "Already taken." });
  }
  if (keys.subdomain && (await sharedUrlKeyTaken("subdomain", keys.subdomain, owner))) {
    throw new ActionError("That website address is already taken.", { subdomain: "Already taken." });
  }
}

/** Is a URL key free? Used by the live availability check. */
export async function urlKeyAvailable(
  kind: "slug" | "shortSlug" | "subdomain",
  value: string,
  opts: { excludeId?: string; citySlug?: string },
): Promise<boolean> {
  if (kind !== "slug") return !(await sharedUrlKeyTaken(kind, value, { kind: "doctor", ...(opts.excludeId ? { id: opts.excludeId } : {}) }));
  const filter: Record<string, unknown> = { slug: value, citySlug: opts.citySlug ?? "pune" };
  if (opts.excludeId) filter._id = { $ne: new Types.ObjectId(opts.excludeId) };
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
      if (!(await sharedUrlKeyTaken("shortSlug", candidate, { kind: "doctor", id: doc._id }))) {
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
