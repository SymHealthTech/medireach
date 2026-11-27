import { z } from "zod";
import {
  APPROVAL_CHANNELS,
  CLINIC_TYPES,
  DOCTOR_PLANS,
  DOCTOR_SOURCES,
  DOMAIN_STATUSES,
  GENDERS,
  LIMITS,
  PRACTITIONER_TYPES,
  SYSTEMS_OF_MEDICINE,
  TEMPLATE_KEYS,
  type DoctorPlan,
  type DoctorStatus,
  type RenewalStatus,
} from "@/lib/constants";
import { htmlToText } from "@/lib/compliance/scan";
import { SLUG_RE, SUBDOMAIN_RE } from "@/lib/slug";

/**
 * The doctor editor's data model, shared by the browser (form state, live
 * checks) and the server (validation per step). Empty optional values are
 * "" in the form and become `undefined` once validated.
 */

// ---------------------------------------------------------------------------
// Form state (what the client edits)
// ---------------------------------------------------------------------------

export interface ImageValue {
  publicId: string;
  url: string;
  alt?: string;
}

export interface SlotValue {
  open: string;
  close: string;
}

export interface ClinicForm {
  key: string; // stable client key (existing _id or random)
  name: string;
  type: (typeof CLINIC_TYPES)[number];
  addressLine1: string;
  addressLine2: string;
  cityId: string;
  areaId: string;
  state: string;
  pincode: string;
  mapsUrl: string;
  lat: string;
  lng: string;
  phone: string;
  timings: { day: number; slots: SlotValue[] }[];
  appointmentNote: string;
  fee: number | undefined;
  showFee: boolean;
  /** Clinic/hospital with a MediReach site ("" = not linked). */
  establishmentId: string;
}

export interface DoctorForm {
  id?: string;
  /** Permanent website UID (read-only, lib/uid.ts). */
  uid?: string;
  status: DoctorStatus;
  updatedAt?: string;
  publishedAt?: string;
  slug: string;
  shortSlug: string;
  citySlug: string;
  subdomain: string;

  // 1 Basics
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;
  gender: "" | (typeof GENDERS)[number];
  photo?: ImageValue;
  languages: string[];
  practiceSinceYear: number | undefined;

  // 2 Registration and qualifications
  systemOfMedicine: (typeof SYSTEMS_OF_MEDICINE)[number];
  /** "Please specify" when the system is Other. */
  systemOther: string;
  registration: { councilId: string; number: string; year: number | undefined; nmrId: string };
  qualifications: { degreeId: string; specialization: string; institute: string; year: number | undefined }[];

  // 3 Practice and services
  practitionerType: (typeof PRACTITIONER_TYPES)[number];
  primarySpecialtyId: string;
  secondarySpecialtyIds: string[];
  services: { name: string; description: string }[];
  conditionsTreated: string[];

  // 4 Clinics and timings
  clinics: ClinicForm[];

  // 5 Contact and links
  mobile: string;
  whatsapp: string;
  email: string;
  links: { googleBusiness: string; practo: string; instagram: string; facebook: string; linkedin: string; youtube: string; website: string };
  ownerEmail: string;

  // 6 About and recognition
  shortBio: string;
  fullBio: string;
  awards: { title: string; awardingBody: string; year: number | undefined; photo?: ImageValue }[];
  memberships: { name: string; since: number | undefined }[];
  publications: { title: string; journal: string; year: number | undefined; url: string }[];
  interests: string[];
  interestsPhoto?: ImageValue & { caption: string };
  /** "Beyond medicine" story; both empty = none. */
  interestsStory: { title: string; body: string };
  gallery: (ImageValue & { caption: string })[];

  // 7 SEO
  seo: { titleOverride: string; descriptionOverride: string; noindex: boolean };

  // 8 Business
  plan: DoctorPlan;
  founding: boolean;
  foundingNumber: number | undefined; // assigned by the server
  setupPaidAt: string; // yyyy-mm-dd
  renewalPrice: number | undefined; // empty = from Settings (normal or founding)
  renewalDueDate: string; // yyyy-mm-dd; empty = setup date + 1 year
  renewalStatus: RenewalStatus; // computed by the server, shown read-only
  freeUpdateUsed: boolean;
  ownDomain: { name: string; status: (typeof DOMAIN_STATUSES)[number]; cost: number | undefined; renewalDate: string };
  /** Clinics/hospitals this doctor belongs to (clinic links are added automatically). */
  establishmentIds: string[];
  salesExecutive: string;
  salesExecutiveId: string;
  source: "" | (typeof DOCTOR_SOURCES)[number];
  internalNotes: string;

  // 9 Templates (the visiting card comes in the same design as the website)
  portfolioTemplateId: string;
  /** Show the "Health tips" section (general articles) in designs that have one. */
  showHealthTips: boolean;

  // 10 Review
  approval: { doctorApprovedAt: string; approvedVia: "" | (typeof APPROVAL_CHANNELS)[number] };
}

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Clinics and visiting-consultant hospitals together. */
export const MAX_CLINICS = 10;

export function emptyClinic(cityId = "", key = randomKey()): ClinicForm {
  return {
    key,
    name: "",
    type: "own_clinic",
    addressLine1: "",
    addressLine2: "",
    cityId,
    areaId: "",
    state: "Maharashtra",
    pincode: "",
    mapsUrl: "",
    lat: "",
    lng: "",
    phone: "",
    timings: ALL_DAYS.map((day) => ({ day, slots: [] })),
    appointmentNote: "",
    fee: undefined,
    showFee: false,
    establishmentId: "",
  };
}

export function emptyDoctorForm(): DoctorForm {
  return {
    status: "draft",
    slug: "",
    shortSlug: "",
    citySlug: "",
    subdomain: "",
    title: "Dr.",
    firstName: "",
    middleName: "",
    lastName: "",
    displayName: "",
    gender: "",
    languages: ["English", "Hindi", "Marathi"],
    practiceSinceYear: undefined,
    systemOfMedicine: "allopathy",
    systemOther: "",
    registration: { councilId: "", number: "", year: undefined, nmrId: "" },
    qualifications: [],
    practitionerType: "gp",
    primarySpecialtyId: "",
    secondarySpecialtyIds: [],
    services: [],
    conditionsTreated: [],
    clinics: [],
    mobile: "",
    whatsapp: "",
    email: "",
    links: { googleBusiness: "", practo: "", instagram: "", facebook: "", linkedin: "", youtube: "", website: "" },
    ownerEmail: "",
    shortBio: "",
    fullBio: "",
    awards: [],
    memberships: [],
    publications: [],
    interests: [],
    interestsStory: { title: "", body: "" },
    gallery: [],
    seo: { titleOverride: "", descriptionOverride: "", noindex: false },
    plan: "doctor",
    founding: false,
    foundingNumber: undefined,
    setupPaidAt: "",
    renewalPrice: undefined,
    renewalDueDate: "",
    renewalStatus: "active",
    freeUpdateUsed: false,
    ownDomain: { name: "", status: "requested", cost: undefined, renewalDate: "" },
    establishmentIds: [],
    salesExecutive: "",
    salesExecutiveId: "",
    source: "",
    internalNotes: "",
    portfolioTemplateId: "classic",
    showHealthTips: true,
    approval: { doctorApprovedAt: "", approvedVia: "" },
  };
}

export function randomKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export const STEPS = [
  { key: "basics", title: "Basics" },
  { key: "registration", title: "Registration and qualifications" },
  { key: "practice", title: "Practice and services" },
  { key: "clinics", title: "Clinics and timings" },
  { key: "contact", title: "Contact and links" },
  { key: "about", title: "About, awards and gallery" },
  { key: "seo", title: "SEO" },
  { key: "templates", title: "Design" },
  { key: "business", title: "Business" },
  { key: "review", title: "Review" },
  { key: "publish", title: "Publish" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Tick shown in the stepper when a step has its essentials filled in. */
export function stepComplete(step: StepKey, f: DoctorForm): boolean {
  switch (step) {
    case "basics":
      return Boolean(f.firstName && f.lastName && f.photo);
    case "registration":
      return Boolean(f.registration.councilId && f.registration.number && f.qualifications.length);
    case "practice":
      return Boolean(f.primarySpecialtyId && f.services.length);
    case "clinics":
      return f.clinics.length > 0 && f.clinics.every((c) => c.name && c.addressLine1 && c.areaId && c.pincode);
    case "contact":
      return Boolean(f.mobile);
    case "about":
      return Boolean(f.shortBio);
    case "seo":
      return Boolean(f.slug && f.shortSlug);
    case "business":
      return Boolean(f.plan);
    case "templates":
      return Boolean(f.portfolioTemplateId);
    case "review":
      return publishBlockers(f).every((b) => b.field === "publish");
    case "publish":
      return f.status === "published";
  }
}

/** Everything required before publishing (server re-checks). */
export function publishBlockers(f: DoctorForm): { field: StepKey; message: string }[] {
  const out: { field: StepKey; message: string }[] = [];
  if (!f.firstName || !f.lastName) out.push({ field: "basics", message: "First and last name" });
  if (!f.registration.councilId) out.push({ field: "registration", message: "Registration council" });
  if (!f.registration.number) out.push({ field: "registration", message: "Registration number" });
  if (!f.primarySpecialtyId) out.push({ field: "practice", message: "Primary specialty" });
  if (f.clinics.length === 0) out.push({ field: "clinics", message: "At least one clinic" });
  f.clinics.forEach((c, i) => {
    if (!c.name || !c.addressLine1 || !c.areaId || !c.cityId || !/^\d{6}$/.test(c.pincode)) {
      out.push({ field: "clinics", message: `Clinic ${i + 1}: name, address, area and 6-digit pincode` });
    }
  });
  if (!f.approval.doctorApprovedAt || !f.approval.approvedVia) {
    out.push({ field: "publish", message: "Doctor's approval (date and how they approved)" });
  }
  return out;
}

/** Nice-to-have fields that improve the page (shown as warnings, not blockers). */
export function recommendedMissing(f: DoctorForm): string[] {
  const out: string[] = [];
  if (!f.photo) out.push("Profile photo");
  if (!f.shortBio) out.push("Short bio");
  if (f.clinics.some((c) => !c.lat || !c.lng)) out.push("Map location (latitude/longitude) for each clinic");
  if (f.clinics.some((c) => c.timings.every((t) => t.slots.length === 0))) out.push("Timings for each clinic");
  if (!f.mobile) out.push("Mobile number");
  if (f.qualifications.length === 0) out.push("Qualifications");
  return out;
}

/**
 * Every free-text field the NMC scanner must check, keyed by a dotted path
 * the editor can jump to. Rich text is scanned as plain text.
 */
export function complianceTextFields(f: DoctorForm): Record<string, string> {
  const out: Record<string, string> = {
    displayName: f.displayName,
    shortBio: f.shortBio,
    fullBio: htmlToText(f.fullBio),
    "seo.titleOverride": f.seo.titleOverride,
    "seo.descriptionOverride": f.seo.descriptionOverride,
  };
  f.qualifications.forEach((q, i) => (out[`qualifications.${i}.specialization`] = q.specialization));
  f.services.forEach((s, i) => {
    out[`services.${i}.name`] = s.name;
    out[`services.${i}.description`] = s.description;
  });
  f.conditionsTreated.forEach((c, i) => (out[`conditionsTreated.${i}`] = c));
  f.clinics.forEach((c, i) => {
    out[`clinics.${i}.name`] = c.name;
    out[`clinics.${i}.appointmentNote`] = c.appointmentNote;
  });
  f.awards.forEach((a, i) => (out[`awards.${i}.title`] = `${a.title} ${a.awardingBody}`));
  f.memberships.forEach((m, i) => (out[`memberships.${i}.name`] = m.name));
  f.publications.forEach((p, i) => (out[`publications.${i}.title`] = p.title));
  if (f.interestsPhoto) out["interestsPhoto.caption"] = f.interestsPhoto.caption;
  out["interestsStory.title"] = f.interestsStory.title;
  out["interestsStory.body"] = f.interestsStory.body;
  f.interests.forEach((x, i) => (out[`interests.${i}`] = x));
  f.gallery.forEach((g, i) => (out[`gallery.${i}.caption`] = g.caption));
  return out;
}

/** Which step a compliance field path belongs to (for "Fix" jump links). */
export function stepForField(path: string): StepKey {
  const head = path.split(".")[0]!;
  if (["displayName"].includes(head)) return "basics";
  if (head === "qualifications") return "registration";
  if (["services", "conditionsTreated"].includes(head)) return "practice";
  if (head === "clinics") return "clinics";
  if (head === "seo") return "seo";
  return "about";
}

// ---------------------------------------------------------------------------
// Server-side section schemas
// ---------------------------------------------------------------------------

export const t = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((v) => v || undefined);
const year = z
  .number()
  .int()
  .min(1900)
  .max(new Date().getFullYear() + 1)
  .optional();
const oid = z.string().regex(/^[a-f0-9]{24}$/i, "Choose an option.");
export const optOid = z
  .string()
  .refine((s) => s === "" || /^[a-f0-9]{24}$/i.test(s), "Choose an option.")
  .transform((s) => s || undefined);
export const image = z.object({
  publicId: z.string().min(1).max(300),
  // Uploaded to Cloudinary, or one of our bundled demo photos (public/demo/…).
  url: z
    .string()
    .max(1000)
    .refine((u) => u.startsWith("https://res.cloudinary.com/") || /^\/demo\/[\w/.-]+\.(jpe?g|png|webp)$/.test(u), "Images must be uploaded."),
  alt: t(200).optional(),
});
/** "Beyond medicine" story: a title is needed once there's any text. */
const interestsStory = z
  .object({ title: t(150), body: t(LIMITS.storyBody) })
  .refine((st) => !st.body || Boolean(st.title), { message: "Add a title for the story.", path: ["title"] });
export const mobile = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+?91)(?=\d{10}$)/, ""))
  .refine((s) => s === "" || /^[6-9]\d{9}$/.test(s), "Enter a 10-digit mobile number.")
  .transform((s) => s || undefined);
export const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-()]/g, ""))
  .refine((s) => s === "" || /^\+?\d{8,13}$/.test(s), "Enter a valid phone number.")
  .transform((s) => s || undefined);
export const url = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^https?:\/\/\S+$/i.test(s), "Enter a full link starting with https://")
  .transform((s) => s || undefined);
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((s) => s === "" || z.string().email().safeParse(s).success, "Enter a valid email address.")
  .transform((s) => s || undefined);
export const chips = (max: number, len = 60) => z.array(z.string().trim().min(1).max(len)).max(max);
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const dateStr = z
  .string()
  .refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), "Enter a valid date.")
  .transform((s) => (s ? new Date(`${s}T00:00:00+05:30`) : undefined));

/** The doctor's approval: saved from the Publish step (Review sends the same, harmlessly). */
const approvalSchema = z.object({
  approval: z.object({
    doctorApprovedAt: dateStr,
    approvedVia: z.enum(["", ...APPROVAL_CHANNELS]).transform((s) => s || undefined),
  }),
});

export const sectionSchemas = {
  basics: z.object({
    title: z.string().trim().max(10).default("Dr."),
    firstName: z.string().trim().min(1, "First name is required.").max(60),
    middleName: t(60),
    lastName: z.string().trim().min(1, "Last name is required.").max(60),
    displayName: t(100),
    gender: z
      .enum(["", ...GENDERS])
      .transform((g) => g || undefined),
    photo: image.optional(),
    languages: chips(12, 40),
    practiceSinceYear: year,
  }),
  registration: z.object({
    systemOfMedicine: z.enum(SYSTEMS_OF_MEDICINE),
    systemOther: t(80),
    registration: z.object({
      councilId: optOid,
      number: t(40),
      year,
      nmrId: t(40),
    }),
    qualifications: z
      .array(
        z.object({
          degreeId: oid,
          specialization: t(80),
          institute: z.string().trim().max(150).default(""),
          year,
        }),
      )
      .max(12),
  }),
  practice: z.object({
    practitionerType: z.enum(PRACTITIONER_TYPES),
    primarySpecialtyId: optOid,
    secondarySpecialtyIds: z.array(oid).max(5),
    services: z
      .array(z.object({ name: z.string().trim().min(1, "Service name is required.").max(80), description: t(200) }))
      .max(30),
    conditionsTreated: chips(40, 80),
  }),
  clinics: z.object({
    clinics: z
      .array(
        z.object({
          key: z.string().max(40),
          name: z.string().trim().min(1, "Clinic name is required.").max(120),
          type: z.enum(CLINIC_TYPES),
          addressLine1: z.string().trim().min(1, "Address is required.").max(200),
          addressLine2: t(200),
          cityId: oid,
          areaId: oid,
          state: z.string().trim().min(1).max(60),
          pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode."),
          mapsUrl: url,
          lat: z.string().trim().refine((s) => s === "" || (Number(s) >= -90 && Number(s) <= 90), "Latitude is -90 to 90."),
          lng: z.string().trim().refine((s) => s === "" || (Number(s) >= -180 && Number(s) <= 180), "Longitude is -180 to 180."),
          phone,
          timings: z
            .array(
              z.object({
                day: z.number().int().min(0).max(6),
                slots: z
                  .array(
                    z
                      .object({ open: z.string().regex(HHMM, "Use HH:MM."), close: z.string().regex(HHMM, "Use HH:MM.") })
                      .refine((s) => s.open !== s.close, "Opening and closing times are the same."),
                  )
                  .max(4),
              }),
            )
            .max(7),
          appointmentNote: t(200),
          fee: z.number().int().min(0).max(100000).optional(),
          showFee: z.boolean(),
          establishmentId: optOid,
        }),
      )
      .max(MAX_CLINICS, `Up to ${MAX_CLINICS} clinics and hospitals.`),
  }),
  contact: z.object({
    mobile,
    whatsapp: mobile,
    email,
    links: z.object({
      googleBusiness: url,
      practo: url,
      instagram: url,
      facebook: url,
      linkedin: url,
      youtube: url,
      website: url,
    }),
    ownerEmail: email,
  }),
  about: z
    .object({
      shortBio: t(LIMITS.shortBio),
      fullBio: z.string().max(5000),
      awards: z
        .array(
          z.object({
            title: z.string().trim().min(1, "Award title is required.").max(120),
            awardingBody: z.string().trim().min(1, "Awarding body is required.").max(120),
            year: z.number({ required_error: "Award year is required." }).int().min(1900).max(new Date().getFullYear()),
            photo: image.optional(),
          }),
        )
        .max(15),
      memberships: z.array(z.object({ name: z.string().trim().min(1).max(120), since: year })).max(15),
      publications: z
        .array(z.object({ title: z.string().trim().min(1).max(250), journal: t(150), year, url }))
        .max(20),
      interests: chips(12, 60),
      interestsPhoto: image.extend({ caption: t(120) }).optional(),
      interestsStory,
      gallery: z.array(image.extend({ caption: z.string().trim().max(120) })).max(LIMITS.galleryMax),
    })
    .refine((a) => a.gallery.length + a.awards.filter((x) => x.photo).length <= LIMITS.galleryMax, {
      message: `At most ${LIMITS.galleryMax} photos in total (gallery and award photos).`,
      path: ["gallery"],
    }),
  seo: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => s === "" || (SLUG_RE.test(s) && s.length <= 100), "Use lowercase letters, numbers and hyphens.")
      .transform((s) => s || undefined),
    shortSlug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => s === "" || (SLUG_RE.test(s) && s.startsWith("dr-") && s.length <= 80), "Short links start with dr-.")
      .transform((s) => s || undefined),
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (s) => s === "" || (SUBDOMAIN_RE.test(s) && s.length >= LIMITS.subdomainMin && s.length <= LIMITS.subdomainMax && !s.includes("--")),
        `Use ${LIMITS.subdomainMin}–${LIMITS.subdomainMax} lowercase letters, numbers and hyphens.`,
      )
      .transform((s) => s || undefined),
    seo: z.object({ titleOverride: t(70), descriptionOverride: t(160), noindex: z.boolean() }),
  }),
  business: z.object({
    plan: z.enum(DOCTOR_PLANS),
    founding: z.boolean(),
    setupPaidAt: dateStr,
    renewalPrice: z.number().int().min(0).max(100000).optional(),
    renewalDueDate: dateStr,
    freeUpdateUsed: z.boolean(),
    ownDomain: z.object({
      name: z
        .string()
        .trim()
        .toLowerCase()
        .refine((s) => s === "" || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s), "Enter a domain like drshah.in"),
      status: z.enum(DOMAIN_STATUSES),
      cost: z.number().min(0).max(100000).optional(),
      renewalDate: dateStr,
    }),
    establishmentIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.")).max(20),
    salesExecutive: t(80),
    salesExecutiveId: t(40),
    source: z.enum(["", ...DOCTOR_SOURCES]).transform((s) => s || undefined),
    internalNotes: t(2000),
  }),
  templates: z.object({
    portfolioTemplateId: z.enum(TEMPLATE_KEYS),
    showHealthTips: z.boolean().default(true),
  }),
  review: approvalSchema,
  publish: approvalSchema,
} satisfies Record<StepKey, z.ZodTypeAny>;

/** Pick a section's fields out of the full form (what the client sends). */
export function sectionPayload(step: StepKey, f: DoctorForm): unknown {
  switch (step) {
    case "basics":
      return { title: f.title, firstName: f.firstName, middleName: f.middleName, lastName: f.lastName, displayName: f.displayName, gender: f.gender, photo: f.photo, languages: f.languages, practiceSinceYear: f.practiceSinceYear };
    case "registration":
      return { systemOfMedicine: f.systemOfMedicine, systemOther: f.systemOther, registration: f.registration, qualifications: f.qualifications };
    case "practice":
      return { practitionerType: f.practitionerType, primarySpecialtyId: f.primarySpecialtyId, secondarySpecialtyIds: f.secondarySpecialtyIds, services: f.services, conditionsTreated: f.conditionsTreated };
    case "clinics":
      return { clinics: f.clinics };
    case "contact":
      return { mobile: f.mobile, whatsapp: f.whatsapp, email: f.email, links: f.links, ownerEmail: f.ownerEmail };
    case "about":
      return { shortBio: f.shortBio, fullBio: f.fullBio, awards: f.awards, memberships: f.memberships, publications: f.publications, interests: f.interests, interestsPhoto: f.interestsPhoto, interestsStory: f.interestsStory, gallery: f.gallery };
    case "seo":
      return { slug: f.slug, shortSlug: f.shortSlug, subdomain: f.subdomain, seo: f.seo };
    case "business":
      return { plan: f.plan, founding: f.founding, setupPaidAt: f.setupPaidAt, renewalPrice: f.renewalPrice, renewalDueDate: f.renewalDueDate, freeUpdateUsed: f.freeUpdateUsed, ownDomain: f.ownDomain, establishmentIds: f.establishmentIds, salesExecutive: f.salesExecutive, salesExecutiveId: f.salesExecutiveId, source: f.source, internalNotes: f.internalNotes };
    case "templates":
      return { portfolioTemplateId: f.portfolioTemplateId, showHealthTips: f.showHealthTips };
    case "review":
    case "publish":
      return { approval: f.approval };
  }
}
