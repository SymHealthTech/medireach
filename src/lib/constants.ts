/**
 * Shared enums for the MediReach portfolio product. Each list is the single
 * source of truth for both the Mongoose `enum` and the zod schemas, so the two
 * can never drift.
 */

// --- Roles ---
export const ADMIN_ROLES = ["superadmin", "admin", "sales"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLES = [...ADMIN_ROLES, "doctor"] as const;
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

export const PRACTITIONER_TYPES = ["gp", "consultant"] as const;

export const CLINIC_TYPES = ["own_clinic", "hospital_visiting", "other"] as const;

export const PLANS = ["gp", "consultant", "hospital"] as const;
export type Plan = (typeof PLANS)[number];

export const DOMAIN_STATUSES = ["requested", "active", "expired"] as const;

export const DOCTOR_SOURCES = ["field", "referral", "hospital", "inbound"] as const;

export const APPROVAL_CHANNELS = ["whatsapp", "email", "in_person"] as const;

// --- Payments / requests / leads ---
export const PAYMENT_MODES = ["upi", "cash", "bank", "card"] as const;
export const PAYMENT_PURPOSES = ["setup", "update", "domain", "renewal", "hospital_bulk"] as const;

export const UPDATE_REQUEST_STATUSES = ["new", "in_progress", "done"] as const;
export const DEFAULT_UPDATE_PRICE = 299;

export const LEAD_SOURCES = ["homepage_form", "whatsapp_click", "pricing", "hospitals"] as const;
export const LEAD_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// --- Templates ---
export const TEMPLATE_TYPES = ["portfolio", "card"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

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
  subdomainMin: 3,
  subdomainMax: 40,
} as const;

export const FOUNDING_TOTAL_DEFAULT = 100;
