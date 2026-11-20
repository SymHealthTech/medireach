import { z } from "zod";
import { LIMITS, type IntakeKind } from "@/lib/constants";

/**
 * Self-filled website forms ("Get started" → Doctor / Clinic / Hospital).
 *
 * A busy doctor or clinic owner sends us everything we need to build their
 * website, in their own time: they can save half a form and come back later
 * with the same email. The admin reviews the form, fills any gaps and turns
 * it into a draft site with one click.
 *
 * Everything here is plain text on purpose (no master-list ids): applicants
 * write "Kothrud" or "MBBS – BJ Medical College, 2008", and the admin maps it
 * in the real editor. One definition drives the public form, validation, the
 * "what's missing" list and the admin view, so they never drift.
 *
 * Pure module: used by the browser and the server.
 */

export type FieldType =
  | "text"
  | "email"
  /** Indian mobile number (10 digits). */
  | "mobile"
  /** Any phone number, or several separated by commas. */
  | "phone"
  | "url"
  | "textarea"
  /** One item per line. */
  | "lines"
  | "year"
  | "number"
  | "pincode"
  | "select"
  | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Needed before the form can be sent for review (never needed to save). */
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: readonly { value: string; label: string }[];
  max?: number;
  /** Spans both columns. */
  wide?: boolean;
  autoComplete?: string;
}

export interface SectionDef {
  key: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  /** A repeating group (a doctor's clinics), stored as an array of objects under `key`. */
  repeat?: { max: number; itemLabel: string; addLabel: string; minToSubmit: number };
}

export type FieldValue = string | boolean;
export type RepeatItem = Record<string, FieldValue>;
export type IntakeData = Record<string, FieldValue | RepeatItem[]>;

export interface IntakePhoto {
  publicId: string;
  url: string;
  caption?: string;
}
export type SinglePhotoKey = "profile" | "logo" | "cover";
export interface IntakePhotos {
  profile?: IntakePhoto;
  logo?: IntakePhoto;
  cover?: IntakePhoto;
  gallery: IntakePhoto[];
  /** "I'll send my photos on WhatsApp." */
  viaWhatsapp: boolean;
}

export interface PhotoConfig {
  singles: { key: SinglePhotoKey; label: string; help: string }[];
  galleryMax: number;
  galleryLabel: string;
  galleryHelp: string;
}

// --- Field helpers ----------------------------------------------------------

const text = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "text", ...extra });

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

const SYSTEMS = [
  { value: "allopathy", label: "Allopathy (MBBS)" },
  { value: "dental", label: "Dental" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "homeopathy", label: "Homeopathy" },
  { value: "unani", label: "Unani" },
  { value: "siddha", label: "Siddha" },
  { value: "other", label: "Other" },
] as const;

const TIMINGS_PLACEHOLDER = "Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm\nSunday: closed";

const linksSection: SectionDef = {
  key: "links",
  title: "Online links",
  description: "Optional. Paste any links you already have.",
  fields: [
    { key: "googleBusiness", label: "Google Maps / Business profile", type: "url", wide: true },
    { key: "instagram", label: "Instagram", type: "url" },
    { key: "facebook", label: "Facebook", type: "url" },
    { key: "youtube", label: "YouTube", type: "url" },
    { key: "practo", label: "Practo or other listing", type: "url" },
    { key: "website", label: "Current website", type: "url", wide: true },
  ],
};

const preferencesSection = (cardPlaceholder: string, namePlaceholder: string): SectionDef => ({
  key: "preferences",
  title: "Anything else",
  fields: [
    text("websiteName", "Website name you would like", { placeholder: namePlaceholder, help: "Your website address will be <name>.medireach.co.in. We check it is free." }),
    text("cardStyle", "Design or visiting card code", { placeholder: cardPlaceholder, help: "Optional. See the visiting card styles and specialty designs on our website." }),
    { key: "notes", label: "Notes for our team", type: "textarea", wide: true, placeholder: "Anything you want on the website, or things we should know." },
  ],
});

const contactPersonSection: SectionDef = {
  key: "contact",
  title: "Contact person",
  description: "Who we should call if something is missing.",
  fields: [
    text("contactName", "Your name", { required: true, autoComplete: "name" }),
    text("contactRole", "Your role", { placeholder: "Owner, doctor, manager" }),
    { key: "mobile", label: "Mobile number", type: "mobile", required: true, autoComplete: "tel" },
    { key: "whatsapp", label: "WhatsApp number", type: "mobile", help: "Leave empty if it is the same as the mobile number." },
  ],
};

const servicesFields = (): FieldDef[] => [
  { key: "services", label: "Services / treatments", type: "lines", wide: true, placeholder: "One per line\nSkin allergy treatment\nAcne treatment" },
  { key: "facilities", label: "Facilities", type: "lines", placeholder: "One per line\nWheelchair access\nParking" },
  { key: "equipment", label: "Equipment", type: "lines", placeholder: "One per line\nDigital X-ray" },
];

// --- Doctor -----------------------------------------------------------------

const DOCTOR: SectionDef[] = [
  {
    key: "about",
    title: "About you",
    fields: [
      text("fullName", "Full name", { required: true, placeholder: "Dr. Amit Kulkarni", autoComplete: "name" }),
      { key: "mobile", label: "Mobile number", type: "mobile", required: true, autoComplete: "tel", help: "We call you on this number if anything is missing." },
      { key: "whatsapp", label: "WhatsApp number", type: "mobile", help: "Leave empty if it is the same as the mobile number." },
      { key: "gender", label: "Gender", type: "select", options: GENDERS },
      text("specialty", "Specialty", { required: true, placeholder: "General Physician, Dermatologist…" }),
      { key: "systemOfMedicine", label: "System of medicine", type: "select", options: SYSTEMS },
      {
        key: "qualifications",
        label: "Qualifications",
        type: "lines",
        required: true,
        wide: true,
        placeholder: "One per line\nMBBS – BJ Medical College, Pune – 2008\nMD (Medicine) – KEM Hospital, Mumbai – 2012",
      },
      { key: "practiceSince", label: "Practising since (year)", type: "year", placeholder: "2012" },
      text("languages", "Languages you speak", { placeholder: "English, Hindi, Marathi" }),
    ],
  },
  {
    key: "registration",
    title: "Registration",
    description: "The NMC guidelines ask for your registration number on your website.",
    fields: [
      text("council", "Medical council", { placeholder: "Maharashtra Medical Council" }),
      text("registrationNumber", "Registration number", { required: true }),
      { key: "registrationYear", label: "Registration year", type: "year" },
    ],
  },
  {
    key: "clinics",
    title: "Clinics and timings",
    description: "Where patients can meet you. Add up to 3 places.",
    repeat: { max: 3, itemLabel: "Clinic", addLabel: "Add another clinic", minToSubmit: 1 },
    fields: [
      text("name", "Clinic or hospital name", { required: true }),
      { key: "phone", label: "Clinic phone", type: "phone" },
      { key: "address", label: "Address", type: "textarea", required: true, wide: true, placeholder: "Shop 4, Shanti Complex, Karve Road" },
      text("area", "Area", { required: true, placeholder: "Kothrud" }),
      text("city", "City", { required: true, placeholder: "Pune" }),
      { key: "pincode", label: "Pincode", type: "pincode" },
      { key: "mapsUrl", label: "Google Maps link", type: "url" },
      { key: "timings", label: "Timings", type: "textarea", required: true, wide: true, placeholder: TIMINGS_PLACEHOLDER },
      { key: "fee", label: "Consultation fee (₹)", type: "number", help: "Optional. Shown only if you want." },
      text("appointmentNote", "Appointment note", { placeholder: "Appointments preferred. Walk-ins welcome." }),
    ],
  },
  {
    key: "practice",
    title: "Your practice",
    description: "Facts only: the NMC guidelines don't allow patient reviews, testimonials or claims like “best”.",
    fields: [
      { key: "shortBio", label: "Short introduction (1–2 lines)", type: "textarea", max: LIMITS.shortBio, wide: true },
      { key: "aboutMe", label: "About you", type: "textarea", wide: true, placeholder: "Your experience, training and how you work with patients." },
      { key: "services", label: "Services you offer", type: "lines", placeholder: "One per line\nDiabetes care\nHealth check-ups" },
      { key: "conditions", label: "Conditions you treat", type: "lines", placeholder: "One per line\nThyroid disorders\nFever and infections" },
      { key: "awards", label: "Awards", type: "lines", placeholder: "Award – Given by – Year" },
      { key: "memberships", label: "Memberships", type: "lines", placeholder: "Indian Medical Association – 2010" },
      text("interests", "Hobbies and interests", { wide: true, placeholder: "Running, classical music, trekking" }),
    ],
  },
  { ...linksSection, fields: [...linksSection.fields.slice(0, 3), { key: "linkedin", label: "LinkedIn", type: "url" }, ...linksSection.fields.slice(3)] },
  preferencesSection("DOC-AMBER", "dramit"),
];

// --- Clinic / hospital ------------------------------------------------------

const addressFields = (): FieldDef[] => [
  { key: "address", label: "Address", type: "textarea", required: true, wide: true, placeholder: "Shop 4, Shanti Complex, Karve Road" },
  text("area", "Area", { required: true, placeholder: "Kothrud" }),
  text("city", "City", { required: true, placeholder: "Pune" }),
  { key: "pincode", label: "Pincode", type: "pincode", required: true },
  text("landmark", "Landmark", { placeholder: "Opposite City Pride" }),
  { key: "mapsUrl", label: "Google Maps link", type: "url", wide: true },
  { key: "phones", label: "Phone numbers", type: "phone", required: true, help: "Separate several numbers with commas." },
  { key: "siteWhatsapp", label: "WhatsApp number for patients", type: "mobile" },
  { key: "siteEmail", label: "Email for patients", type: "email", wide: true },
];

const CLINIC: SectionDef[] = [
  {
    key: "about",
    title: "About the clinic",
    fields: [
      text("name", "Clinic name", { required: true }),
      text("clinicType", "Type of clinic", { required: true, placeholder: "Skin clinic, dental clinic, multi-speciality…" }),
      text("tagline", "One-line description", { wide: true, placeholder: "Skin, hair and nail care in Kothrud" }),
      { key: "about", label: "About the clinic", type: "textarea", wide: true },
      { key: "yearStarted", label: "Year started", type: "year" },
      text("languages", "Languages spoken", { placeholder: "English, Hindi, Marathi" }),
    ],
  },
  contactPersonSection,
  {
    key: "address",
    title: "Address and timings",
    fields: [
      ...addressFields(),
      { key: "timings", label: "Timings", type: "textarea", required: true, wide: true, placeholder: TIMINGS_PLACEHOLDER },
      text("appointmentNote", "Appointment note", { wide: true, placeholder: "Appointments preferred. Walk-ins welcome." }),
    ],
  },
  {
    key: "doctors",
    title: "Doctors",
    fields: [
      {
        key: "doctors",
        label: "Doctors at the clinic",
        type: "lines",
        wide: true,
        placeholder: "One per line\nDr. Neha Joshi – MBBS, MD (Dermatology) – Dermatologist",
        help: "Each doctor can also get their own portfolio page. Ask us.",
      },
    ],
  },
  { key: "services", title: "Services and facilities", fields: servicesFields() },
  {
    key: "registration",
    title: "Registration",
    description: "Optional for clinics.",
    fields: [text("regAuthority", "Registered with", { placeholder: "Pune Municipal Corporation" }), text("regNumber", "Registration number")],
  },
  linksSection,
  preferencesSection("CLN-TEAL", "shreeskin"),
];

const HOSPITAL: SectionDef[] = [
  {
    key: "about",
    title: "About the hospital",
    fields: [
      text("name", "Hospital name", { required: true }),
      text("hospitalType", "Type of hospital", { placeholder: "Multi-speciality, maternity, orthopaedic…" }),
      text("tagline", "One-line description", { wide: true, placeholder: "A 10-bed multi-speciality hospital in Wakad" }),
      { key: "about", label: "About the hospital", type: "textarea", wide: true },
      { key: "beds", label: "Number of beds", type: "number", help: `For hospitals up to ${LIMITS.hospitalBedsMax} beds.` },
      { key: "yearStarted", label: "Year started", type: "year" },
      text("languages", "Languages spoken", { wide: true, placeholder: "English, Hindi, Marathi" }),
    ],
  },
  contactPersonSection,
  {
    key: "address",
    title: "Address, timings and emergency",
    fields: [
      ...addressFields(),
      { key: "emergencyPhone", label: "24×7 emergency number", type: "phone" },
      { key: "is24x7", label: "Open 24×7", type: "checkbox" },
      { key: "timings", label: "OPD timings", type: "textarea", required: true, wide: true, placeholder: TIMINGS_PLACEHOLDER },
      text("visitingHours", "Visiting hours", { placeholder: "11 am – 1 pm, 5 pm – 8 pm" }),
    ],
  },
  {
    key: "departments",
    title: "Departments and doctors",
    fields: [
      { key: "departments", label: "Departments", type: "lines", wide: true, placeholder: "One per line\nOrthopaedics – Dr. A Patil, Dr. S Rao\nGeneral Medicine" },
      { key: "doctors", label: "Doctors", type: "lines", wide: true, placeholder: "One per line\nDr. A Patil – MS (Ortho) – Orthopaedic Surgeon" },
    ],
  },
  {
    key: "services",
    title: "Services, facilities and insurance",
    fields: [
      ...servicesFields(),
      { key: "insurance", label: "Insurance / TPA accepted", type: "lines", placeholder: "One per line\nStar Health\nMediAssist" },
      { key: "cashless", label: "Cashless treatment available", type: "checkbox" },
    ],
  },
  {
    key: "registration",
    title: "Registration",
    description: "Hospitals must show their registration or licence number.",
    fields: [
      text("regAuthority", "Registered with", { required: true, placeholder: "Pune Municipal Corporation" }),
      text("regNumber", "Registration / licence number", { required: true }),
    ],
  },
  linksSection,
  preferencesSection("HSP-NAVY", "samplecare"),
];

export const INTAKE_SECTIONS: Record<IntakeKind, SectionDef[]> = { doctor: DOCTOR, clinic: CLINIC, hospital: HOSPITAL };

export const INTAKE_PHOTOS: Record<IntakeKind, PhotoConfig> = {
  doctor: {
    singles: [{ key: "profile", label: "Your photo", help: "A clear, recent photo of you. A plain background looks clean." }],
    galleryMax: LIMITS.galleryMax,
    galleryLabel: "Clinic photos",
    galleryHelp: "Outside, reception, consultation room.",
  },
  clinic: {
    singles: [
      { key: "logo", label: "Clinic logo", help: "If you have one." },
      { key: "cover", label: "Main photo", help: "Shown at the top of your website, e.g. the clinic front." },
    ],
    galleryMax: LIMITS.clinicGalleryMax,
    galleryLabel: "Clinic photos",
    galleryHelp: "Reception, rooms, equipment, outside view.",
  },
  hospital: {
    singles: [
      { key: "logo", label: "Hospital logo", help: "If you have one." },
      { key: "cover", label: "Main photo", help: "Shown at the top of your website, e.g. the building front." },
    ],
    galleryMax: LIMITS.hospitalGalleryMax,
    galleryLabel: "Hospital photos",
    galleryHelp: "Reception, wards, OT, equipment, outside view.",
  },
};

export const INTAKE_KIND_LABEL: Record<IntakeKind, string> = { doctor: "Doctor website", clinic: "Clinic website", hospital: "Hospital website" };

// --- Values -----------------------------------------------------------------

export const isRepeatValue = (v: unknown): v is RepeatItem[] => Array.isArray(v);

function emptyItem(fields: FieldDef[]): RepeatItem {
  return Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : f.key === "city" ? "Pune" : ""]));
}

export function emptyIntakeData(kind: IntakeKind): IntakeData {
  const out: IntakeData = {};
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) out[s.key] = [emptyItem(s.fields)];
    else Object.assign(out, emptyItem(s.fields));
  }
  return out;
}

export const emptyIntakePhotos = (): IntakePhotos => ({ gallery: [], viaWhatsapp: false });

/** Saved data on top of a blank form (new fields added later start empty). */
export function withDefaults(kind: IntakeKind, data: IntakeData | undefined): IntakeData {
  const blank = emptyIntakeData(kind);
  if (!data) return blank;
  const out: IntakeData = { ...blank };
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const items = isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : [];
      out[s.key] = items.length ? items.map((it) => ({ ...emptyItem(s.fields), ...it })) : (blank[s.key] as RepeatItem[]);
    } else {
      for (const f of s.fields) if (data[f.key] !== undefined && !isRepeatValue(data[f.key])) out[f.key] = data[f.key]!;
    }
  }
  return out;
}

const filled = (v: unknown) => (typeof v === "boolean" ? v : typeof v === "string" && v.trim() !== "");

/**
 * Fill-in-the-blanks merge (used when someone starts typing, then finds a
 * saved form for their email): what they just typed wins, saved values fill
 * whatever they left empty. Photos are combined.
 */
export function mergeIntake(kind: IntakeKind, typed: IntakeData, saved: IntakeData): IntakeData {
  const a = withDefaults(kind, typed);
  const b = withDefaults(kind, saved);
  const out: IntakeData = { ...b };
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const ta = (a[s.key] as RepeatItem[]).filter((it) => Object.values(it).some((v) => filled(v) && v !== "Pune"));
      out[s.key] = ta.length ? ta : (b[s.key] as RepeatItem[]);
    } else {
      for (const f of s.fields) if (filled(a[f.key])) out[f.key] = a[f.key]!;
    }
  }
  return out;
}

export function mergePhotos(typed: IntakePhotos, saved: IntakePhotos, galleryMax: number): IntakePhotos {
  const seen = new Set<string>();
  const gallery = [...typed.gallery, ...saved.gallery].filter((p) => !seen.has(p.publicId) && seen.add(p.publicId)).slice(0, galleryMax);
  return {
    profile: typed.profile ?? saved.profile,
    logo: typed.logo ?? saved.logo,
    cover: typed.cover ?? saved.cover,
    gallery,
    viaWhatsapp: typed.viaWhatsapp || saved.viaWhatsapp,
  };
}

/** Lines → trimmed, non-empty items. */
export const splitLines = (v: unknown): string[] =>
  typeof v === "string"
    ? v
        .split(/\r?\n/)
        .map((s) => s.replace(/^[\s•*-]+/, "").trim())
        .filter(Boolean)
    : [];

/** "English, Hindi" → ["English", "Hindi"]. */
export const splitList = (v: unknown): string[] =>
  typeof v === "string"
    ? v
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Name shown in lists and emails: the doctor's or the site's name. */
export function intakeName(kind: IntakeKind, data: IntakeData): string {
  return kind === "doctor" ? str(data.fullName) : str(data.name);
}

export function intakeContactName(kind: IntakeKind, data: IntakeData): string {
  return kind === "doctor" ? str(data.fullName) : str(data.contactName) || str(data.name);
}

// --- Validation -------------------------------------------------------------

const MAX: Record<FieldType, number> = {
  text: 200,
  email: 254,
  mobile: 20,
  phone: 120,
  url: 500,
  textarea: 3000,
  lines: 3000,
  year: 4,
  number: 7,
  pincode: 6,
  select: 40,
  checkbox: 0,
};

/** "instagram.com/drx" → "https://instagram.com/drx". */
export function normalizeUrl(s: string): string {
  const t = s.trim();
  if (!t || /^https?:\/\//i.test(t)) return t;
  return /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t) ? `https://${t}` : t;
}

/** 10-digit Indian mobile from "+91 98765-43210", or the input unchanged. */
export function normalizeMobile(s: string): string {
  const t = s.replace(/[\s()-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");
  return /^\d{10}$/.test(t) ? t : s.trim();
}

function fieldSchema(f: FieldDef) {
  if (f.type === "checkbox") return z.boolean().optional().default(false);
  const max = f.max ?? MAX[f.type];
  const base = z
    .string()
    .max(max + 50) // hard cap before trimming / normalising
    .optional()
    .default("")
    .transform((s) => s.trim());
  const cap = (s: z.ZodType<string, z.ZodTypeDef, unknown>) => s.refine((v) => v.length <= max, `Use at most ${max} characters.`);
  switch (f.type) {
    case "email":
      return cap(base.transform((s) => s.toLowerCase())).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address.");
    case "mobile":
      return cap(base.transform(normalizeMobile)).refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number.");
    case "phone":
      return cap(base).refine((v) => v === "" || /^[+\d][\d\s,/()+-]{5,}$/.test(v), "Enter phone numbers using digits only.");
    case "url":
      return cap(base.transform(normalizeUrl)).refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Enter a full link, e.g. https://…");
    case "year":
      return base.refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1940 && +v <= new Date().getFullYear()), "Enter a year like 2012.");
    case "number":
      return base.transform((s) => s.replace(/[₹,\s]/g, "")).refine((v) => v === "" || /^\d{1,7}$/.test(v), "Enter a number.");
    case "pincode":
      return base.transform((s) => s.replace(/\s/g, "")).refine((v) => v === "" || /^\d{6}$/.test(v), "Enter a 6-digit pincode.");
    case "select":
      return base.refine((v) => v === "" || (f.options ?? []).some((o) => o.value === v), "Choose an option.");
    default:
      return cap(base);
  }
}

const schemaCache = new Map<IntakeKind, z.ZodTypeAny>();

/**
 * Zod schema for a kind's data. Unknown keys are dropped; nothing is required
 * (half-filled forms save fine). See `missingForSubmit` for what sending needs.
 */
export function intakeDataSchema(kind: IntakeKind): z.ZodType<IntakeData, z.ZodTypeDef, unknown> {
  const hit = schemaCache.get(kind);
  if (hit) return hit as z.ZodType<IntakeData, z.ZodTypeDef, unknown>;
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const item = z.object(Object.fromEntries(s.fields.map((f) => [f.key, fieldSchema(f)])));
      shape[s.key] = z.array(item).max(s.repeat.max, `Add at most ${s.repeat.max}.`).optional().default([]);
    } else {
      for (const f of s.fields) shape[f.key] = fieldSchema(f);
    }
  }
  const schema = z.object(shape);
  schemaCache.set(kind, schema);
  return schema as unknown as z.ZodType<IntakeData, z.ZodTypeDef, unknown>;
}

/** Field-error keys: "fullName", or "clinics.0.address" inside a repeat. */
export function intakeFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export interface MissingItem {
  /** Field-error key, also the input's id suffix (see `fieldId`). */
  key: string;
  label: string;
  section: string;
}

/** Required fields that are still empty. An empty list means the form can be sent. */
export function missingForSubmit(kind: IntakeKind, data: IntakeData): MissingItem[] {
  const out: MissingItem[] = [];
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const items = isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : [];
      if (items.length < s.repeat.minToSubmit) out.push({ key: s.key, label: `At least one ${s.repeat.itemLabel.toLowerCase()}`, section: s.title });
      items.forEach((it, i) => {
        for (const f of s.fields) {
          if (f.required && !filled(it[f.key])) {
            out.push({ key: `${s.key}.${i}.${f.key}`, label: items.length > 1 ? `${s.repeat!.itemLabel} ${i + 1}: ${f.label}` : f.label, section: s.title });
          }
        }
      });
    } else {
      for (const f of s.fields) if (f.required && !filled(data[f.key])) out.push({ key: f.key, label: f.label, section: s.title });
    }
  }
  return out;
}

/** How many required fields are filled, for the progress bar. */
export function requiredProgress(kind: IntakeKind, data: IntakeData): { done: number; total: number } {
  let total = 0;
  for (const s of INTAKE_SECTIONS[kind]) {
    const req = s.fields.filter((f) => f.required).length;
    if (s.repeat) {
      const n = Math.max(s.repeat.minToSubmit, isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]).length : 0);
      total += req * n;
    } else total += req;
  }
  const missing = missingForSubmit(kind, data).length;
  return { done: Math.max(0, total - missing), total };
}

/** DOM id for a field (`fieldId("clinics.0.address")`), used by "what's missing" links. */
export const fieldId = (key: string) => `intake-${key.replace(/\./g, "-")}`;

/** Photos the applicant may attach (the server also checks they are ours). */
export const intakePhotoSchema = z.object({
  publicId: z.string().trim().min(1).max(300),
  url: z.string().trim().max(500).url(),
  caption: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || undefined),
});

export function intakePhotosSchema(kind: IntakeKind) {
  const cfg = INTAKE_PHOTOS[kind];
  return z.object({
    profile: intakePhotoSchema.optional(),
    logo: intakePhotoSchema.optional(),
    cover: intakePhotoSchema.optional(),
    gallery: z.array(intakePhotoSchema).max(cfg.galleryMax, `Add at most ${cfg.galleryMax} photos.`).default([]),
    viaWhatsapp: z.boolean().default(false),
  });
}

/** Every uploaded photo in a form. */
export function allPhotos(p: IntakePhotos): IntakePhoto[] {
  return [p.profile, p.logo, p.cover, ...p.gallery].filter((x): x is IntakePhoto => Boolean(x));
}

/** Pre-filled WhatsApp message for sending photos (or asking a question about a form). */
export function photosWhatsappText(ref: string | undefined, email: string, name: string): string {
  return [`Hi, I'm sending photos for my MediReach website form.`, name && `Name: ${name}`, ref && `Form ref: ${ref}`, email && `Email: ${email}`].filter(Boolean).join("\n");
}
