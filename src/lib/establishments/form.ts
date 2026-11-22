import { z } from "zod";
import {
  APPROVAL_CHANNELS,
  DOMAIN_STATUSES,
  ESTABLISHMENT_KINDS,
  ESTABLISHMENT_SOURCES,
  LIMITS,
  TEMPLATE_KEYS,
  type DoctorStatus,
  type EstablishmentKind,
  type RenewalStatus,
} from "@/lib/constants";
import { SITE_CARD_STYLE_CODES } from "@/lib/cards/styles";
import { htmlToText } from "@/lib/compliance/scan";
import { chips, dateStr, email, HHMM, image, optOid, phone, t, url, type ImageValue } from "@/lib/doctors/form";
import { SLUG_RE, SUBDOMAIN_RE } from "@/lib/slug";
import { THEME_KEYS, type ThemeKey } from "@/themes/specialty";

/**
 * The clinic / small-hospital editor's data model (MEDIREACH_BUILD_PROMPT.md
 * Phase 4, "Clinic/hospital form"), shared by the browser and the server.
 * Empty optional values are "" in the form and `undefined` once validated.
 *
 * NMC: factual establishment information only. No reviews, ratings,
 * testimonials or before/after; free text is scanned before publishing.
 */

export interface DayTimingsValue {
  day: number;
  slots: { open: string; close: string }[];
}
export interface NamedValue {
  name: string;
  description: string;
}

export interface EstablishmentForm {
  id?: string;
  status: DoctorStatus;
  updatedAt?: string;
  publishedAt?: string;

  // 1 Basics (the kind is fixed by the "New clinic" / "New hospital" button)
  kind: EstablishmentKind;
  name: string;
  categoryId: string;
  logo?: ImageValue;
  coverPhoto?: ImageValue;
  tagline: string;
  shortDescription: string;
  about: string; // sanitised HTML

  // Design (as in the doctor editor)
  themeKey: ThemeKey;
  siteTemplateId: string;
  cardTemplateId: string;
  /** Visiting card colour style code ("" = the specialty theme colours). */
  cardStyle: string;

  // 2 Location and contact
  address: { line1: string; line2: string; cityId: string; areaId: string; state: string; pincode: string; landmark: string; parkingNote: string };
  mapsUrl: string;
  lat: string;
  lng: string;
  phones: string[];
  whatsapp: string;
  email: string;
  emergencyPhone: string;
  languages: string[];
  links: { googleBusiness: string; practo: string; instagram: string; facebook: string; youtube: string; website: string };

  // 3 Timings
  is24x7: boolean;
  timings: DayTimingsValue[];
  appointmentNote: string;

  // 4 Services, facilities, equipment
  services: (NamedValue & { group: string })[];
  facilities: NamedValue[];
  equipment: NamedValue[];

  // 5 Doctors
  doctors: {
    key: string;
    doctorProfileId: string;
    name: string;
    qualifications: string;
    specialty: string;
    role: string;
    /** Only for doctors without a linked portfolio (a portfolio brings its own photo). */
    photo?: ImageValue;
    profileUrl: string;
  }[];

  // 6 Registration and hospital extras
  registration: { authority: string; number: string };
  departments: { key: string; name: string; description: string; doctorIds: string[] }[];
  beds: { total: number | undefined; types: { type: string; count: number | undefined }[] };
  insurance: { cashless: boolean; providers: string[] };
  visitingHours: string;

  // 7 Gallery
  gallery: (ImageValue & { caption: string })[];

  // 8 SEO
  citySlug: string;
  slug: string;
  shortSlug: string;
  subdomain: string;
  seo: { titleOverride: string; descriptionOverride: string; noindex: boolean };

  // 9 Business
  founding: boolean;
  foundingNumber: number | undefined;
  setupPaidAt: string;
  renewalPrice: number | undefined;
  renewalDueDate: string;
  renewalStatus: RenewalStatus;
  ownDomain: { name: string; status: (typeof DOMAIN_STATUSES)[number]; cost: number | undefined; renewalDate: string };
  salesExecutive: string;
  salesExecutiveId: string;
  source: "" | (typeof ESTABLISHMENT_SOURCES)[number];
  contactPerson: { name: string; phone: string; email: string };
  ownerEmail: string;
  internalNotes: string;

  // 10 Review
  approval: { ownerApprovedAt: string; approvedVia: "" | (typeof APPROVAL_CHANNELS)[number] };
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function randomKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyEstablishmentForm(kind: EstablishmentKind = "clinic"): EstablishmentForm {
  return {
    status: "draft",
    kind,
    name: "",
    categoryId: "",
    themeKey: kind === "hospital" ? "small-hospital" : "general-opd",
    tagline: "",
    shortDescription: "",
    about: "",
    siteTemplateId: "classic",
    cardTemplateId: "classic",
    cardStyle: "",
    address: { line1: "", line2: "", cityId: "", areaId: "", state: "Maharashtra", pincode: "", landmark: "", parkingNote: "" },
    mapsUrl: "",
    lat: "",
    lng: "",
    phones: [""],
    whatsapp: "",
    email: "",
    emergencyPhone: "",
    languages: ["English", "Hindi", "Marathi"],
    links: { googleBusiness: "", practo: "", instagram: "", facebook: "", youtube: "", website: "" },
    is24x7: kind === "hospital",
    timings: ALL_DAYS.map((day) => ({ day, slots: [] })),
    appointmentNote: "",
    services: [],
    facilities: [],
    equipment: [],
    doctors: [],
    registration: { authority: "", number: "" },
    departments: [],
    beds: { total: undefined, types: [] },
    insurance: { cashless: false, providers: [] },
    visitingHours: "",
    gallery: [],
    citySlug: "",
    slug: "",
    shortSlug: "",
    subdomain: "",
    seo: { titleOverride: "", descriptionOverride: "", noindex: false },
    founding: false,
    foundingNumber: undefined,
    setupPaidAt: "",
    renewalPrice: undefined,
    renewalDueDate: "",
    renewalStatus: "active",
    ownDomain: { name: "", status: "requested", cost: undefined, renewalDate: "" },
    salesExecutive: "",
    salesExecutiveId: "",
    source: "",
    contactPerson: { name: "", phone: "", email: "" },
    ownerEmail: "",
    internalNotes: "",
    approval: { ownerApprovedAt: "", approvedVia: "" },
  };
}

export const galleryMax = (kind: EstablishmentKind) => (kind === "hospital" ? LIMITS.hospitalGalleryMax : LIMITS.clinicGalleryMax);

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export const STEPS = [
  { key: "basics", title: "Basics" },
  { key: "location", title: "Location and contact" },
  { key: "timings", title: "Timings" },
  { key: "services", title: "Services, facilities and equipment" },
  { key: "doctors", title: "Doctors" },
  { key: "extras", title: "Registration and hospital details" },
  { key: "gallery", title: "Gallery" },
  { key: "seo", title: "SEO" },
  { key: "design", title: "Design" },
  { key: "business", title: "Business" },
  { key: "review", title: "Review" },
  { key: "publish", title: "Publish" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Step title (the "extras" step reads differently for clinics). */
export function stepTitle(step: StepKey, kind: EstablishmentKind): string {
  if (step === "extras" && kind === "clinic") return "Registration and insurance";
  return STEPS.find((s) => s.key === step)!.title;
}

const hasTimings = (f: EstablishmentForm) => f.is24x7 || f.timings.some((d) => d.slots.length > 0);
const filledPhones = (f: EstablishmentForm) => f.phones.filter((p) => p.trim());

export function stepComplete(step: StepKey, f: EstablishmentForm): boolean {
  switch (step) {
    case "basics":
      return Boolean(f.name && f.categoryId && f.shortDescription);
    case "location":
      return Boolean(f.address.line1 && f.address.areaId && /^\d{6}$/.test(f.address.pincode) && filledPhones(f).length);
    case "timings":
      return hasTimings(f);
    case "services":
      return f.services.length > 0;
    case "doctors":
      return f.doctors.length > 0;
    case "extras":
      return f.kind === "hospital" ? Boolean(f.registration.number && f.beds.total !== undefined) : true;
    case "gallery":
      return f.gallery.length > 0;
    case "seo":
      return Boolean(f.slug);
    case "business":
      return f.kind === "hospital" ? Boolean(f.source) : true;
    case "design":
      return Boolean(f.themeKey && f.siteTemplateId && f.cardTemplateId);
    case "review":
      return publishBlockers(f).every((b) => b.field === "publish");
    case "publish":
      return f.status === "published";
  }
}

/** Everything required before publishing (the server re-checks). */
export function publishBlockers(f: EstablishmentForm): { field: StepKey; message: string }[] {
  const out: { field: StepKey; message: string }[] = [];
  if (!f.name.trim()) out.push({ field: "basics", message: "Name" });
  if (!f.categoryId) out.push({ field: "basics", message: "Category" });
  if (!f.address.line1 || !f.address.cityId || !f.address.areaId || !/^\d{6}$/.test(f.address.pincode)) {
    out.push({ field: "location", message: "Address, city, area and 6-digit pincode" });
  }
  if (filledPhones(f).length === 0) out.push({ field: "location", message: "At least one phone number" });
  if (f.kind === "hospital" && (!f.registration.authority || !f.registration.number)) {
    out.push({ field: "extras", message: "Hospital registration (authority and number)" });
  }
  if (f.doctors.some((d) => !d.doctorProfileId && !d.name.trim())) out.push({ field: "doctors", message: "Every doctor needs a name or a linked portfolio" });
  if (!f.approval.ownerApprovedAt || !f.approval.approvedVia) {
    out.push({ field: "publish", message: "Owner's approval (date and how they approved)" });
  }
  return out;
}

/** Nice-to-haves (warnings, not blockers). */
export function recommendedMissing(f: EstablishmentForm): string[] {
  const out: string[] = [];
  if (!f.shortDescription) out.push("Short description");
  if (!hasTimings(f)) out.push("Timings (or 24×7)");
  if (!f.lat || !f.lng) out.push("Map location (latitude/longitude)");
  if (f.services.length === 0) out.push("Services");
  if (f.doctors.length === 0) out.push("Doctors");
  if (f.gallery.length === 0) out.push("Photos of the premises");
  if (!f.logo) out.push("Logo");
  return out;
}

/** Every free-text field the NMC scanner checks, keyed by a path the editor can jump to. */
export function complianceTextFields(f: EstablishmentForm): Record<string, string> {
  const out: Record<string, string> = {
    tagline: f.tagline,
    shortDescription: f.shortDescription,
    about: htmlToText(f.about),
    appointmentNote: f.appointmentNote,
    visitingHours: f.visitingHours,
    "address.parkingNote": f.address.parkingNote,
    "seo.titleOverride": f.seo.titleOverride,
    "seo.descriptionOverride": f.seo.descriptionOverride,
  };
  const list = (key: "services" | "facilities" | "equipment") =>
    f[key].forEach((s, i) => {
      out[`${key}.${i}.name`] = s.name;
      out[`${key}.${i}.description`] = s.description;
    });
  list("services");
  list("facilities");
  list("equipment");
  f.doctors.forEach((d, i) => (out[`doctors.${i}.role`] = d.role));
  f.departments.forEach((d, i) => {
    out[`departments.${i}.name`] = d.name;
    out[`departments.${i}.description`] = d.description;
  });
  f.gallery.forEach((g, i) => (out[`gallery.${i}.caption`] = g.caption));
  return out;
}

export function stepForField(path: string): StepKey {
  const head = path.split(".")[0]!;
  if (["tagline", "shortDescription", "about"].includes(head)) return "basics";
  if (head === "address") return "location";
  if (head === "appointmentNote") return "timings";
  if (["services", "facilities", "equipment"].includes(head)) return "services";
  if (head === "doctors") return "doctors";
  if (["departments", "visitingHours"].includes(head)) return "extras";
  if (head === "gallery") return "gallery";
  if (head === "seo") return "seo";
  return "basics";
}

// ---------------------------------------------------------------------------
// Server-side section schemas
// ---------------------------------------------------------------------------

const timings = z
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
  .max(7);
const named = (max: number) => z.array(z.object({ name: z.string().trim().min(1, "Add a name.").max(120), description: t(300) })).max(max);
const intOpt = (max: number) => z.number().int().min(0).max(max).optional();
const latLng = (lo: number, hi: number) =>
  z
    .string()
    .trim()
    .refine((s) => s === "" || (!Number.isNaN(Number(s)) && Number(s) >= lo && Number(s) <= hi), "Enter a valid coordinate.");

const approvalSchema = z.object({
  approval: z.object({
    ownerApprovedAt: dateStr,
    approvedVia: z.enum(["", ...APPROVAL_CHANNELS]).transform((s) => s || undefined),
  }),
});

export const sectionSchemas = {
  basics: z.object({
    kind: z.enum(ESTABLISHMENT_KINDS),
    name: z.string().trim().min(2, "Enter the name.").max(120),
    categoryId: optOid,
    logo: image.optional(),
    coverPhoto: image.optional(),
    tagline: t(120),
    shortDescription: t(LIMITS.shortBio),
    about: z.string().max(10_000),
  }),
  design: z.object({
    themeKey: z.enum(THEME_KEYS as [ThemeKey, ...ThemeKey[]]),
    siteTemplateId: z.enum(TEMPLATE_KEYS),
    cardTemplateId: z.enum(TEMPLATE_KEYS),
    cardStyle: z.enum(["", ...SITE_CARD_STYLE_CODES] as [string, ...string[]]).transform((s) => s || undefined),
  }),
  location: z
    .object({
      address: z.object({
        line1: t(200),
        line2: t(200),
        cityId: optOid,
        areaId: optOid,
        state: t(60),
        pincode: z
          .string()
          .trim()
          .refine((s) => s === "" || /^\d{6}$/.test(s), "Enter a 6-digit pincode.")
          .transform((s) => s || undefined),
        landmark: t(120),
        parkingNote: t(200),
      }),
      mapsUrl: url,
      lat: latLng(-90, 90),
      lng: latLng(-180, 180),
      phones: z.array(phone).max(4),
      whatsapp: phone,
      email,
      emergencyPhone: phone,
      languages: chips(12, 40),
      links: z.object({ googleBusiness: url, practo: url, instagram: url, facebook: url, youtube: url, website: url }),
    })
    .refine((d) => (d.lat === "") === (d.lng === ""), { message: "Enter both latitude and longitude.", path: ["lng"] }),
  timings: z.object({ is24x7: z.boolean(), timings, appointmentNote: t(200) }),
  services: z.object({
    services: z.array(z.object({ name: z.string().trim().min(1, "Add a name.").max(120), description: t(300), group: t(60) })).max(60),
    facilities: named(40),
    equipment: named(40),
  }),
  doctors: z.object({
    doctors: z
      .array(
        z
          .object({
            key: z.string().max(40),
            doctorProfileId: optOid,
            name: t(120),
            qualifications: t(160),
            specialty: t(80),
            role: t(80),
            photo: image.optional(),
            profileUrl: url,
          })
          .refine((d) => d.doctorProfileId || d.name, { message: "Pick a doctor or type a name.", path: ["name"] }),
      )
      .max(60)
      .refine((list) => {
        const ids = list.map((d) => d.doctorProfileId).filter(Boolean);
        return new Set(ids).size === ids.length;
      }, "The same doctor is listed twice."),
  }),
  extras: z.object({
    registration: z.object({ authority: t(120), number: t(60) }),
    departments: z
      .array(z.object({ key: z.string().max(40), name: z.string().trim().min(1, "Add a name.").max(80), description: t(300), doctorIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(30) }))
      .max(30),
    beds: z
      .object({
        total: intOpt(LIMITS.hospitalBedsMax),
        types: z.array(z.object({ type: z.string().trim().min(1, "Name the bed type.").max(60), count: intOpt(LIMITS.hospitalBedsMax) })).max(10),
      })
      .refine((b) => b.types.reduce((n, x) => n + (x.count ?? 0), 0) <= (b.total ?? 0) || b.types.length === 0, {
        message: `Bed types add up to more than the total (at most ${LIMITS.hospitalBedsMax} beds).`,
        path: ["total"],
      }),
    insurance: z.object({ cashless: z.boolean(), providers: chips(60, 80) }),
    visitingHours: t(200),
  }),
  gallery: z.object({
    gallery: z.array(image.extend({ caption: t(150).transform((v) => v ?? "") })).max(LIMITS.hospitalGalleryMax),
  }),
  seo: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => s === "" || SLUG_RE.test(s), "Use lowercase letters, numbers and hyphens.")
      .transform((s) => s || undefined),
    shortSlug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((s) => s === "" || (SLUG_RE.test(s) && !s.startsWith("dr-")), "Use lowercase letters, numbers and hyphens (not starting with dr-).")
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
    founding: z.boolean(),
    setupPaidAt: dateStr,
    renewalPrice: z.number().int().min(0).max(100000).optional(),
    renewalDueDate: dateStr,
    ownDomain: z.object({
      name: z
        .string()
        .trim()
        .toLowerCase()
        .refine((s) => s === "" || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s), "Enter a domain like shreeclinic.in"),
      status: z.enum(DOMAIN_STATUSES),
      cost: z.number().min(0).max(100000).optional(),
      renewalDate: dateStr,
    }),
    salesExecutive: t(80),
    salesExecutiveId: t(40),
    source: z.enum(["", ...ESTABLISHMENT_SOURCES]).transform((s) => s || undefined),
    contactPerson: z.object({ name: t(80), phone, email }),
    ownerEmail: email,
    internalNotes: t(2000),
  }),
  // The owner's approval: saved from the Publish step (Review sends the same, harmlessly).
  review: approvalSchema,
  publish: approvalSchema,
} satisfies Record<StepKey, z.ZodTypeAny>;

export type SectionData<K extends StepKey> = z.output<(typeof sectionSchemas)[K]>;

/** Pick a step's fields out of the full form (what the client sends). */
export function sectionPayload(step: StepKey, f: EstablishmentForm): unknown {
  switch (step) {
    case "basics":
      return {
        kind: f.kind,
        name: f.name,
        categoryId: f.categoryId,
        logo: f.logo,
        coverPhoto: f.coverPhoto,
        tagline: f.tagline,
        shortDescription: f.shortDescription,
        about: f.about,
      };
    case "design":
      return { themeKey: f.themeKey, siteTemplateId: f.siteTemplateId, cardTemplateId: f.cardTemplateId, cardStyle: f.cardStyle };
    case "location":
      return {
        address: f.address,
        mapsUrl: f.mapsUrl,
        lat: f.lat,
        lng: f.lng,
        phones: f.phones,
        whatsapp: f.whatsapp,
        email: f.email,
        emergencyPhone: f.emergencyPhone,
        languages: f.languages,
        links: f.links,
      };
    case "timings":
      return { is24x7: f.is24x7, timings: f.timings, appointmentNote: f.appointmentNote };
    case "services":
      return { services: f.services, facilities: f.facilities, equipment: f.equipment };
    case "doctors":
      // A linked portfolio brings its own photo and page; the outside link and photo are for doctors added by name.
      return { doctors: f.doctors.map((d) => (d.doctorProfileId ? { ...d, photo: undefined, profileUrl: "" } : d)) };
    case "extras":
      return { registration: f.registration, departments: f.departments, beds: f.beds, insurance: f.insurance, visitingHours: f.visitingHours };
    case "gallery":
      return { gallery: f.gallery };
    case "seo":
      return { slug: f.slug, shortSlug: f.shortSlug, subdomain: f.subdomain, seo: f.seo };
    case "business":
      return {
        founding: f.founding,
        setupPaidAt: f.setupPaidAt,
        renewalPrice: f.renewalPrice,
        renewalDueDate: f.renewalDueDate,
        ownDomain: f.ownDomain,
        salesExecutive: f.salesExecutive,
        salesExecutiveId: f.salesExecutiveId,
        source: f.source,
        contactPerson: f.contactPerson,
        ownerEmail: f.ownerEmail,
        internalNotes: f.internalNotes,
      };
    case "review":
    case "publish":
      return { approval: f.approval };
  }
}
