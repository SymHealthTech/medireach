/**
 * Shared enums for the MediReach portfolio product. Each list is the single
 * source of truth for both the Mongoose `enum` and the zod schemas, so the two
 * can never drift.
 */

// --- Roles ---
export const ADMIN_ROLES = ["superadmin", "admin", "sales"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** "owner" = a clinic or hospital owner using /account (self-edit login). */
export const ROLES = [...ADMIN_ROLES, "doctor", "owner"] as const;
export type Role = (typeof ROLES)[number];

// --- DoctorProfile ---
export const DOCTOR_STATUSES = ["draft", "review", "published", "suspended"] as const;
export type DoctorStatus = (typeof DOCTOR_STATUSES)[number];

export const GENDERS = ["male", "female", "other", "prefer_not"] as const;

export const SYSTEMS_OF_MEDICINE = [
  "allopathy",
  "ayurveda",
  "homeopathy",
  "unani",
  "siddha",
  "dental",
  "other",
] as const;
export type SystemOfMedicine = (typeof SYSTEMS_OF_MEDICINE)[number];

/** Display only; pricing no longer depends on it. */
export const PRACTITIONER_TYPES = ["gp", "consultant"] as const;

export const CLINIC_TYPES = ["own_clinic", "hospital_visiting", "other"] as const;

/** @deprecated v1 doctor plans; replaced by DOCTOR_PLANS in step 3 (migrate:v2 maps the data). */
export const PLANS = ["gp", "consultant", "hospital"] as const;
/** @deprecated see PLANS. */
export type Plan = (typeof PLANS)[number];

/** v2: `doctor_addon` = portfolio bought with a clinic/hospital bundle. */
export const DOCTOR_PLANS = ["doctor", "doctor_addon"] as const;
export type DoctorPlan = (typeof DOCTOR_PLANS)[number];

export const DOMAIN_STATUSES = ["requested", "active", "expired"] as const;

export const DOCTOR_SOURCES = ["field", "referral", "hospital", "inbound"] as const;

export const APPROVAL_CHANNELS = ["whatsapp", "email", "in_person"] as const;

// --- Products / establishments / renewals ---
/** The three products; every one includes a digital visiting card. */
export const PRODUCTS = ["doctor", "clinic", "hospital"] as const;
export type Product = (typeof PRODUCTS)[number];

export const ESTABLISHMENT_KINDS = ["clinic", "hospital"] as const;
export type EstablishmentKind = (typeof ESTABLISHMENT_KINDS)[number];
/** Same lifecycle and sources as doctor pages. */
export const ESTABLISHMENT_STATUSES = DOCTOR_STATUSES;
export const ESTABLISHMENT_PLANS = ESTABLISHMENT_KINDS;
export const ESTABLISHMENT_SOURCES = DOCTOR_SOURCES;

export const RENEWAL_STATUSES = ["active", "due", "overdue", "grace", "lapsed"] as const;
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];
/** Reminder emails go out this many days before the due date. */
export const RENEWAL_REMINDER_DAYS = [30, 7, 0] as const;
export const RENEWAL_DUE_SOON_DAYS = 30;
export const DEFAULT_RENEWAL_GRACE_DAYS = 30;

/** v2 price defaults (₹). The live values are in Settings; these only seed it. */
export const DEFAULT_PRICES = {
  doctorSetup: 1999,
  clinicSetup: 2999,
  hospitalSetup: 4999,
  doctorAddon: 1499,
  renewalDoctor: 999,
  renewalClinic: 999,
  renewalHospital: 1499,
  foundingRenewal: 499,
  foundingRenewalHospital: 999,
  updatePrice: 299,
} as const;
export type PriceKey = keyof typeof DEFAULT_PRICES;
export const PRICE_KEYS = Object.keys(DEFAULT_PRICES) as PriceKey[];

// --- Payments / requests / leads ---
export const PAYMENT_MODES = ["upi", "cash", "bank", "card"] as const;
/** @deprecated v1 purposes; replaced by PAYMENT_PURPOSES_V2 in step 5 (hospital_bulk → doctor_addon). */
export const PAYMENT_PURPOSES = ["setup", "update", "domain", "renewal", "hospital_bulk"] as const;
export const PAYMENT_PURPOSES_V2 = ["setup", "renewal", "update", "domain", "doctor_addon"] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES_V2)[number];

export const UPDATE_REQUEST_STATUSES = ["new", "in_progress", "done"] as const;
export const DEFAULT_UPDATE_PRICE = 299;

export const LEAD_SOURCES = ["homepage_form", "whatsapp_click", "pricing", "doctors", "clinics", "hospitals"] as const;
export const LEAD_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// --- Website forms (self-filled from "Get started") ---
/** Who the website is for. */
export const INTAKE_KINDS = PRODUCTS;
export type IntakeKind = Product;
/** draft = saved but not sent; submitted = sent for review; done = website created. */
export const INTAKE_STATUSES = ["draft", "submitted", "in_review", "done", "archived"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];
/** The applicant can keep editing until the team marks the form done or archived. */
export const INTAKE_EDITABLE_STATUSES: readonly IntakeStatus[] = ["draft", "submitted", "in_review"];

// --- Templates ---
/** @deprecated v1 slot types; replaced by SITE_TEMPLATE_TYPES in step 2. */
export const TEMPLATE_TYPES = ["portfolio", "card"] as const;
/** @deprecated see TEMPLATE_TYPES. */
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
/** v2 slot types, 5 slots each (DESIGN_BRIEF.md §11). */
export const SITE_TEMPLATE_TYPES = ["portfolio", "clinic", "hospital", "card"] as const;
export type SiteTemplateType = (typeof SITE_TEMPLATE_TYPES)[number];

export const TEMPLATE_KEYS = ["classic", "t2", "t3", "t4", "t5"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export const DEFAULT_TEMPLATE_KEY: TemplateKey = "classic";

export const TEMPLATE_STATUSES = ["coming_soon", "in_design", "ready"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

// --- Settings ---
export const GST_MODES = ["inclusive", "exclusive", "none"] as const;

// --- Limits ---
export const LIMITS = {
  shortBio: 160,
  /** "Beyond medicine" story body (plain text). */
  storyBody: 6000,
  galleryMax: 5,
  clinicGalleryMax: 8,
  hospitalGalleryMax: 12,
  hospitalBedsMax: 10,
  subdomainMin: 3,
  subdomainMax: 40,
} as const;

export const FOUNDING_TOTAL_DEFAULT = 100;
