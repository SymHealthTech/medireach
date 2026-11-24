import { z } from "zod";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import { LIMITS, type IntakeKind } from "@/lib/constants";
import { SEED_CLINIC_CATEGORIES } from "@/data/masters";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import type { SuggestKey } from "@/lib/suggestions";
import type { RowsKind } from "./rows";
import { DEFAULT_HOSPITAL_THEME, SPECIALTY_THEMES, type ThemeIconKey } from "@/themes/specialty";

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
  | "checkbox"
  /** Long free text (a blog-style story) with a paste button. */
  | "story"
  /** A pin on the map, stored as "lat,lng". */
  | "location"
  /** Website design picker (doctor portfolio designs, or clinic/hospital specialty designs). */
  | "design"
  /** Visiting card style picker (code names like DOC-AMBER). */
  | "card"
  /** One of a few options, shown as large radio cards. */
  | "choice"
  /** A list of doctors (name, designation, education, role, portfolio link, photo). `max` = how many. */
  | "doctors"
  /** Weekly timings picked day by day (presets, copy Monday), stored as text like "Mon–Sat: 10 am – 1 pm". */
  | "timings"
  /** Tick doctors from the form's own doctor list (a hospital department's doctors), stored one name per line. */
  | "doctorPick";

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
  /** Only shown (and only required) when another field has this value. */
  showIf?: { key: string; equals: string };
  /** A required field that is not needed while this checkbox is ticked (OPD timings when open 24×7). */
  optionalIf?: string;
  /**
   * Select options that come from a live master list (the page passes them
   * through the form context; `options` is the built-in fallback). Saved
   * values outside `options` are kept when they look like a list slug.
   */
  optionsFrom?: "siteTypes";
  /** Number fields: the largest value accepted. */
  maxValue?: number;
  /** Another label and help while this checkbox is ticked (OPD hours when open 24×7). */
  whenChecked?: { key: string; label: string; help: string };
  /** Step-by-step instructions, shown under the field on request. */
  steps?: readonly string[];
  /** Design pickers: which kind of site the choices are for. */
  kind?: IntakeKind;
  /**
   * One-tap suggestions (see lib/suggestions). "lines" fields add a line,
   * comma lists ("languages") add an item, other text fields take the value.
   */
  suggest?: SuggestKey;
  /** "lines" fields shown as rows of boxes like the admin editor (still stored one line per row). */
  rows?: RowsKind;
}

export interface SectionDef {
  key: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  /** A repeating group (a doctor's clinics), stored as an array of objects under `key`. */
  repeat?: { max: number; itemLabel: string; addLabel: string; minToSubmit: number };
}

export interface DoctorEntry {
  name: string;
  designation: string;
  education: string;
  role: string;
  /** The role in their own words, when `role` is "other". */
  roleOther?: string;
  portfolioUrl: string;
  photo?: { publicId: string; url: string };
}

export type FieldValue = string | boolean | DoctorEntry[];
export type RepeatItem = Record<string, FieldValue>;
export type IntakeData = Record<string, FieldValue | RepeatItem[]>;

export interface IntakePhoto {
  publicId: string;
  url: string;
  caption?: string;
}
export type SinglePhotoKey = "profile" | "logo" | "cover" | "beyond";
export interface IntakePhotos {
  profile?: IntakePhoto;
  logo?: IntakePhoto;
  cover?: IntakePhoto;
  /** Doctors: the photo for their "Beyond medicine" story (uploaded in that section). */
  beyond?: IntakePhoto;
  /** Doctors: one photo per award, captioned with the award's title (uploaded in the awards list). */
  awards?: IntakePhoto[];
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
  { value: "allopathy", label: "Allopathy" },
  { value: "dental", label: "Dental" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "homeopathy", label: "Homeopathy" },
  { value: "unani", label: "Unani" },
  { value: "siddha", label: "Siddha" },
  { value: "other", label: "Other" },
] as const;

/** How to copy a Google Maps link on a phone. */
export const MAPS_LINK_STEPS = [
  "Open the Google Maps app and search for your clinic. If it is not listed, press and hold on the exact spot to drop a pin.",
  "Tap Share (for a dropped pin, first tap the address card at the bottom).",
  "Tap Copy link.",
  "Come back here, press and hold in this box and tap Paste.",
] as const;

const locationFields = (what: string): FieldDef[] => [
  {
    key: "location",
    label: "Location on map",
    type: "location",
    wide: true,
    help: `Tap “Pick on map” and place the pin on your ${what}. At the ${what} right now? Use your current location.`,
  },
  { key: "mapsUrl", label: "Or paste a Google Maps link", type: "url", wide: true, help: "Not needed if you pinned it on the map.", steps: MAPS_LINK_STEPS },
];

/**
 * City and area dropdowns (the master lists, with Other → type it) and two
 * address lines, laid out like the admin editors' address.
 */
const placeFields = (required: boolean, line1Placeholder = "Shop 4, Shanti Complex, Karve Road"): FieldDef[] => [
  text("city", "City", { required, suggest: "city", help: "Not in the list? Choose “Other” and type it." }),
  text("area", "Area", { required, suggest: "area", help: "Not in the list? Choose “Other” and type it." }),
  text("address", "Address line 1", { required, placeholder: line1Placeholder, autoComplete: "address-line1" }),
  text("address2", "Address line 2", { placeholder: "Floor, wing or road (optional)", autoComplete: "address-line2" }),
];

/** GP or consultant, like the admin editor's "Practitioner type". */
export const PRACTITIONER_OPTIONS = [
  { value: "gp", label: "General practitioner (GP)" },
  { value: "consultant", label: "Consultant / specialist" },
] as const;

/** Consultation fee, and whether the website shows it (like the admin editor). */
const feeFields = (): FieldDef[] => [
  { key: "fee", label: "Consultation fee (₹)", type: "number", help: "Optional." },
  { key: "showFee", label: "Show the fee on my website", type: "checkbox" },
];

const TIMINGS_PLACEHOLDER = "Mon–Sat: 10 am – 1 pm, 6 pm – 9 pm\nSunday: closed";
const timingsField = (label = "Timings"): FieldDef => ({
  key: "timings",
  label,
  type: "timings",
  required: true,
  wide: true,
  placeholder: TIMINGS_PLACEHOLDER,
  help: "Tap a common pattern, then adjust any day. Or type them in your own words.",
});

/** Roles for a doctor at a clinic or hospital (the label is what the site shows). */
export const DOCTOR_ROLES = [
  { value: "founder", label: "Founder / Owner" },
  { value: "director", label: "Medical director" },
  { value: "hod", label: "Head of department" },
  { value: "senior_consultant", label: "Senior consultant" },
  { value: "consultant", label: "Consultant" },
  { value: "visiting", label: "Visiting consultant" },
  { value: "on_call", label: "On-call consultant" },
  { value: "associate", label: "Associate doctor" },
  { value: "resident", label: "Resident medical officer" },
  { value: "other", label: "Other" },
] as const;

/** The text fields of one doctor entry (the photo is separate). */
export const DOCTOR_FIELDS: FieldDef[] = [
  text("name", "Doctor's name", { required: true, placeholder: "Dr. Neha Joshi" }),
  text("designation", "Designation / specialty", { placeholder: "Consultant Dermatologist", suggest: "designation" }),
  // Role and "Please specify" share a row.
  { key: "role", label: "Role", type: "select", options: DOCTOR_ROLES },
  text("roleOther", "Please specify the role", { required: true, placeholder: "e.g. Anaesthetist, Dietitian", showIf: { key: "role", equals: "other" } }),
  // One row per degree; stored (and shown on the site) as one line, e.g. "MBBS, MD (Dermatology)".
  text("education", "Education", { rows: "degrees", wide: true, max: 160, help: "Add each degree. Pick Other if one is not listed." }),
  { key: "portfolioUrl", label: "Portfolio / profile link", type: "url", wide: true, help: "Optional. Their own website, MediReach page or Practo profile." },
];

export const blankDoctor = (): DoctorEntry => ({ name: "", designation: "", education: "", role: "", roleOther: "", portfolioUrl: "" });

export const doctorHasContent = (e: Partial<DoctorEntry>) => Boolean(e.photo) || DOCTOR_FIELDS.some((f) => str((e as Record<string, unknown>)[f.key]) !== "");

/** The role as the site shows it: the chosen label, or what they typed for "Other". */
export const doctorRoleLabel = (e: Partial<DoctorEntry>) => (e.role === "other" ? str(e.roleOther) : (DOCTOR_ROLES.find((r) => r.value === e.role)?.label ?? ""));

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

/** "Not decided yet" for the pickers. */
export const NOT_SURE = "";

/** Website design choices per kind. Doctors: portfolio designs (unbuilt ones show as coming soon). Clinics/hospitals: specialty designs, own kind first. */
export const DESIGN_OPTIONS: Record<IntakeKind, readonly { value: string; label: string; ready: boolean; sampleHref: string }[]> = {
  doctor: SAMPLE_DESIGNS.map((d) => ({ value: d.key, label: d.name, ready: d.ready, sampleHref: `/sample/gp?design=${d.key}` })),
  clinic: [...SPECIALTY_THEMES].sort((a, b) => Number(b.kind === "clinic") - Number(a.kind === "clinic")).map((t) => ({ value: t.key, label: t.name, ready: true, sampleHref: `/designs/${t.key}` })),
  hospital: [...SPECIALTY_THEMES].sort((a, b) => Number(b.kind === "hospital") - Number(a.kind === "hospital")).map((t) => ({ value: t.key, label: t.name, ready: true, sampleHref: `/designs/${t.key}` })),
};

export const DESIGN_DECISIONS = [
  { value: "final", label: "Final", description: "Go ahead with the designs I picked." },
  { value: "discuss", label: "Not final yet", description: "Talk to me first. I'd like to discuss the design before you finalise it." },
] as const;

const designSection = (kind: IntakeKind): SectionDef => ({
  key: "design",
  title: "Website and visiting card design",
  description: "Pick what you like. Not sure? Choose “Not decided” and we'll help you choose.",
  fields: [
    {
      key: "websiteDesign",
      label: "Website design",
      type: "design",
      kind,
      wide: true,
      options: DESIGN_OPTIONS[kind].filter((d) => d.ready).map((d) => ({ value: d.value, label: d.label })),
    },
    {
      key: "cardStyle",
      label: "Visiting card",
      type: "card",
      kind,
      wide: true,
      options: CARD_STYLES_BY_GROUP[kind].map((c) => ({ value: c.code, label: c.name })),
    },
    { key: "designDecision", label: "Is this your final choice?", type: "choice", required: true, wide: true, options: DESIGN_DECISIONS },
  ],
});

/** Shown after the photos, just before sending. */
export const LATE_SECTIONS = ["design", "preferences"] as const;

const preferencesSection = (namePlaceholder: string): SectionDef => ({
  key: "preferences",
  title: "Anything else",
  fields: [
    text("websiteName", "Website name you would like", { placeholder: namePlaceholder, help: "Your website address will be <name>.medireach.co.in. We check it is free." }),
    { key: "notes", label: "Notes for our team", type: "textarea", wide: true, placeholder: "Anything you want on the website, or things we should know." },
  ],
});

const contactPersonSection: SectionDef = {
  key: "contact",
  title: "Contact person",
  description: "Who we should call if something is missing.",
  fields: [
    text("contactName", "Your name", { required: true, autoComplete: "name" }),
    text("contactRole", "Your role", { placeholder: "Owner, doctor, manager", suggest: "contactRole" }),
    { key: "mobile", label: "Mobile number", type: "mobile", required: true, autoComplete: "tel" },
    { key: "whatsapp", label: "WhatsApp number", type: "mobile", help: "Leave empty if it is the same as the mobile number." },
  ],
};

const servicesFields = (): FieldDef[] => [
  {
    key: "services",
    label: "Services / treatments",
    type: "lines",
    rows: "services",
    wide: true,
    suggest: "services",
    help: "Tap the suggestions to add them, or type your own. A short description is optional.",
  },
  { key: "facilities", label: "Facilities", type: "lines", rows: "facilities", wide: true, suggest: "facilities", help: "Factual list: lab, pharmacy, X-ray, parking, lift, wheelchair access…" },
  { key: "equipment", label: "Equipment", type: "lines", rows: "equipment", wide: true, suggest: "equipment", help: "What you have, never how it compares." },
];

const insuranceFields = (): FieldDef[] => [
  { key: "insurance", label: "Insurance / TPA accepted", type: "lines", wide: true, placeholder: "One per line\nStar Health\nMediAssist", suggest: "insurance" },
  { key: "cashless", label: "Cashless treatment available", type: "checkbox" },
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
      { key: "publicEmail", label: "Email for patients", type: "email", wide: true, help: "Optional. Shown on your website. Your login email above is never shown." },
      { key: "gender", label: "Gender", type: "select", options: GENDERS },
      { key: "practitionerType", label: "You practise as", type: "select", options: PRACTITIONER_OPTIONS },
      text("specialty", "Specialty", { required: true, suggest: "specialty", help: "Not in the list? Choose “Other” and type it." }),
      text("otherSpecialties", "Other specialties (optional)", { wide: true, placeholder: "Diabetology, Critical care", suggest: "otherSpecialties", help: "Any other specialties you practise. Tap to add, or type them separated by commas." }),
      { key: "systemOfMedicine", label: "System of medicine", type: "select", options: SYSTEMS },
      text("systemOther", "Please specify", { required: true, placeholder: "e.g. Naturopathy, Yoga, Sowa-Rigpa", showIf: { key: "systemOfMedicine", equals: "other" } }),
      {
        key: "qualifications",
        label: "Qualifications",
        type: "lines",
        rows: "qualifications",
        required: true,
        wide: true,
        help: "Degrees in the order you want them shown. Degree not in the list? Choose “Other” and type it.",
      },
      { key: "practiceSince", label: "Practising since (year)", type: "year", placeholder: "2012" },
      text("languages", "Languages you speak", { placeholder: "English, Hindi, Marathi", suggest: "languages" }),
    ],
  },
  {
    key: "registration",
    title: "Registration",
    description: "The NMC guidelines ask for your registration number on your website.",
    fields: [
      text("council", "Medical council / board", { suggest: "council", help: "Not in the list? Choose “Other” and type it." }),
      text("registrationNumber", "Registration number", { required: true }),
      { key: "registrationYear", label: "Registration year", type: "year" },
      text("nmrId", "NMR ID (optional)", { help: "National Medical Register ID, if you have one." }),
    ],
  },
  {
    key: "clinics",
    title: "Your clinics and timings",
    description: "Your main clinics where patients meet you (up to 2). Hospitals you visit as a consultant go in the next section.",
    repeat: { max: 2, itemLabel: "Clinic", addLabel: "Add a second clinic", minToSubmit: 1 },
    fields: [
      text("name", "Clinic or hospital name", { required: true }),
      { key: "phone", label: "Clinic phone", type: "phone" },
      ...placeFields(true),
      { key: "pincode", label: "Pincode", type: "pincode" },
      ...locationFields("clinic"),
      timingsField(),
      ...feeFields(),
      text("appointmentNote", "Appointment note", { placeholder: "Appointments preferred. Walk-ins welcome.", suggest: "appointmentNote" }),
    ],
  },
  {
    key: "visiting",
    title: "Visiting consultant at",
    description: "Optional. Hospitals where you consult on fixed days or on call. Your website shows them as “Visiting consultant at …”.",
    repeat: { max: 4, itemLabel: "Hospital", addLabel: "Add another hospital", minToSubmit: 0 },
    fields: [
      text("name", "Hospital name", { required: true, placeholder: "Ruby Hall Clinic" }),
      { key: "phone", label: "Hospital phone", type: "phone" },
      ...placeFields(false, "40 Sassoon Road"),
      { key: "pincode", label: "Pincode", type: "pincode" },
      { ...timingsField("Days and timings you visit"), required: false, help: "Optional. Tap a common pattern, or type them, e.g. “Tuesday and Friday: 4 pm – 6 pm” or “On call”." },
      ...feeFields(),
      text("appointmentNote", "Appointment note", { placeholder: "Appointments through the hospital desk", suggest: "appointmentNote" }),
    ],
  },
  {
    key: "practice",
    title: "Your practice",
    description: "Facts only: the NMC guidelines don't allow patient reviews, testimonials or claims like “best”.",
    fields: [
      { key: "shortBio", label: "Short introduction (1–2 lines)", type: "textarea", max: LIMITS.shortBio, wide: true },
      { key: "aboutMe", label: "About you", type: "textarea", wide: true, placeholder: "Your experience, training and how you work with patients." },
      {
        key: "services",
        label: "Services you offer",
        type: "lines",
        rows: "services",
        wide: true,
        suggest: "doctorServices",
        help: "Suggestions follow your specialty. Tap to add, or type your own.",
      },
      { key: "conditions", label: "Conditions you treat", type: "lines", wide: true, placeholder: "One per line\nThyroid disorders\nFever and infections", suggest: "conditions" },
      { key: "awards", label: "Awards", type: "lines", rows: "awards", wide: true },
      { key: "memberships", label: "Memberships", type: "lines", rows: "memberships", wide: true, suggest: "memberships" },
      { key: "publications", label: "Publications (optional)", type: "lines", rows: "publications", wide: true, help: "Papers, articles or book chapters. Add the link if it is online." },
    ],
  },
  {
    key: "beyond",
    title: "Beyond medicine",
    description: "Optional. Your life outside the clinic: sports, travel, music, social work. It helps patients know you as a person. Add a photo that goes with your story.",
    fields: [
      text("interests", "Hobbies and interests", { wide: true, placeholder: "Running, classical music, trekking", suggest: "interests" }),
      text("beyondTitle", "Title for your story", { wide: true, placeholder: "Running my first full marathon" }),
      {
        key: "beyondStory",
        label: "Your story",
        type: "story",
        wide: true,
        max: LIMITS.storyBody,
        placeholder: "Write a few paragraphs, like a short blog post.",
        help: "Write here, or copy from Word, Google Docs, WhatsApp or a blog and paste it. Formatting is removed; paragraphs are kept.",
      },
    ],
  },
  { ...linksSection, fields: [...linksSection.fields.slice(0, 3), { key: "linkedin", label: "LinkedIn", type: "url" }, ...linksSection.fields.slice(3)] },
  designSection("doctor"),
  preferencesSection("dramit"),
];

// --- Clinic / hospital ------------------------------------------------------

const addressFields = (what: string): FieldDef[] => [
  ...placeFields(true),
  { key: "pincode", label: "Pincode", type: "pincode", required: true },
  text("landmark", "Landmark", { placeholder: "Opposite City Pride" }),
  text("parkingNote", "Parking note", { wide: true, placeholder: "Two-wheeler parking in the basement" }),
  ...locationFields(what),
  { key: "phones", label: "Phone numbers", type: "phone", required: true, help: "Up to 4, separated by commas. The first one is used for the Call button." },
  { key: "siteWhatsapp", label: "WhatsApp number for patients", type: "mobile" },
  { key: "siteEmail", label: "Email for patients", type: "email", wide: true },
];

/** Clinic types = the clinic categories (so the draft gets the right category), plus Other. */
const CLINIC_TYPES = [
  ...SEED_CLINIC_CATEGORIES.filter((c) => c.kind === "clinic").map((c) => ({ value: c.slug, label: c.name })),
  { value: "other", label: "Other" },
] as const;

const HOSPITAL_TYPES = [
  { value: "multispecialty", label: "Multi-speciality", category: "multispecialty-hospital" },
  { value: "general", label: "General hospital", category: "general-hospital" },
  { value: "maternity", label: "Maternity and women's", category: "maternity-hospital" },
  { value: "children", label: "Children's", category: "childrens-hospital" },
  { value: "orthopaedic", label: "Orthopaedic", category: "orthopaedic-hospital" },
  { value: "surgical", label: "Surgical", category: "surgical-hospital" },
  { value: "eye", label: "Eye", category: "eye-hospital" },
  { value: "ent", label: "ENT", category: "ent-hospital" },
  { value: "other", label: "Other", category: "" },
] as const;

/** Website-form hospital type ("maternity") → hospital category slug ("maternity-hospital"), and back. */
export const hospitalCategoryFor = (type: string): string => HOSPITAL_TYPES.find((t) => t.value === type)?.category ?? "";
export const hospitalTypeFor = (categorySlug: string): string => HOSPITAL_TYPES.find((t) => t.category && t.category === categorySlug)?.value ?? "";

const HOSPITAL_TYPE_ICON: Record<string, ThemeIconKey> = {
  maternity: "flower-2",
  children: "baby",
  orthopaedic: "bone",
  surgical: "activity",
  eye: "eye",
  ent: "ear",
};

/** Website designs offered per clinic or hospital type. */
export const DESIGNS_PER_TYPE = 3;

export interface DesignChoice {
  /** Stored as `websiteDesign` (a theme key). Unbuilt slots get a placeholder value and can't be picked. */
  value: string;
  label: string;
  /** Theme name, for built designs. */
  sub?: string;
  ready: boolean;
  sampleHref: string;
}

export interface DesignGroup {
  /** The clinic or hospital type (same values as the "Type of …" field). */
  value: string;
  label: string;
  icon: ThemeIconKey;
  /** Colours for the previews of unbuilt designs. */
  themeKey: string;
  /** Always DESIGNS_PER_TYPE long; designs not built yet are "coming soon". */
  designs: DesignChoice[];
}

const designGroup = (value: string, label: string, icon: ThemeIconKey, built: string[]): DesignGroup => ({
  value,
  label,
  icon,
  themeKey: built[0]!,
  designs: Array.from({ length: DESIGNS_PER_TYPE }, (_, i): DesignChoice => {
    const key = built[i];
    const theme = SPECIALTY_THEMES.find((t) => t.key === key);
    return theme
      ? { value: theme.key, label: `Design ${i + 1}`, sub: theme.name, ready: true, sampleHref: `/designs/${theme.key}` }
      : { value: `${value}:${i + 1}`, label: `Design ${i + 1}`, ready: false, sampleHref: "" };
  }),
});

/**
 * Website design picker for clinics and hospitals: the type first, then its
 * designs. Today each type has one built design (its specialty design); the
 * other slots show "coming soon". To add a design, build the theme and add its
 * key to the type's list here.
 */
export const DESIGN_GROUPS: Record<"clinic" | "hospital", DesignGroup[]> = {
  clinic: SEED_CLINIC_CATEGORIES.filter((c) => c.kind === "clinic").map((c) => designGroup(c.slug, c.name, c.icon, [c.defaultThemeKey])),
  hospital: HOSPITAL_TYPES.filter((t) => t.value !== "other").map((t) => designGroup(t.value, t.label, HOSPITAL_TYPE_ICON[t.value] ?? "hospital", [DEFAULT_HOSPITAL_THEME])),
};

/** The form field holding the clinic or hospital type (the design picker opens on it). */
export const DESIGN_TYPE_FIELD: Record<"clinic" | "hospital", string> = { clinic: "clinicType", hospital: "hospitalType" };

const aboutStory = (what: string): FieldDef => ({
  key: "about",
  label: `About the ${what}`,
  type: "story",
  wide: true,
  max: LIMITS.storyBody,
  placeholder: `How the ${what} started, what you focus on, and how you look after patients.`,
  help: "Write here, or copy from your current website, a brochure, Word or WhatsApp and paste it. Formatting is removed; paragraphs are kept.",
});

const shortDescriptionField = (what: string, placeholder: string): FieldDef => ({
  key: "shortDescription",
  label: "Short description",
  type: "textarea",
  wide: true,
  max: LIMITS.shortBio,
  placeholder,
  help: `One or two lines about the ${what}. Shown in Google results. Facts only.`,
});

const insuranceRegistration = (what: "clinic" | "hospital"): SectionDef => ({
  key: "registration",
  title: "Registration and insurance",
  description: what === "hospital" ? "Hospitals must show their registration or licence number." : "Registration is optional for clinics. Shown in the footer if given.",
  fields: [
    text("regAuthority", "Registered with", { required: what === "hospital", placeholder: "Pune Municipal Corporation", suggest: "regAuthority" }),
    text("regNumber", what === "hospital" ? "Registration / licence number" : "Registration number", { required: what === "hospital" }),
    ...insuranceFields(),
  ],
});

const awardsField = (what: string): FieldDef => ({
  key: "awards",
  label: "Accreditations and awards",
  type: "lines",
  wide: true,
  placeholder: `One per line\nNABH accreditation – 2022\nAward name – Given by – Year`,
  help: `Facts only, e.g. accreditations, certificates and awards the ${what} has received.`,
});

const CLINIC: SectionDef[] = [
  {
    key: "about",
    title: "About the clinic",
    fields: [
      text("name", "Clinic name", { required: true }),
      { key: "clinicType", label: "Type of clinic", type: "select", required: true, options: CLINIC_TYPES, optionsFrom: "siteTypes" },
      text("clinicTypeOther", "Please specify", { required: true, placeholder: "e.g. Sleep clinic, IVF centre", showIf: { key: "clinicType", equals: "other" } }),
      text("tagline", "Tagline (one line)", { wide: true, max: 120, placeholder: "Skin, hair and nail care in Kothrud", help: "Optional. Shown under the clinic name on your website. Facts only, no claims like “best”." }),
      shortDescriptionField("clinic", "A skin and hair clinic in Kothrud, Pune. See timings, services, doctors and directions."),
      aboutStory("clinic"),
      { key: "yearStarted", label: "Year started", type: "year" },
      text("languages", "Languages spoken", { placeholder: "English, Hindi, Marathi", suggest: "languages" }),
    ],
  },
  contactPersonSection,
  { key: "address", title: "Address and contact", fields: addressFields("clinic") },
  {
    key: "timings",
    title: "Timings",
    fields: [
      { key: "is24x7", label: "Open 24×7", type: "checkbox", wide: true, help: "Only if the clinic never closes." },
      { ...timingsField(), optionalIf: "is24x7" },
      text("appointmentNote", "Appointment note", { wide: true, placeholder: "Appointments preferred. Walk-ins welcome.", suggest: "appointmentNote" }),
    ],
  },
  { key: "services", title: "Services, facilities and equipment", fields: [...servicesFields(), awardsField("clinic")] },
  {
    key: "doctors",
    title: "Doctors at the clinic",
    description: `Add each doctor who sees patients here, including visiting consultants (up to ${LIMITS.clinicDoctorsMax}). Each doctor can also get their own portfolio page. Ask us.`,
    fields: [{ key: "doctors", label: "Doctors", type: "doctors", max: LIMITS.clinicDoctorsMax, wide: true }],
  },
  insuranceRegistration("clinic"),
  linksSection,
  designSection("clinic"),
  preferencesSection("shreeskin"),
];

const HOSPITAL: SectionDef[] = [
  {
    key: "about",
    title: "About the hospital",
    fields: [
      text("name", "Hospital name", { required: true }),
      { key: "hospitalType", label: "Type of hospital", type: "select", required: true, options: HOSPITAL_TYPES, optionsFrom: "siteTypes" },
      text("hospitalTypeOther", "Please specify", { required: true, placeholder: "e.g. Cancer care, De-addiction", showIf: { key: "hospitalType", equals: "other" } }),
      text("tagline", "Tagline (one line)", { wide: true, max: 120, placeholder: "A 10-bed multi-speciality hospital in Wakad", help: "Optional. Shown under the hospital name on your website. Facts only, no claims like “best”." }),
      shortDescriptionField("hospital", "A 10-bed multi-speciality hospital in Wakad, Pune. See OPD timings, departments, doctors and directions."),
      aboutStory("hospital"),
      { key: "yearStarted", label: "Year started", type: "year" },
      text("languages", "Languages spoken", { wide: true, placeholder: "English, Hindi, Marathi", suggest: "languages" }),
    ],
  },
  contactPersonSection,
  {
    key: "address",
    title: "Address and contact",
    fields: [...addressFields("hospital"), { key: "emergencyPhone", label: "24×7 emergency number", type: "phone", wide: true, help: "Shown in the sticky 24×7 bar on your website." }],
  },
  {
    key: "timings",
    title: "Timings",
    fields: [
      { key: "is24x7", label: "Open 24×7", type: "checkbox", wide: true },
      {
        ...timingsField("OPD timings"),
        optionalIf: "is24x7",
        whenChecked: {
          key: "is24x7",
          label: "OPD hours (optional)",
          help: "Your website shows “Open 24 hours, all 7 days”. Outpatient (OPD) hours you add here are shown in the appointment note.",
        },
      },
      text("appointmentNote", "Appointment note", { wide: true, placeholder: "Appointments through the hospital desk", suggest: "appointmentNote" }),
    ],
  },
  { key: "services", title: "Services, facilities and equipment", fields: [...servicesFields(), awardsField("hospital")] },
  {
    key: "doctors",
    title: "Doctors at the hospital",
    description: `Add each doctor who sees patients here, including visiting consultants (up to ${LIMITS.hospitalDoctorsMax}). Then tick them under their department below.`,
    fields: [{ key: "doctors", label: "Doctors", type: "doctors", max: LIMITS.hospitalDoctorsMax, wide: true }],
  },
  insuranceRegistration("hospital"),
  {
    key: "beds",
    title: "Beds and visiting hours",
    description: `Number and types, factual. For hospitals up to ${LIMITS.hospitalBedsMax} beds.`,
    fields: [
      { key: "beds", label: "Total beds", type: "number", maxValue: LIMITS.hospitalBedsMax },
      { key: "bedTypes", label: "Bed types", type: "lines", rows: "bedTypes", wide: true, help: "Optional. E.g. General ward 6, ICU 2." },
      text("visitingHours", "Visiting hours for patients' families", { wide: true, placeholder: "11 am – 1 pm, 5 pm – 8 pm", suggest: "visitingHours" }),
    ],
  },
  {
    key: "departments",
    title: "Departments",
    description: "Add each department and tick its doctors from the list above.",
    repeat: { max: LIMITS.hospitalDepartmentsMax, itemLabel: "Department", addLabel: "Add another department", minToSubmit: 0 },
    fields: [
      text("name", "Department name", { required: true, placeholder: "Orthopaedics", suggest: "department" }),
      { key: "description", label: "Description (optional)", type: "textarea", max: 300, placeholder: "Fractures, joint replacement and sports injuries" },
      { key: "doctorNames", label: "Doctors in this department", type: "doctorPick", wide: true },
    ],
  },
  linksSection,
  designSection("hospital"),
  preferencesSection("samplecare"),
];

export const INTAKE_SECTIONS: Record<IntakeKind, SectionDef[]> = { doctor: DOCTOR, clinic: CLINIC, hospital: HOSPITAL };

export const INTAKE_PHOTOS: Record<IntakeKind, PhotoConfig> = {
  doctor: {
    singles: [{ key: "profile", label: "Your photo", help: "A clear, recent photo of you. After choosing it, drag to centre your face and zoom if needed." }],
    galleryMax: LIMITS.galleryMax,
    galleryLabel: "Photos: clinic, achievements and activities (up to 5)",
    galleryHelp:
      "Your clinic, awards and achievements, conferences, and activities outside medicine like trekking, marathons or music. Pick your best 5 and add a caption to say what each photo shows.",
  },
  clinic: {
    singles: [
      { key: "logo", label: "Clinic logo", help: "If you have one. After choosing it, drag and zoom so the whole logo fits the square." },
      { key: "cover", label: "Main photo", help: "Shown at the top of your website. A wide photo of the clinic front or reception works well." },
    ],
    galleryMax: LIMITS.clinicGalleryMax,
    galleryLabel: `Clinic photos (up to ${LIMITS.clinicGalleryMax})`,
    galleryHelp:
      "Outside view, reception, consultation rooms, equipment, your team, certificates and accreditations, health camps and events. Add a caption to say what each photo shows. No patient photos.",
  },
  hospital: {
    singles: [
      { key: "logo", label: "Hospital logo", help: "If you have one. After choosing it, drag and zoom so the whole logo fits the square." },
      { key: "cover", label: "Main photo", help: "Shown at the top of your website. A wide photo of the building front works well." },
    ],
    galleryMax: LIMITS.hospitalGalleryMax,
    galleryLabel: `Hospital photos (up to ${LIMITS.hospitalGalleryMax})`,
    galleryHelp:
      "Building, reception, wards, OT, ICU, equipment, ambulance, your team, certificates and accreditations, health camps and events. Add a caption to say what each photo shows. No patient photos.",
  },
};

export const INTAKE_KIND_LABEL: Record<IntakeKind, string> = { doctor: "Doctor website", clinic: "Clinic website", hospital: "Hospital website" };

// --- Values -----------------------------------------------------------------

export const isRepeatValue = (v: unknown): v is RepeatItem[] => Array.isArray(v);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function emptyValue(f: FieldDef): FieldValue {
  return f.type === "checkbox" ? false : f.type === "doctors" ? [blankDoctor()] : f.key === "city" ? "Pune" : "";
}

/** A blank repeat item (a new clinic or department). */
export function emptyItem(fields: FieldDef[]): RepeatItem {
  return Object.fromEntries(fields.map((f) => [f.key, emptyValue(f)]));
}

/** A saved doctor list (or an older one-per-line text) as clean entries, at least one. */
function toDoctors(v: unknown): DoctorEntry[] {
  const list: DoctorEntry[] = Array.isArray(v)
    ? v.filter(isObj).map((e) => ({
        ...blankDoctor(),
        ...Object.fromEntries(DOCTOR_FIELDS.map((f) => [f.key, typeof e[f.key] === "string" ? (e[f.key] as string) : ""])),
        ...(isObj(e.photo) && typeof e.photo.publicId === "string" && typeof e.photo.url === "string" ? { photo: { publicId: e.photo.publicId, url: e.photo.url } } : {}),
      }))
    : splitLines(v).map((l) => doctorFromLine(l));
  return list.length ? list : [blankDoctor()];
}

function toItem(fields: FieldDef[], raw: Record<string, unknown>): RepeatItem {
  const out = emptyItem(fields);
  for (const f of fields) {
    const v = raw[f.key];
    if (f.type === "doctors") out[f.key] = toDoctors(v);
    else if (typeof v === "string" || typeof v === "boolean") out[f.key] = v;
  }
  return out;
}

/** "Dr. Neha Joshi – MBBS, MD – Dermatologist" → name, qualifications, specialty. */
export function parseDoctorLine(line: string): { name: string; qualifications?: string; specialty?: string } {
  const [name = "", qualifications, ...rest] = line.split(/\s+[–—-]\s+|\s*\|\s*/).map((s) => s.trim());
  return { name: name.slice(0, 120), ...(qualifications ? { qualifications: qualifications.slice(0, 200) } : {}), ...(rest.length ? { specialty: rest.join(" – ").slice(0, 120) } : {}) };
}

function doctorFromLine(line: string, role = ""): DoctorEntry {
  const p = parseDoctorLine(line);
  return { ...blankDoctor(), name: p.name, education: p.qualifications ?? "", designation: p.specialty ?? "", role };
}

/**
 * Older forms kept doctors as one-per-line text (clinic: doctors + visiting
 * consultants; hospital: departments, full-time doctors, visiting
 * consultants). Turn them into doctor entries so nothing typed is lost.
 */
function upgradeLegacy(kind: IntakeKind, data: Record<string, unknown>): Record<string, unknown> {
  const visiting = splitLines(data.visitingDoctors).map((l) => doctorFromLine(l, "visiting"));
  const d = { ...data };
  if (kind === "doctor" && typeof data.visitingAt === "string") {
    // Older forms: one hospital name per line. Added after any hospital already typed in the new boxes.
    const typed = (Array.isArray(data.visiting) ? data.visiting : []).filter((it) => isObj(it) && str(it.name));
    const names = splitLines(data.visitingAt).filter((n) => !typed.some((it) => str((it as Record<string, unknown>).name).toLowerCase() === n.toLowerCase()));
    if (names.length || typed.length) d.visiting = [...typed, ...names.map((name) => ({ name }))];
    delete d.visitingAt;
  }
  delete d.visitingDoctors;
  if (kind === "clinic" && (typeof data.doctors === "string" || visiting.length)) {
    d.doctors = [...(typeof data.doctors === "string" ? splitLines(data.doctors).map((l) => doctorFromLine(l)) : Array.isArray(data.doctors) ? data.doctors : []), ...visiting];
  }
  if (kind === "hospital" && (typeof data.departments === "string" || typeof data.doctors === "string" || visiting.length)) {
    const deps: Record<string, unknown>[] = Array.isArray(data.departments)
      ? [...data.departments]
      : splitLines(data.departments).map((l) => {
          const [name = "", ...rest] = l.split(/\s+[–—-]\s+/);
          return { name, doctors: splitList(rest.join(" – ")).map((n) => ({ ...blankDoctor(), name: n })) };
        });
    const loose = [...splitLines(data.doctors).map((l) => doctorFromLine(l)), ...visiting];
    // Doctors without a department: one unnamed department, so the applicant is asked to name it.
    if (loose.length) deps.push({ name: "", doctors: loose });
    d.departments = deps;
    if (typeof data.doctors === "string") delete d.doctors;
  }
  if (kind === "hospital") Object.assign(d, hospitalDoctorsUpgrade(d));
  return d;
}

/**
 * Hospital forms before 2026-11-24 kept each department's doctors inside the
 * department. Now (like the admin editor) the hospital has one doctor list and
 * each department ticks its doctors by name. Moves them over, each doctor once.
 */
function hospitalDoctorsUpgrade(d: Record<string, unknown>): Record<string, unknown> {
  const deps = Array.isArray(d.departments) ? d.departments : [];
  if (!deps.some((dep) => isObj(dep) && Array.isArray(dep.doctors))) return {};
  const doctors: Record<string, unknown>[] = (Array.isArray(d.doctors) ? d.doctors : []).filter(isObj);
  const named = (e: Record<string, unknown>) => str(e.name).toLowerCase();
  const departments = deps.map((dep) => {
    if (!isObj(dep) || !Array.isArray(dep.doctors)) return dep;
    const { doctors: list, ...rest } = dep;
    const names: string[] = splitLines(rest.doctorNames);
    for (const e of (list as unknown[]).filter(isObj)) {
      if (!doctorHasContent(e)) continue;
      const same = named(e) ? doctors.find((x) => named(x) === named(e)) : undefined;
      if (!same) doctors.push(e);
      if (str(e.name) && !names.some((n) => n.toLowerCase() === named(e))) names.push(str(e.name));
    }
    return { ...rest, doctorNames: names.join("\n") };
  });
  // Drop the blank card a new form starts with, now that real doctors are listed.
  const real = doctors.filter((e) => doctorHasContent(e));
  return { departments, doctors: real.length ? real : doctors };
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

/** Saved data on top of a blank form (new fields added later start empty; older answers are upgraded). */
export function withDefaults(kind: IntakeKind, data: IntakeData | undefined): IntakeData {
  if (!data) return emptyIntakeData(kind);
  const src = upgradeLegacy(kind, data);
  const out: IntakeData = {};
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const items = Array.isArray(src[s.key]) ? (src[s.key] as unknown[]).filter(isObj).map((it) => toItem(s.fields, it)) : [];
      out[s.key] = items.length ? items : [emptyItem(s.fields)];
    } else Object.assign(out, toItem(s.fields, src));
  }
  return out;
}

const filled = (v: unknown): boolean =>
  typeof v === "boolean" ? v : typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.some((e) => isObj(e) && doctorHasContent(e)) : false;

/** Anything typed in a repeat item (the default city doesn't count). */
const itemHasContent = (it: RepeatItem) => Object.entries(it).some(([k, v]) => filled(v) && !(k === "city" && v === "Pune"));

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
      const ta = (a[s.key] as RepeatItem[]).filter(itemHasContent);
      out[s.key] = ta.length ? ta : (b[s.key] as RepeatItem[]);
    } else {
      for (const f of s.fields) if (filled(a[f.key])) out[f.key] = a[f.key]!;
    }
  }
  return out;
}

/** The hospital departments that tick this doctor (by name), comma-separated. */
function departmentsOf(data: IntakeData, name: string): string {
  const n = name.trim().toLowerCase();
  if (!n || !isRepeatValue(data.departments)) return "";
  return (data.departments as RepeatItem[])
    .filter((dep) => str(dep.name) && splitLines(dep.doctorNames).some((x) => x.toLowerCase() === n))
    .map((dep) => str(dep.name))
    .join(", ");
}

/** Every doctor entry in a form (clinic or hospital doctors), with the hospital departments that list them. */
export function doctorEntries(kind: IntakeKind, input: IntakeData): { doctor: DoctorEntry; department?: string; key: string }[] {
  // Saved hospital forms from before the shared doctor list still count their department doctors.
  const data = kind === "hospital" ? ({ ...input, ...hospitalDoctorsUpgrade(input) } as IntakeData) : input;
  const out: { doctor: DoctorEntry; department?: string; key: string }[] = [];
  const dept = (doctor: DoctorEntry, own?: string) => {
    const d = own ?? (kind === "hospital" ? departmentsOf(data, str(doctor.name)) : "");
    return d ? { department: d } : {};
  };
  for (const s of INTAKE_SECTIONS[kind]) {
    const groups: { values: Record<string, unknown>; prefix: string }[] = s.repeat
      ? (isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : []).map((it, i) => ({ values: it, prefix: `${s.key}.${i}.` }))
      : [{ values: data, prefix: "" }];
    for (const g of groups) {
      for (const f of s.fields) {
        if (f.type !== "doctors" || !Array.isArray(g.values[f.key])) continue;
        (g.values[f.key] as DoctorEntry[]).forEach((doctor, j) => {
          if (isObj(doctor) && doctorHasContent(doctor)) out.push({ doctor, key: `${g.prefix}${f.key}.${j}`, ...dept(doctor, s.repeat ? str(g.values.name) : undefined) });
        });
      }
    }
  }
  return out;
}

/** Award photos (one per award title): typed ones win. */
const mergeAwardPhotos = (typed: IntakePhoto[], saved: IntakePhoto[]) => [...typed, ...saved.filter((s) => !typed.some((t) => (t.caption ?? "").toLowerCase() === (s.caption ?? "").toLowerCase()))].slice(0, AWARD_PHOTOS_MAX);

/** Award photos a doctor can add (one per award; the site counts them in its 5 photos). */
export const AWARD_PHOTOS_MAX = 15;

export function mergePhotos(typed: IntakePhotos, saved: IntakePhotos, galleryMax: number): IntakePhotos {
  const seen = new Set<string>();
  const gallery = [...typed.gallery, ...saved.gallery].filter((p) => !seen.has(p.publicId) && seen.add(p.publicId)).slice(0, galleryMax);
  return {
    profile: typed.profile ?? saved.profile,
    logo: typed.logo ?? saved.logo,
    cover: typed.cover ?? saved.cover,
    beyond: typed.beyond ?? saved.beyond,
    ...(typed.awards?.length || saved.awards?.length ? { awards: mergeAwardPhotos(typed.awards ?? [], saved.awards ?? []) } : {}),
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
  story: LIMITS.storyBody,
  location: 40,
  design: 40,
  card: 40,
  choice: 40,
  doctors: 0,
  doctorPick: 3000,
  timings: 3000,
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

/**
 * Text pasted from Word, Google Docs, WhatsApp or a web page: Windows line
 * ends, invisible characters, trailing spaces and runs of blank lines are
 * cleaned; paragraphs (blank lines) stay.
 */
export function cleanPastedText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "18.5074,73.8077" → { lat, lng }, or null. */
export function parseLocation(v: unknown): { lat: number; lng: number } | null {
  const m = typeof v === "string" ? v.trim().match(/^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/) : null;
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** Pull lat/lng out of a pasted Google Maps link ("…@18.50,73.80,17z" or "?q=18.5,73.8"). */
export function coordsFromMapsUrl(url: string): { lat: string; lng: string } | null {
  const m = /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/.exec(url) ?? /[?&](?:q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(url);
  return m ? { lat: m[1]!, lng: m[2]! } : null;
}

/** Google Maps link for a pinned location. */
export const mapsLinkFor = (loc: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;

/** Is this field needed to send the form, given the other answers? */
export const isRequired = (f: FieldDef, values: Record<string, unknown>) => Boolean(f.required) && isShown(f, values) && !(f.optionalIf && values[f.optionalIf] === true);

/** Is this field shown, given the other answers (in the same repeat item, or the form)? */
export const isShown = (f: FieldDef, values: Record<string, unknown>) => !f.showIf || values[f.showIf.key] === f.showIf.equals;

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  if (f.type === "checkbox") return z.boolean().optional().default(false);
  if (f.type === "doctors") {
    const entry = z
      .object({
        ...Object.fromEntries(DOCTOR_FIELDS.map((d) => [d.key, fieldSchema(d)])),
        photo: intakePhotoSchema.optional(),
      })
      // "Please specify" only counts with the "Other" role.
      .transform(({ photo, ...rest }) => ({ ...rest, ...((rest as { role?: unknown }).role === "other" ? {} : { roleOther: "" }), ...(photo ? { photo: { publicId: photo.publicId, url: photo.url } } : {}) }));
    // Empty entries (an "Add another doctor" left blank) are dropped.
    return z
      .array(entry)
      .max(f.max ?? 20, `Add at most ${f.max ?? 20} doctors.`)
      .optional()
      .default([])
      .transform((list) => list.filter((e) => doctorHasContent(e as Partial<DoctorEntry>)));
  }
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
      return base
        .transform((s) => s.replace(/[₹,\s]/g, ""))
        .refine((v) => v === "" || /^\d{1,7}$/.test(v), "Enter a number.")
        .refine((v) => v === "" || f.maxValue === undefined || Number(v) <= f.maxValue, f.key === "beds" ? BEDS_MESSAGE : `Enter at most ${f.maxValue}.`);
    case "pincode":
      return base.transform((s) => s.replace(/\s/g, "")).refine((v) => v === "" || /^\d{6}$/.test(v), "Enter a 6-digit pincode.");
    case "story":
      return base.transform(cleanPastedText).refine((v) => v.length <= max, `Use at most ${max} characters.`);
    case "location":
      return base.refine((v) => v === "" || parseLocation(v) !== null, "Pick the location again.");
    case "design":
    case "card":
    case "select":
      // Unknown or retired codes (e.g. typed by hand in older forms) become "not decided" instead of blocking the save.
      return base.transform(
        (v) =>
          (f.options ?? []).find((o) => o.value.toLowerCase() === v.toLowerCase() || o.label.toLowerCase() === v.toLowerCase())?.value ??
          // A type added to the live list after this code was built (matched to the category on import).
          (f.optionsFrom && /^[a-z0-9][a-z0-9-]{0,79}$/.test(v) ? v : ""),
      );
    case "choice":
      return base.refine((v) => v === "" || (f.options ?? []).some((o) => o.value === v), "Choose an option.");
    default:
      return cap(base);
  }
}

const BEDS_MESSAGE = `This plan covers hospitals up to ${LIMITS.hospitalBedsMax} beds.`;

/** Beds in one bed-type row ("ICU – 2", "ICU 2", "Private room: 3 beds"). */
export const bedTypeCount = (line: string): number => Number(line.match(/(\d{1,3})\s*(?:beds?)?\s*$/i)?.[1] ?? 0);

/** Bed types may not add up to more beds than the plan covers (like the admin editor). */
function checkBedTypes(d: Record<string, unknown>, ctx: z.RefinementCtx) {
  const sum = splitLines(d.bedTypes).reduce((n, l) => n + bedTypeCount(l), 0);
  if (sum > LIMITS.hospitalBedsMax) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedTypes"], message: `The bed types add up to ${sum}. ${BEDS_MESSAGE}` });
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
  // Older answers (doctors as text lines) are upgraded first, so a page opened before a change still saves.
  const object = kind === "hospital" ? z.object(shape).superRefine(checkBedTypes) : z.object(shape);
  const schema = z.preprocess((v) => (isObj(v) ? upgradeLegacy(kind, v) : v), object);
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

/** Repeat items that count: the first `minToSubmit`, and any other with something typed in it. */
function activeItems(s: SectionDef, data: IntakeData): { it: RepeatItem; i: number }[] {
  const items = isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : [];
  return items.map((it, i) => ({ it, i })).filter(({ it, i }) => i < s.repeat!.minToSubmit || itemHasContent(it));
}

/** Required doctor fields shown for this entry (the name; the role in words when it is "Other"). */
const requiredDoctorFields = (e: Record<string, unknown>) => DOCTOR_FIELDS.filter((d) => d.required && isShown(d, e));

/** Doctor entries with something typed in them need a name (and "Please specify" for an "Other" role). */
function missingDoctorFields(f: FieldDef, values: Record<string, unknown>, prefix: string, section: string, out: MissingItem[]) {
  const list = Array.isArray(values[f.key]) ? (values[f.key] as DoctorEntry[]) : [];
  list.forEach((e, j) => {
    if (!isObj(e) || !doctorHasContent(e)) return;
    for (const d of requiredDoctorFields(e)) {
      if (!str(e[d.key])) out.push({ key: `${prefix}${f.key}.${j}.${d.key}`, label: `${prefix ? `${str(values.name) || "Department"}: ` : ""}Doctor ${j + 1}: ${d.key === "name" ? "name" : "role"}`, section });
    }
  });
}

/** Required fields that are still empty. An empty list means the form can be sent. */
export function missingForSubmit(kind: IntakeKind, data: IntakeData): MissingItem[] {
  const out: MissingItem[] = [];
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const items = isRepeatValue(data[s.key]) ? (data[s.key] as RepeatItem[]) : [];
      if (items.length < s.repeat.minToSubmit) out.push({ key: s.key, label: `At least one ${s.repeat.itemLabel.toLowerCase()}`, section: s.title });
      for (const { it, i } of activeItems(s, data)) {
        for (const f of s.fields) {
          if (isRequired(f, it) && !filled(it[f.key])) {
            out.push({ key: `${s.key}.${i}.${f.key}`, label: items.length > 1 ? `${s.repeat!.itemLabel} ${i + 1}: ${f.label}` : f.label, section: s.title });
          }
          if (f.type === "doctors") missingDoctorFields(f, it, `${s.key}.${i}.`, s.title, out);
        }
      }
    } else {
      for (const f of s.fields) {
        if (isRequired(f, data) && !filled(data[f.key])) out.push({ key: f.key, label: f.label, section: s.title });
        if (f.type === "doctors") missingDoctorFields(f, data, "", s.title, out);
      }
    }
  }
  return out;
}

/** How many required fields are filled, for the progress bar. */
export function requiredProgress(kind: IntakeKind, data: IntakeData): { done: number; total: number } {
  let total = 0;
  for (const s of INTAKE_SECTIONS[kind]) {
    if (s.repeat) {
      const req = s.fields.filter((f) => f.required && !f.showIf && !f.optionalIf).length;
      const n = Math.max(s.repeat.minToSubmit, activeItems(s, data).length);
      total += req * n;
    } else total += s.fields.filter((f) => isRequired(f, data)).length;
  }
  for (const { doctor } of doctorEntries(kind, data)) total += requiredDoctorFields(doctor as unknown as Record<string, unknown>).length; // a name, and the role for "Other"
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
    beyond: intakePhotoSchema.optional(),
    awards: z.array(intakePhotoSchema).max(AWARD_PHOTOS_MAX, `Add at most ${AWARD_PHOTOS_MAX} award photos.`).optional(),
    gallery: z.array(intakePhotoSchema).max(cfg.galleryMax, `Add at most ${cfg.galleryMax} photos.`).default([]),
    viaWhatsapp: z.boolean().default(false),
  });
}

/** Every uploaded photo in a form (with `data`, the doctors' photos too). */
export function allPhotos(p: IntakePhotos, kind?: IntakeKind, data?: IntakeData): IntakePhoto[] {
  const doctors = kind && data ? doctorEntries(kind, data).flatMap(({ doctor }) => (doctor.photo ? [{ ...doctor.photo, caption: doctor.name || "Doctor photo" }] : [])) : [];
  return [p.profile, p.logo, p.cover, p.beyond, ...(p.awards ?? []), ...p.gallery, ...doctors].filter((x): x is IntakePhoto => Boolean(x));
}

/** One doctor entry as a line, for the admin notes. */
export function doctorText(e: DoctorEntry): string {
  return [str(e.name) || "(no name)", str(e.designation), str(e.education), doctorRoleLabel(e), str(e.portfolioUrl), e.photo ? `photo: ${e.photo.url}` : ""].filter(Boolean).join(" – ");
}

/** Pre-filled WhatsApp message for sending photos (or asking a question about a form). */
export function photosWhatsappText(ref: string | undefined, email: string, name: string): string {
  return [`Hi, I'm sending photos for my MediReach website form.`, name && `Name: ${name}`, ref && `Form ref: ${ref}`, email && `Email: ${email}`].filter(Boolean).join("\n");
}

/** The applicant's design choices in words, for the admin (review page and draft notes). */
export function designSummary(kind: IntakeKind, data: IntakeData): { website: string; card: string; decision: string; final: boolean } {
  const design = DESIGN_OPTIONS[kind].find((d) => d.value === data.websiteDesign);
  const card = CARD_STYLES_BY_GROUP[kind].find((c) => c.code === data.cardStyle);
  return {
    website: design ? design.label : "Not decided",
    card: card ? `${card.name} (${card.code})` : "Not decided",
    decision: data.designDecision === "final" ? "Final" : data.designDecision === "discuss" ? "Not final: talk to them before finalising" : "Not answered",
    final: data.designDecision === "final",
  };
}
