import "server-only";
import { DEFAULT_CLINIC_THEME, DEFAULT_HOSPITAL_THEME } from "@/themes/specialty";
import { Types, type HydratedDocument } from "mongoose";
import { ActionError } from "@/lib/admin/action";
import { can, type CurrentAdmin } from "@/lib/auth/admin";
import { scanFields, type ComplianceIssue } from "@/lib/compliance/scan";
import { toDateInput } from "@/lib/format";
import { nextFoundingNumber } from "@/lib/founding";
import { computeRenewalStatus, firstRenewalDue, listRenewalPrice } from "@/lib/renewals";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { getSettings } from "@/lib/settings";
import { slugify, subdomainError } from "@/lib/slug";
import { freeSubdomain, sharedUrlKeyTaken } from "@/lib/url-keys";
import { RESERVED_SUBDOMAINS } from "@/config/reserved";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment, type EstablishmentDoc } from "@/models/Establishment";
import { TemplateSlot } from "@/models/TemplateSlot";
import {
  ALL_DAYS,
  complianceTextFields,
  departmentMemberKeys,
  galleryMax,
  publishBlockers,
  randomKey,
  siteDoctorKey,
  type EstablishmentForm,
  type SectionData,
  type StepKey,
} from "@/lib/establishments/form";

/** Server-side clinic/hospital editing: DB ↔ form mapping, step saves, URL keys, publish checks. */

export type EstablishmentDocument = HydratedDocument<EstablishmentDoc>;

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const toOid = (v: string | undefined) => (v ? new Types.ObjectId(v) : undefined);

type TeamDoctor = { key?: string | null; doctorProfileId?: Types.ObjectId | null };
/** Is this department member (a doctor's key, or a portfolio id) this doctor? */
const isMember = (want: Set<string>, x: TeamDoctor, i: number) => want.has(siteDoctorKey(x, i)) || (Boolean(x.doctorProfileId) && want.has(String(x.doctorProfileId)));

/** Doctor keys (or portfolio ids) → how a department stores them: portfolio ids, and keys for doctors without one (in Doctors-step order). */
function departmentMembers(keys: string[], doctors: TeamDoctor[]) {
  const want = new Set(keys);
  const team = doctors.map((x, i) => ({ x, key: siteDoctorKey(x, i) })).filter((t, i) => isMember(want, t.x, i));
  return {
    doctorIds: team.flatMap(({ x }) => (x.doctorProfileId ? [x.doctorProfileId] : [])),
    doctorKeys: team.flatMap(({ x, key }) => (x.doctorProfileId ? [] : [key])),
  };
}
const date = (d?: Date | null) => (d ? toDateInput(d) : "");
const named = (list: { name: string; description?: string }[] = []) => list.map((x) => ({ name: x.name, description: s(x.description) }));

export function docToForm(d: EstablishmentDoc): EstablishmentForm {
  return {
    id: String(d._id),
    ...(d.uid ? { uid: d.uid } : {}),
    status: d.status,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : undefined,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    kind: d.kind,
    name: d.name,
    categoryId: s(d.categoryId),
    themeKey: d.themeKey,
    ...(d.logo ? { logo: { publicId: d.logo.publicId, url: d.logo.url, alt: d.logo.alt } } : {}),
    ...(d.coverPhoto ? { coverPhoto: { publicId: d.coverPhoto.publicId, url: d.coverPhoto.url, alt: d.coverPhoto.alt } } : {}),
    tagline: s(d.tagline),
    shortDescription: s(d.shortDescription),
    about: s(d.about),
    siteTemplateId: d.siteTemplateId ?? "classic",
    address: {
      line1: s(d.address?.line1),
      line2: s(d.address?.line2),
      cityId: s(d.address?.cityId),
      areaId: s(d.address?.areaId),
      state: s(d.address?.state) || "Maharashtra",
      pincode: s(d.address?.pincode),
      landmark: s(d.address?.landmark),
      parkingNote: s(d.address?.parkingNote),
    },
    mapsUrl: s(d.mapsUrl),
    lat: d.geo ? String(d.geo.lat) : "",
    lng: d.geo ? String(d.geo.lng) : "",
    phones: d.contact?.phones?.length ? [...d.contact.phones] : [""],
    whatsapp: s(d.contact?.whatsapp),
    email: s(d.contact?.email),
    emergencyPhone: s(d.contact?.emergencyPhone),
    languages: [...(d.languages ?? [])],
    links: {
      googleBusiness: s(d.links?.googleBusiness),
      practo: s(d.links?.practo),
      instagram: s(d.links?.instagram),
      facebook: s(d.links?.facebook),
      youtube: s(d.links?.youtube),
      website: s(d.links?.website),
    },
    is24x7: Boolean(d.is24x7),
    timings: ALL_DAYS.map((day) => ({
      day,
      slots: (d.timings?.find((x) => x.day === day)?.slots ?? []).map((sl) => ({ open: sl.open, close: sl.close })),
    })),
    appointmentNote: s(d.appointmentNote),
    services: (d.services ?? []).map((x) => ({ name: x.name, description: s(x.description), group: s(x.group) })),
    facilities: named(d.facilities),
    equipment: named(d.equipment),
    doctors: (d.doctors ?? []).map((x, i) => ({
      key: siteDoctorKey(x, i),
      doctorProfileId: s(x.doctorProfileId),
      name: s(x.name),
      qualifications: s(x.qualifications),
      specialty: s(x.specialty),
      role: s(x.role),
      ...(x.photo ? { photo: { publicId: x.photo.publicId, url: x.photo.url, ...(x.photo.alt ? { alt: x.photo.alt } : {}) } } : {}),
      profileUrl: s(x.profileUrl),
    })),
    registration: { authority: s(d.registration?.authority), number: s(d.registration?.number) },
    departments: (d.departments ?? []).map((x, i) => ({
      key: `d${i}`,
      name: x.name,
      description: s(x.description),
      // The editor ticks doctors by their key (with or without a portfolio).
      doctorIds: departmentMemberKeys(x, d.doctors ?? []),
    })),
    beds: {
      total: d.beds?.total ?? undefined,
      types: (d.beds?.types ?? []).map((b) => ({ type: b.type, count: b.count })),
    },
    insurance: { cashless: Boolean(d.insurance?.cashless), providers: [...(d.insurance?.providers ?? [])] },
    visitingHours: s(d.visitingHours),
    gallery: (d.gallery ?? []).map((g) => ({ publicId: g.publicId, url: g.url, alt: g.alt, caption: g.caption ?? "" })),
    citySlug: s(d.citySlug),
    slug: s(d.slug),
    shortSlug: s(d.shortSlug),
    subdomain: s(d.subdomain),
    seo: { titleOverride: s(d.seo?.titleOverride), descriptionOverride: s(d.seo?.descriptionOverride), noindex: Boolean(d.seo?.noindex) },
    founding: Boolean(d.founding),
    foundingNumber: d.foundingNumber ?? undefined,
    setupPaidAt: date(d.setupPaidAt),
    renewalPrice: d.renewalPrice ?? undefined,
    renewalDueDate: date(d.renewalDueDate),
    renewalStatus: d.renewalStatus ?? "active",
    ownDomain: {
      name: s(d.ownDomain?.name),
      status: d.ownDomain?.status ?? "requested",
      cost: d.ownDomain?.cost ?? undefined,
      renewalDate: date(d.ownDomain?.renewalDate),
    },
    salesExecutive: s(d.salesExecutive),
    salesExecutiveId: s(d.salesExecutiveId),
    source: d.source ?? "",
    contactPerson: { name: s(d.contactPerson?.name), phone: s(d.contactPerson?.phone), email: s(d.contactPerson?.email) },
    ownerEmail: s(d.ownerEmail),
    internalNotes: s(d.internalNotes),
    approval: { ownerApprovedAt: date(d.compliance?.ownerApprovedAt), approvedVia: d.compliance?.approvedVia ?? "" },
  };
}

async function assertTemplateReady(type: "clinic" | "hospital", key: string) {
  if (key === "classic") return;
  if (!(await TemplateSlot.exists({ type, key, status: "ready" }))) throw new ActionError("That design isn't ready yet.");
}

/** Apply one validated step to the document (not saved). */
export async function applySection<K extends StepKey>(doc: EstablishmentDocument, step: K, input: SectionData<K>, admin: CurrentAdmin | null): Promise<void> {
  switch (step) {
    case "basics": {
      const d = input as SectionData<"basics">;
      // The kind is set once, by "New clinic" / "New hospital"; it can't be switched later.
      if (doc.isNew) doc.set({ kind: d.kind, plan: d.kind });
      if (d.categoryId) {
        const cat = await ClinicCategory.findById(d.categoryId).select({ kind: 1, defaultThemeKey: 1 }).lean();
        if (!cat) throw new ActionError("That category no longer exists.", { categoryId: "Choose again." });
        if (cat.kind !== doc.kind) throw new ActionError(`That category is for ${cat.kind}s.`, { categoryId: "Doesn't match the type." });
        // A new category moves the design to its specialty design, unless one was picked by hand (Design step).
        if (String(doc.categoryId ?? "") !== d.categoryId) {
          const prev = doc.categoryId ? await ClinicCategory.findById(doc.categoryId).select({ defaultThemeKey: 1 }).lean() : null;
          const untouched = !prev || doc.themeKey === prev.defaultThemeKey || doc.themeKey === DEFAULT_CLINIC_THEME || doc.themeKey === DEFAULT_HOSPITAL_THEME;
          if (untouched && cat.defaultThemeKey) doc.themeKey = cat.defaultThemeKey;
        }
      }
      doc.set({
        name: d.name,
        categoryId: toOid(d.categoryId),
        logo: d.logo,
        coverPhoto: d.coverPhoto,
        tagline: d.tagline,
        shortDescription: d.shortDescription,
        about: d.about ? sanitizeBioHtml(d.about) : undefined,
      });
      break;
    }
    case "design": {
      const d = input as SectionData<"design">;
      await assertTemplateReady(doc.kind, d.siteTemplateId);
      // The visiting card follows the design (theme colours): nothing to choose for it.
      doc.set({ themeKey: d.themeKey, siteTemplateId: d.siteTemplateId });
      break;
    }
    case "location": {
      const d = input as SectionData<"location">;
      if (d.address.areaId) {
        const area = await Area.findById(d.address.areaId).select({ cityId: 1 }).lean();
        if (!area || String(area.cityId) !== d.address.cityId) {
          throw new ActionError("The area doesn't belong to the selected city.", { "address.areaId": "Choose an area in this city." });
        }
      }
      const city = d.address.cityId ? await City.findById(d.address.cityId).select({ slug: 1 }).lean() : null;
      if (d.address.cityId && !city) throw new ActionError("That city no longer exists.", { "address.cityId": "Choose again." });
      if (city && doc.citySlug && doc.citySlug !== city.slug && doc.status === "published") {
        throw new ActionError("This site is live; moving it to another city changes its address. Unpublish first.", { "address.cityId": "Unpublish first." });
      }
      // Owner login by email is on by default: the login email follows the site's
      // email until it is changed (or cleared) by hand on the Business step.
      const oldEmail = (doc.contact?.email ?? "").trim().toLowerCase();
      const newEmail = (d.email ?? "").trim().toLowerCase();
      if (newEmail && newEmail !== oldEmail && (!doc.ownerEmail || doc.ownerEmail === oldEmail)) doc.ownerEmail = newEmail;
      doc.set({
        address: { ...d.address, cityId: toOid(d.address.cityId), areaId: toOid(d.address.areaId) },
        mapsUrl: d.mapsUrl,
        geo: d.lat && d.lng ? { lat: Number(d.lat), lng: Number(d.lng) } : undefined,
        contact: {
          phones: d.phones.filter((p): p is string => Boolean(p)),
          whatsapp: d.whatsapp,
          email: d.email,
          emergencyPhone: d.emergencyPhone,
        },
        languages: d.languages,
        links: d.links,
      });
      if (city) doc.citySlug = city.slug;
      break;
    }
    case "timings": {
      const d = input as SectionData<"timings">;
      doc.set({ is24x7: d.is24x7, timings: d.timings.filter((x) => x.slots.length > 0), appointmentNote: d.appointmentNote });
      break;
    }
    case "services": {
      const d = input as SectionData<"services">;
      doc.set({ services: d.services, facilities: d.facilities, equipment: d.equipment });
      break;
    }
    case "doctors": {
      const d = input as SectionData<"doctors">;
      const ids = d.doctors.map((x) => x.doctorProfileId).filter((x): x is string => Boolean(x));
      if (ids.length && (await DoctorProfile.countDocuments({ _id: { $in: ids } })) !== new Set(ids).size) {
        throw new ActionError("A linked doctor no longer exists. Pick them again.", { doctors: "Not found." });
      }
      // Department members by key, before the list changes (keys stay with a doctor when a portfolio is linked or unlinked).
      const members = doc.departments.map((dep) => departmentMemberKeys(dep, doc.doctors));
      const used = new Set<string>();
      doc.set({
        doctors: d.doctors.map((x) => {
          let key = x.key && !used.has(x.key) ? x.key : randomKey();
          while (used.has(key)) key = randomKey();
          used.add(key);
          return {
            doctorProfileId: toOid(x.doctorProfileId),
            key,
            name: x.name,
            qualifications: x.qualifications,
            specialty: x.specialty,
            role: x.role,
            ...(x.doctorProfileId ? {} : { photo: x.photo, profileUrl: x.profileUrl }),
          };
        }),
      });
      // Departments can only list doctors who are on the team.
      doc.departments.forEach((dep, i) => Object.assign(dep, departmentMembers(members[i]!, doc.doctors)));
      break;
    }
    case "extras": {
      const d = input as SectionData<"extras">;
      const registration = d.registration.authority || d.registration.number ? d.registration : undefined;
      const insurance = d.insurance.cashless || d.insurance.providers.length ? d.insurance : undefined;
      if (doc.kind !== "hospital") {
        // Departments, beds and visiting hours are hospital-only.
        doc.set({ registration, insurance, departments: [], beds: undefined, visitingHours: undefined });
        break;
      }
      // Older sites: doctors saved before keys existed get theirs now, so departments can point at them.
      doc.doctors.forEach((x, i) => {
        if (!x.key) x.key = siteDoctorKey(x, i);
      });
      const outside = d.departments.flatMap((dep) => dep.doctorIds).filter((m) => !doc.doctors.some((x, i) => isMember(new Set([m]), x, i)));
      if (outside.length) throw new ActionError("A department lists a doctor who isn't on the Doctors step.", { departments: "Add them to Doctors first." });
      doc.set({
        registration,
        insurance,
        departments: d.departments.map((dep) => ({ name: dep.name, description: dep.description, ...departmentMembers(dep.doctorIds, doc.doctors) })),
        beds:
          d.beds.total === undefined && d.beds.types.length === 0
            ? undefined
            : { total: d.beds.total ?? 0, types: d.beds.types.map((b) => ({ type: b.type, count: b.count ?? 0 })) },
        visitingHours: d.visitingHours,
      });
      break;
    }
    case "gallery": {
      const d = input as SectionData<"gallery">;
      const max = galleryMax(doc.kind);
      if (d.gallery.length > max) throw new ActionError(`At most ${max} photos for a ${doc.kind}.`, { gallery: `At most ${max}.` });
      doc.set({ gallery: d.gallery });
      break;
    }
    case "seo": {
      const d = input as SectionData<"seo">;
      if (d.subdomain) {
        const err = (RESERVED_SUBDOMAINS as readonly string[]).includes(d.subdomain) ? "That name is reserved." : subdomainError(d.subdomain);
        if (err) throw new ActionError(err, { subdomain: err });
      }
      await assertUrlKeysFree(doc, { slug: d.slug, shortSlug: d.shortSlug, subdomain: d.subdomain });
      doc.set({ slug: d.slug ?? doc.slug, shortSlug: d.shortSlug ?? doc.shortSlug, subdomain: d.subdomain, seo: d.seo });
      break;
    }
    case "business": {
      const d = input as SectionData<"business">;
      doc.set({
        salesExecutive: d.salesExecutive,
        salesExecutiveId: d.salesExecutiveId,
        source: d.source,
        contactPerson: d.contactPerson.name || d.contactPerson.phone || d.contactPerson.email ? d.contactPerson : undefined,
        ownerEmail: d.ownerEmail,
        internalNotes: d.internalNotes,
      });
      if (admin && can.publish(admin.role)) {
        if (d.founding && !doc.foundingNumber) doc.foundingNumber = await nextFoundingNumber();
        if (!d.founding) doc.foundingNumber = undefined;
        doc.founding = d.founding;
        const { prices } = await getSettings();
        doc.renewalPrice = d.renewalPrice ?? listRenewalPrice(doc.kind, d.founding, prices);
        doc.setupPaidAt = d.setupPaidAt;
        doc.renewalDueDate = d.renewalDueDate ?? (d.setupPaidAt ? firstRenewalDue(d.setupPaidAt) : undefined);
        doc.ownDomain = d.ownDomain.name
          ? { name: d.ownDomain.name, status: d.ownDomain.status, cost: d.ownDomain.cost, renewalDate: d.ownDomain.renewalDate }
          : undefined;
      }
      if (doc.renewalStatus !== "lapsed") doc.renewalStatus = computeRenewalStatus(doc.renewalDueDate);
      break;
    }
    case "review":
    case "publish": {
      const d = input as SectionData<"publish">;
      doc.set({ "compliance.ownerApprovedAt": d.approval.ownerApprovedAt, "compliance.approvedVia": d.approval.approvedVia });
      break;
    }
  }
}

/** Page slug is per city among establishments; short link and subdomain are shared with doctors. */
export async function assertUrlKeysFree(
  doc: EstablishmentDocument,
  keys: { slug?: string; shortSlug?: string; subdomain?: string },
): Promise<void> {
  const owner = { kind: "establishment" as const, id: doc._id };
  if (keys.slug && doc.citySlug && (await Establishment.exists({ _id: { $ne: doc._id }, citySlug: doc.citySlug, slug: keys.slug }))) {
    throw new ActionError("That page address is already taken in this city.", { slug: "Already taken." });
  }
  if (keys.shortSlug && (await sharedUrlKeyTaken("shortSlug", keys.shortSlug, owner))) {
    throw new ActionError("That short link is already taken.", { shortSlug: "Already taken." });
  }
  if (keys.subdomain && (await sharedUrlKeyTaken("subdomain", keys.subdomain, owner))) {
    throw new ActionError("That website address is already taken.", { subdomain: "Already taken." });
  }
}

export async function urlKeyAvailable(
  kind: "slug" | "shortSlug" | "subdomain",
  value: string,
  opts: { excludeId?: string; citySlug?: string },
): Promise<boolean> {
  if (kind !== "slug") return !(await sharedUrlKeyTaken(kind, value, { kind: "establishment", ...(opts.excludeId ? { id: opts.excludeId } : {}) }));
  const filter: Record<string, unknown> = { slug: value, citySlug: opts.citySlug ?? "pune" };
  if (opts.excludeId) filter._id = { $ne: new Types.ObjectId(opts.excludeId) };
  return !(await Establishment.exists(filter));
}

/** Short links never start with "dr-": those belong to doctor pages (/dr-…). */
function shortBase(name: string): string {
  return slugify(name).replace(/^dr-/, "");
}

/**
 * Fill in city slug, page slug (name + area, e.g. shree-skin-clinic-baner) and
 * short link once name and area are known. Existing keys are kept so
 * published URLs never change by themselves.
 */
export async function ensureUrlKeys(doc: EstablishmentDocument): Promise<void> {
  if (doc.address?.cityId && !doc.citySlug) {
    const city = await City.findById(doc.address.cityId).select({ slug: 1 }).lean();
    if (city) doc.citySlug = city.slug;
  }
  const areaSlug = doc.address?.areaId ? (await Area.findById(doc.address.areaId).select({ slug: 1 }).lean())?.slug : undefined;
  if (!doc.slug && doc.citySlug && doc.name && areaSlug) {
    const name = slugify(doc.name);
    const base = name.endsWith(`-${areaSlug}`) ? name : `${name}-${areaSlug}`;
    let candidate = base;
    for (let n = 2; await Establishment.exists({ _id: { $ne: doc._id }, citySlug: doc.citySlug, slug: candidate }); n++) candidate = `${base}-${n}`;
    doc.slug = candidate;
  }
  if (!doc.shortSlug && doc.name && areaSlug) {
    const base = shortBase(doc.name);
    const candidates = [base, `${base}-${areaSlug}`, ...Array.from({ length: 50 }, (_, i) => `${base}-${i + 2}`)];
    for (const c of candidates) {
      if (c.length >= 3 && !(await sharedUrlKeyTaken("shortSlug", c, { kind: "establishment", id: doc._id }))) {
        doc.shortSlug = c;
        break;
      }
    }
  }
  // Every site gets its own website address (it is what cards, QR codes and
  // Google show) once its page address exists, so the name is settled by then.
  if (doc.slug || doc.status === "published") await ensureSubdomain(doc, areaSlug);
}

/**
 * Give the site a website address (subdomain) if it has none yet: the name
 * without hyphens, with hyphens, with the area, then -2, -3… Runs on every
 * save once the page address exists, and on publish; never changes an existing one.
 */
export async function ensureSubdomain(doc: EstablishmentDocument, areaSlug?: string): Promise<void> {
  if (doc.subdomain || !doc.name) return;
  const area = areaSlug ?? (doc.address?.areaId ? (await Area.findById(doc.address.areaId).select({ slug: 1 }).lean())?.slug : undefined);
  const hyphen = shortBase(doc.name).slice(0, 40).replace(/-+$/, "");
  const candidates = [...subdomainSuggestions(doc.name), ...(area ? [`${hyphen.slice(0, 30).replace(/-+$/, "")}-${area}`] : [])];
  const sub = await freeSubdomain(candidates, { kind: "establishment", id: doc._id });
  if (sub) doc.subdomain = sub;
}

/** Suggested subdomains: name without hyphens, then with. */
export function subdomainSuggestions(name: string): string[] {
  const hyphen = shortBase(name);
  const joined = hyphen.replace(/-/g, "");
  return [joined, hyphen].filter((x, i, a) => x.length >= 3 && x.length <= 40 && !subdomainError(x) && a.indexOf(x) === i);
}

export function scanEstablishment(doc: EstablishmentDoc, phrases: readonly string[]): ComplianceIssue[] {
  return scanFields(complianceTextFields(docToForm(doc)), phrases);
}

/** All reasons a site can't be published right now (empty = OK). */
export function publishProblems(doc: EstablishmentDoc, issues: ComplianceIssue[]): string[] {
  const problems = publishBlockers(docToForm(doc)).map((b) => b.message);
  if (!doc.slug || !doc.citySlug) problems.push("Page address (set name, city and area)");
  if (issues.length > 0) problems.push(`${issues.length} compliance issue${issues.length === 1 ? "" : "s"} to fix`);
  return problems;
}
