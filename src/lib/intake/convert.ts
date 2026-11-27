import "server-only";
import mongoose, { type Types } from "mongoose";
import { LIMITS, PRACTITIONER_TYPES, SYSTEMS_OF_MEDICINE, GENDERS, TEMPLATE_KEYS, type IntakeKind, type TemplateKey } from "@/lib/constants";
import { getTheme, isThemeKey } from "@/themes/specialty";
import { DEFAULT_HOSPITAL_CATEGORY } from "@/data/masters";
import { escapeRegExp } from "@/lib/admin/list";
import { ensureUrlKeys as ensureDoctorUrlKeys } from "@/lib/doctors/server";
import { ensureUrlKeys as ensureSiteUrlKeys } from "@/lib/establishments/server";
import { syncDoctorLinksFromEstablishment } from "@/lib/establishments/links";
import { PRODUCTION_HOSTNAME, ROOT_HOSTNAME } from "@/lib/site";
import {
  INTAKE_SECTIONS,
  designSummary,
  doctorEntries,
  doctorRoleLabel,
  doctorText,
  hospitalCategoryFor,
  isRepeatValue,
  mapsLinkFor,
  parseLocation,
  splitLines,
  splitList,
  str,
  withDefaults,
  type DoctorEntry,
  type FieldDef,
  type IntakeData,
  type IntakePhoto,
  type RepeatItem,
} from "@/lib/intake/form";
import { parseQualificationLine } from "@/lib/intake/hints";
import { ROWS } from "@/lib/intake/rows";
import { ensureMasterLists, findOrCreateMaster } from "@/lib/masters/server";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { parseTimingsText } from "@/lib/timings";
import { slugify } from "@/lib/slug";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import type { IntakeDoc } from "@/models/Intake";
import { Specialty } from "@/models/Specialty";

/**
 * Turn a reviewed website form into a DRAFT doctor page or clinic/hospital
 * site. Only what maps cleanly is copied into real fields (names, contact,
 * text, lists, photos, and masters matched by name: city, area, specialty,
 * council, category). Everything else (qualifications, timings, awards, the
 * applicant's notes…) goes into the draft's internal notes for the admin to
 * enter in the editor. Nothing is published; the normal publish checks
 * (compliance scan, approval) still apply.
 */

const ci = (s: string) => new RegExp(`^${escapeRegExp(s.trim())}$`, "i");

async function matchByName<T extends { _id: Types.ObjectId }>(
  find: (filter: Record<string, unknown>) => Promise<T | null>,
  name: string,
  extra: Record<string, unknown> = {},
  fields: string[] = ["name"],
): Promise<T | null> {
  const n = name.trim();
  if (!n) return null;
  return (await find({ ...extra, $or: [...fields.map((f) => ({ [f]: ci(n) })), { slug: slugify(n) }] })) ?? null;
}

const mobile = (v: unknown) => {
  const d = str(v).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : undefined;
};
const phones = (v: unknown) =>
  str(v)
    .split(/[,/;\n]/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, "").length >= 6);
const url = (v: unknown) => (/^https?:\/\/\S+$/i.test(str(v)) ? str(v) : undefined);
const year = (v: unknown) => (/^\d{4}$/.test(str(v)) ? Number(str(v)) : undefined);
const paragraphs = (v: unknown) =>
  str(v)
    ? sanitizeBioHtml(
        str(v)
          .split(/\n\s*\n/)
          .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
          .join(""),
      )
    : undefined;
const image = (p?: IntakePhoto, alt?: string) => (p ? { publicId: p.publicId, url: p.url, ...(alt ? { alt } : {}) } : undefined);
const gallery = (ps: IntakePhoto[], max: number) => ps.slice(0, max).map((p) => ({ publicId: p.publicId, url: p.url, caption: p.caption ?? "" }));
/** Pinned location → geo, and a maps link when none was pasted. */
const place = (v: Record<string, unknown>) => {
  const geo = parseLocation(v.location);
  const mapsUrl = url(v.mapsUrl) ?? (geo ? mapsLinkFor(geo) : undefined);
  return { ...(geo ? { geo } : {}), ...(mapsUrl ? { mapsUrl } : {}) };
};
const links = (d: IntakeData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, url(d[k])]).filter(([, v]) => v));

/** "Dr. Amit R. Kulkarni" → title, first, middle, last. */
export function splitDoctorName(full: string): { title: string; firstName: string; middleName?: string; lastName: string } | null {
  const parts = full
    .replace(/^\s*(dr|doctor)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  return { title: "Dr.", firstName: parts[0]!, ...(parts.length > 2 ? { middleName: parts.slice(1, -1).join(" ") } : {}), lastName: parts[parts.length - 1]! };
}

/** One answer as text lines (doctor lists: one line per doctor), or nothing when empty. */
function answerLines(f: FieldDef, v: unknown, indent = ""): string[] {
  if (v === true) return [`${indent}${f.label}: Yes`];
  if (f.type === "doctors") {
    const list = (Array.isArray(v) ? (v as DoctorEntry[]) : []).filter((e) => doctorText(e) !== "(no name)");
    return list.length ? [`${indent}${f.label}:`, ...list.map((e, i) => `${indent}  ${i + 1}. ${doctorText(e)}`)] : [];
  }
  return str(v) ? [`${indent}${f.label}: ${str(v).replace(/\n/g, "; ")}`] : [];
}

/** Every filled field, as "Label: value" lines, for the draft's internal notes. */
export function intakeAsText(kind: IntakeKind, data: IntakeData): string {
  const out: string[] = [];
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const items = isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : [];
      items.forEach((it, i) => {
        // Only the city filled (it defaults to Pune) is a blank item.
        if (s.fields.every((f) => f.key === "city" || answerLines(f, it[f.key]).length === 0)) return;
        const rows = s.fields.flatMap((f) => answerLines(f, it[f.key], "  "));
        if (rows.length) out.push(`${s.repeat!.itemLabel} ${i + 1}:`, ...rows);
      });
    } else {
      for (const f of s.fields) out.push(...answerLines(f, data[f.key]));
    }
  }
  return out.join("\n");
}

function notesFor(intake: Pick<IntakeDoc, "ref" | "kind" | "data" | "photos" | "adminNotes">, skipped: string[], extraPhotos: IntakePhoto[] = []): string {
  const ds = designSummary(intake.kind, intake.data as IntakeData);
  const head = [
    `From website form ${intake.ref}.`,
    `Design: website ${ds.website} (the visiting card comes in the same design). ${ds.final ? "Final choice." : "NOT FINAL: talk to them before finalising the design."}`,
    skipped.length ? `Please enter in the editor: ${skipped.join(", ")}.` : "",
    intake.photos?.viaWhatsapp ? "Applicant is sending (some) photos on WhatsApp." : "",
    intake.adminNotes ? `Review notes: ${intake.adminNotes}` : "",
    extraPhotos.length ? `More photos from the form (not placed):\n${extraPhotos.map((ph) => `- ${ph.caption ? `${ph.caption}: ` : ""}${ph.url}`).join("\n")}` : "",
  ].filter(Boolean);
  return `${head.join("\n")}\n\n--- Form answers ---\n${intakeAsText(intake.kind, intake.data as IntakeData)}`.slice(0, 20_000);
}

export class ConvertError extends Error {}

/** Create the draft and return where to edit it. */
export async function createSiteFromIntake(intake: Pick<IntakeDoc, "_id" | "ref" | "kind" | "email" | "data" | "photos" | "adminNotes">): Promise<{ kind: IntakeKind; id: Types.ObjectId; href: string }> {
  await ensureMasterLists();
  return intake.kind === "doctor" ? createDoctor(intake) : createEstablishment(intake);
}

/** The area the applicant typed, in a known city (added to the list if new). */
async function areaIn(cityId: Types.ObjectId, name: string) {
  if (!name.trim()) return null;
  try {
    const a = await findOrCreateMaster("area", name, { cityId: String(cityId) });
    return { _id: new mongoose.Types.ObjectId(a.id) };
  } catch {
    return null;
  }
}

async function createDoctor(intake: Pick<IntakeDoc, "_id" | "ref" | "kind" | "email" | "data" | "photos" | "adminNotes">) {
  const d = withDefaults("doctor", intake.data as IntakeData);
  const name = splitDoctorName(str(d.fullName));
  if (!name) throw new ConvertError("Add the doctor's first and last name to the form first.");
  // Timings are read from the text; ones that can't be read are left for the editor.
  const clinicItems = isRepeatValue(d.clinics) ? (d.clinics as RepeatItem[]) : [];
  const skipped = clinicItems.some((c) => str(c.timings) && !parseTimingsText(str(c.timings))) ? ["timings (check the form answers below)"] : [];

  // Council and degrees are what the applicant typed: matched by name, or added to the master list.
  const [specialty, council] = await Promise.all([
    matchByName((f) => Specialty.findOne(f).select({ _id: 1 }).lean(), str(d.specialty), {}, ["name", "plural"]),
    str(d.council) ? findOrCreateMaster("council", str(d.council)).catch(() => null) : null,
  ]);
  if (!specialty && str(d.specialty)) skipped.push(`specialty ("${str(d.specialty)}")`);
  // Other specialties: matched by name (the primary one is left out).
  const secondary: Types.ObjectId[] = [];
  for (const nameTyped of splitList(d.otherSpecialties).slice(0, 10)) {
    const sp = await matchByName((f) => Specialty.findOne(f).select({ _id: 1 }).lean(), nameTyped, {}, ["name", "plural"]);
    if (!sp) skipped.push(`other specialty ("${nameTyped}")`);
    else if (String(sp._id) !== String(specialty?._id) && !secondary.some((x) => String(x) === String(sp._id))) secondary.push(sp._id);
  }
  const qualificationLines = splitLines(d.qualifications);
  const qualifications = [];
  for (const line of qualificationLines.slice(0, 12)) {
    const q = parseQualificationLine(line);
    const degree = q ? await findOrCreateMaster("degree", q.degree).catch(() => null) : null;
    if (!q || !degree) {
      skipped.push(`qualification "${line}"`);
      continue;
    }
    qualifications.push({ degreeId: new mongoose.Types.ObjectId(degree.id), specialization: q.specialization || undefined, institute: q.institute, ...(q.year ? { year: q.year } : {}) });
  }

  const clinics = [];
  // Own clinics first, then hospitals where they are a visiting consultant.
  const places = [
    ...(isRepeatValue(d.clinics) ? (d.clinics as RepeatItem[]) : []).map((c) => ({ c, type: "own_clinic" as const })),
    ...(isRepeatValue(d.visiting) ? (d.visiting as RepeatItem[]) : []).filter((c) => str(c.name)).map((c) => ({ c, type: "hospital_visiting" as const })),
  ];
  for (const { c, type } of places) {
    const city = await matchByName((f) => City.findOne(f).select({ _id: 1, state: 1 }).lean(), str(c.city) || "Pune");
    const area = city ? ((await matchByName((f) => Area.findOne(f).select({ _id: 1 }).lean(), str(c.area), { cityId: city._id })) ?? (await areaIn(city._id, str(c.area)))) : null;
    const pincode = str(c.pincode);
    if (!city || !area || !str(c.name) || !str(c.address) || !/^\d{6}$/.test(pincode)) {
      if (str(c.name)) skipped.push(`${type === "own_clinic" ? "clinic" : "visiting hospital"} "${str(c.name)}" (area, city or pincode not matched)`);
      continue;
    }
    const fee = /^\d+$/.test(str(c.fee)) ? Number(str(c.fee)) : undefined;
    clinics.push({
      name: str(c.name),
      type,
      addressLine1: str(c.address).replace(/\s*\n\s*/g, ", "),
      ...(str(c.address2) ? { addressLine2: str(c.address2).slice(0, 200) } : {}),
      areaId: area._id,
      cityId: city._id,
      state: city.state,
      pincode,
      ...place(c),
      ...(phones(c.phone)[0] ? { phone: phones(c.phone)[0] } : {}),
      timings: parseTimingsText(str(c.timings)) ?? [],
      ...(str(c.appointmentNote) ? { appointmentNote: str(c.appointmentNote) } : {}),
      ...(fee !== undefined ? { fee } : {}),
      showFee: fee !== undefined && c.showFee === true,
    });
  }
  // Awards need a title, who gave it and the year; incomplete ones are left in the notes.
  // Award photos count toward the site's 5 photos, so they come first and the gallery gets what is left.
  const awardPhotos = intake.photos?.awards ?? [];
  const extraPhotos: IntakePhoto[] = [];
  let photoRoom = LIMITS.galleryMax;
  const awards = [];
  for (const line of splitLines(d.awards).slice(0, 15)) {
    const a = ROWS.awards.parse(line);
    const y = Number(a.year);
    const photo = awardPhotos.find((p) => (p.caption ?? "").trim().toLowerCase() === (a.title ?? "").trim().toLowerCase());
    if (a.title && a.awardingBody && y && y <= new Date().getFullYear()) {
      const usePhoto = photo && photoRoom > 0;
      if (usePhoto) photoRoom--;
      else if (photo) extraPhotos.push(photo);
      awards.push({ title: a.title.slice(0, 120), awardingBody: a.awardingBody.slice(0, 120), year: y, ...(usePhoto ? { photo: image(photo, a.title.slice(0, 120)) } : {}) });
    } else {
      skipped.push(`award "${line}"`);
      if (photo) extraPhotos.push(photo);
    }
  }
  const publications = splitLines(d.publications)
    .slice(0, 20)
    .map((line) => ROWS.publications.parse(line))
    .filter((p) => p.title)
    .map((p) => {
      const y = Number(p.year);
      const link = url(/^www\./i.test(p.url ?? "") ? `https://${p.url}` : p.url);
      return { title: p.title!.slice(0, 300), ...(p.journal ? { journal: p.journal.slice(0, 200) } : {}), ...(y && y <= new Date().getFullYear() ? { year: y } : {}), ...(link ? { url: link.slice(0, 500) } : {}) };
    });
  const allGallery = intake.photos?.gallery ?? [];
  const story = str(d.beyondStory);

  const ownerFree = !(await DoctorProfile.exists({ ownerEmail: intake.email }));
  const system = (SYSTEMS_OF_MEDICINE as readonly string[]).includes(str(d.systemOfMedicine)) ? (str(d.systemOfMedicine) as (typeof SYSTEMS_OF_MEDICINE)[number]) : undefined;
  const gender = (GENDERS as readonly string[]).includes(str(d.gender)) ? (str(d.gender) as (typeof GENDERS)[number]) : undefined;
  const fullName = `Dr. ${name.firstName} ${name.lastName}`;

  const doc = new DoctorProfile({
    status: "draft",
    ...name,
    // A middle name typed in the form is shown, like the admin editor's display name ("Dr. Asha R Kulkarni").
    ...(name.middleName ? { displayName: [name.title, name.firstName, name.middleName, name.lastName].join(" ").slice(0, 120) } : {}),
    ...(gender ? { gender } : {}),
    ...(system ? { systemOfMedicine: system } : {}),
    ...(system === "other" && str(d.systemOther) ? { systemOther: str(d.systemOther).slice(0, 80) } : {}),
    photo: image(intake.photos?.profile, fullName),
    languages: splitList(d.languages),
    practiceSinceYear: year(d.practiceSince),
    registration: { ...(council ? { councilId: new mongoose.Types.ObjectId(council.id) } : {}), ...(str(d.registrationNumber) ? { number: str(d.registrationNumber) } : {}), ...(year(d.registrationYear) ? { year: year(d.registrationYear) } : {}), ...(str(d.nmrId) ? { nmrId: str(d.nmrId).slice(0, 40) } : {}) },
    qualifications,
    ...(specialty ? { primarySpecialtyId: specialty._id } : {}),
    secondarySpecialtyIds: secondary,
    ...((PRACTITIONER_TYPES as readonly string[]).includes(str(d.practitionerType)) ? { practitionerType: str(d.practitionerType) as (typeof PRACTITIONER_TYPES)[number] } : {}),
    services: splitLines(d.services).map((line) => {
      const s = ROWS.services.parse(line);
      return { name: (s.name || line).slice(0, 80), ...(s.description ? { description: s.description.slice(0, 200) } : {}) };
    }),
    conditionsTreated: splitLines(d.conditions).map((s) => s.slice(0, 200)),
    clinics,
    mobile: mobile(d.mobile),
    whatsapp: mobile(d.whatsapp) ?? mobile(d.mobile),
    ...(str(d.publicEmail) ? { email: str(d.publicEmail) } : {}),
    links: links(d, ["googleBusiness", "practo", "instagram", "facebook", "linkedin", "youtube", "website"]),
    shortBio: str(d.shortBio).slice(0, LIMITS.shortBio) || undefined,
    fullBio: paragraphs(d.aboutMe),
    awards,
    publications,
    memberships: splitLines(d.memberships).map((line) => {
      const m = ROWS.memberships.parse(line);
      const y = Number(m.since);
      return { name: (m.name || line).slice(0, 120), ...(y && y <= new Date().getFullYear() ? { since: y } : {}) };
    }),
    interests: splitList(d.interests).slice(0, 20),
    ...(intake.photos?.beyond ? { interestsPhoto: { ...image(intake.photos.beyond, str(d.beyondTitle) || "Beyond medicine")!, caption: str(d.beyondTitle).slice(0, 120) || undefined } } : {}),
    ...(story || str(d.beyondTitle) ? { interestsStory: { title: str(d.beyondTitle).slice(0, 200) || "Beyond medicine", ...(story ? { body: story.slice(0, LIMITS.storyBody) } : {}) } } : {}),
    gallery: gallery(allGallery, photoRoom),
    ...((TEMPLATE_KEYS as readonly string[]).includes(str(d.websiteDesign)) ? { portfolioTemplateId: str(d.websiteDesign) as TemplateKey } : {}),
    showHealthTips: str(d.healthTips) !== "no",
    plan: "doctor",
    source: "inbound",
    ...(ownerFree ? { ownerEmail: intake.email } : {}),
  });
  doc.internalNotes = notesFor(intake, skipped, [...extraPhotos, ...allGallery.slice(photoRoom)]);
  await ensureDoctorUrlKeys(doc);
  await doc.save();
  return { kind: "doctor" as const, id: doc._id, href: `/admin/doctors/${doc._id}` };
}

/** "Name – short description" rows (services, facilities, equipment) → named items. */
function namedRows(kind: "services" | "facilities" | "equipment", v: unknown, maxName: number) {
  return splitLines(v).map((line) => {
    const r = ROWS[kind].parse(line);
    return { name: (r.name || line).slice(0, maxName), ...(r.description ? { description: r.description.slice(0, 300) } : {}) };
  });
}

/**
 * The MediReach doctor a pasted link points to: their page
 * (/pune/doctor/dr-x), short link (/dr-x) or subdomain (x.medireach.co.in).
 * Links to other sites (Practo, own website) give null.
 */
export async function doctorFromMediReachLink(link: string | undefined): Promise<Types.ObjectId | null> {
  let u: URL;
  try {
    u = new URL(link ?? "");
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const roots = [...new Set([ROOT_HOSTNAME.toLowerCase(), PRODUCTION_HOSTNAME])];
  const parts = u.pathname.split("/").filter(Boolean).map((x) => decodeURIComponent(x).toLowerCase());
  let filter: Record<string, string> | null = null;
  if (roots.includes(host)) {
    if (parts.length === 3 && parts[1] === "doctor") filter = { citySlug: parts[0]!, slug: parts[2]! };
    else if (parts.length === 1) filter = { shortSlug: parts[0]! };
  } else {
    const root = roots.find((r) => host.endsWith(`.${r}`));
    const sub = root ? host.slice(0, -(root.length + 1)) : "";
    if (sub && !sub.includes(".") && parts.length === 0) filter = { subdomain: sub };
  }
  if (!filter) return null;
  const doc = await DoctorProfile.findOne(filter).select({ _id: 1 }).lean();
  return doc?._id ?? null;
}

/**
 * Form doctors → the site's doctor list (each doctor once, even if in two
 * departments), keyed so departments can list them. A doctor whose link is
 * their MediReach page is linked to that portfolio, like "MediReach portfolio"
 * in the editor (the portfolio brings its own photo and details).
 */
async function siteDoctors(kind: IntakeKind, d: IntakeData) {
  const seen = new Set<string>();
  const linked = new Set<string>();
  const list = doctorEntries(kind, d)
    .map(({ doctor: e }) => ({
      name: str(e.name).slice(0, 120),
      ...(str(e.education) ? { qualifications: str(e.education).slice(0, 200) } : {}),
      ...(str(e.designation) ? { specialty: str(e.designation).slice(0, 120) } : {}),
      ...(doctorRoleLabel(e) ? { role: doctorRoleLabel(e).slice(0, 80) } : {}),
      ...(url(e.portfolioUrl) ? { profileUrl: url(e.portfolioUrl)!.slice(0, 500) } : {}),
      ...(e.photo ? { photo: image(e.photo, str(e.name) || undefined) } : {}),
    }))
    .filter((x) => x.name && !seen.has(x.name.toLowerCase()) && seen.add(x.name.toLowerCase()));
  const out = [];
  for (const [i, x] of list.entries()) {
    const id = await doctorFromMediReachLink(x.profileUrl);
    if (id && !linked.has(String(id))) {
      linked.add(String(id));
      const { photo: _photo, profileUrl: _url, ...rest } = x;
      out.push({ ...rest, doctorProfileId: id, key: `f${i + 1}` });
    } else out.push({ ...x, key: `f${i + 1}` });
  }
  return out;
}

async function createEstablishment(intake: Pick<IntakeDoc, "_id" | "ref" | "kind" | "email" | "data" | "photos" | "adminNotes">) {
  const kind = intake.kind as "clinic" | "hospital";
  const d = withDefaults(kind, intake.data as IntakeData);
  const name = str(d.name);
  if (!name) throw new ConvertError(`Add the ${kind} name to the form first.`);
  const timings = parseTimingsText(str(d.timings));
  const skipped = str(d.timings) && !timings ? ["timings (check the form answers below)"] : [];
  if (splitLines(d.awards).length) skipped.push("accreditations and awards");

  const city = await matchByName((f) => City.findOne(f).select({ _id: 1, state: 1 }).lean(), str(d.city) || "Pune");
  const area = city ? ((await matchByName((f) => Area.findOne(f).select({ _id: 1 }).lean(), str(d.area), { cityId: city._id })) ?? (await areaIn(city._id, str(d.area)))) : null;
  if (!city || !area) skipped.push("area / city");

  // Clinic type is a category slug from the form; "Other" (or an older free-text answer) is matched by name.
  // Hospital types: the built-in short values ("maternity") map to their category; types added later are category slugs.
  const typeSlug = kind === "clinic" ? str(d.clinicType) : hospitalCategoryFor(str(d.hospitalType)) || (str(d.hospitalType) === "other" ? "" : str(d.hospitalType));
  const typeText = (kind === "clinic" ? str(d.clinicTypeOther) || (typeSlug === "other" ? "" : typeSlug) : str(d.hospitalTypeOther)).toLowerCase();
  const categories = await ClinicCategory.find({ kind }).select({ name: 1, slug: 1, defaultThemeKey: 1 }).lean();
  const category =
    categories.find((c) => typeSlug && c.slug === typeSlug) ??
    categories.find((c) => typeText && (typeText.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(typeText))) ??
    (kind === "hospital" ? (categories.find((c) => c.slug === DEFAULT_HOSPITAL_CATEGORY) ?? categories[0]) : undefined);
  if (!category) skipped.push("category");

  const pincode = str(d.pincode);
  const doctors = await siteDoctors(kind, d);
  // Each department lists the doctors ticked for it (none has a portfolio yet, so by key).
  const keyByName = new Map(doctors.map((x) => [x.name.toLowerCase(), x.key]));
  const departments = (isRepeatValue(d.departments) ? (d.departments as RepeatItem[]) : [])
    .filter((dep) => str(dep.name))
    .map((dep) => ({
      name: str(dep.name).slice(0, 80),
      ...(str(dep.description) ? { description: str(dep.description).slice(0, 300) } : {}),
      doctorIds: [],
      doctorKeys: [...new Set(splitLines(dep.doctorNames).flatMap((n) => keyByName.get(n.slice(0, 120).toLowerCase()) ?? []))],
    }));
  // Beds: the total, and the types ("ICU – 2"). A missing total is the sum of the types.
  const bedTypes = splitLines(d.bedTypes)
    .map((line) => ROWS.bedTypes.parse(line))
    .filter((b) => b.type)
    .slice(0, 10)
    .map((b) => ({ type: b.type!.slice(0, 60), ...(/^\d{1,3}$/.test(b.count ?? "") ? { count: Number(b.count) } : {}) }));
  const bedSum = bedTypes.reduce((n, b) => n + (b.count ?? 0), 0);
  const beds = /^\d+$/.test(str(d.beds)) ? Math.max(Number(str(d.beds)), bedSum) : bedSum || undefined;
  if (beds !== undefined && beds > LIMITS.hospitalBedsMax) skipped.push(`beds (form says ${beds})`);
  const insurance = splitLines(d.insurance);
  const label = kind === "clinic" ? "clinic" : "hospital";
  // Open 24×7: the site shows "Open 24 hours", not the week, so hours typed in the form (OPD, or a clinic's consultation hours) go in the appointment note.
  const opd = d.is24x7 === true && str(d.timings) ? `${kind === "hospital" ? "OPD" : "Consultation hours"}: ${splitLines(d.timings).join("; ")}` : "";
  const noteParts = [str(d.appointmentNote), opd].filter(Boolean).join(" ");
  const appointmentNote = noteParts.slice(0, 200) || undefined;
  if (noteParts.length > 200) skipped.push(`appointment note / OPD hours (too long: "${noteParts}")`);
  // The editor keeps up to 4 numbers; the rest go to the notes.
  const allPhones = phones(d.phones);
  if (allPhones.length > 4) skipped.push(`more phone numbers (${allPhones.slice(4).join(", ")})`);
  // Services get their group from the design's suggested services, as when added in the editor.
  const themeKey = isThemeKey(str(d.websiteDesign)) ? str(d.websiteDesign) : category?.defaultThemeKey;
  const suggested = getTheme(themeKey, kind).suggestedServices;
  const services = namedRows("services", d.services, 120).map((sv) => {
    const group = suggested.find((x) => x.name.toLowerCase() === sv.name.toLowerCase())?.group;
    return group ? { ...sv, group } : sv;
  });

  const doc = new Establishment({
    kind,
    plan: kind,
    status: "draft",
    name,
    ...(category ? { categoryId: category._id, themeKey: category.defaultThemeKey } : {}),
    ...(isThemeKey(str(d.websiteDesign)) ? { themeKey: str(d.websiteDesign) } : {}),
    logo: image(intake.photos?.logo, `${name} logo`),
    coverPhoto: image(intake.photos?.cover, name),
    tagline: str(d.tagline).slice(0, 200) || undefined,
    shortDescription: str(d.shortDescription).slice(0, LIMITS.shortBio) || undefined,
    about: paragraphs(d.about),
    ...(str(d.regNumber) || str(d.regAuthority) ? { registration: { authority: str(d.regAuthority) || undefined, number: str(d.regNumber) || undefined } } : {}),
    address: {
      line1: str(d.address).replace(/\s*\n\s*/g, ", ") || undefined,
      line2: str(d.address2).slice(0, 200) || undefined,
      ...(area && city ? { areaId: area._id, cityId: city._id, state: city.state } : {}),
      ...(/^\d{6}$/.test(pincode) ? { pincode } : {}),
      landmark: str(d.landmark) || undefined,
      parkingNote: str(d.parkingNote).slice(0, 200) || undefined,
    },
    ...place(d),
    contact: {
      phones: allPhones.slice(0, 4),
      whatsapp: mobile(d.siteWhatsapp),
      email: str(d.siteEmail) || undefined,
      emergencyPhone: phones(d.emergencyPhone)[0],
    },
    is24x7: d.is24x7 === true,
    ...(timings ? { timings } : {}),
    appointmentNote,
    visitingHours: str(d.visitingHours) || undefined,
    services,
    facilities: namedRows("facilities", d.facilities, 200),
    equipment: namedRows("equipment", d.equipment, 200),
    departments,
    ...(beds !== undefined && beds <= LIMITS.hospitalBedsMax && kind === "hospital" ? { beds: { total: beds, types: bedTypes } } : {}),
    ...(insurance.length || d.cashless === true ? { insurance: { cashless: d.cashless === true, providers: insurance } } : {}),
    doctors,
    languages: splitList(d.languages),
    gallery: gallery(intake.photos?.gallery ?? [], kind === "clinic" ? LIMITS.clinicGalleryMax : LIMITS.hospitalGalleryMax),
    links: links(d, ["googleBusiness", "practo", "instagram", "facebook", "youtube", "website"]),
    source: "inbound",
    contactPerson: { name: str(d.contactName) || undefined, phone: mobile(d.mobile), email: intake.email },
    ownerEmail: intake.email,
  });
  doc.internalNotes = notesFor(intake, skipped);
  await ensureSiteUrlKeys(doc);
  await doc.save();
  // Linked portfolios list this site under "Practises at", as when linked in the editor.
  await syncDoctorLinksFromEstablishment(doc._id, [], doctors.flatMap((x) => ("doctorProfileId" in x && x.doctorProfileId ? [String(x.doctorProfileId)] : [])));
  return { kind, id: doc._id, href: `/admin/establishments/${doc._id}`, label };
}
