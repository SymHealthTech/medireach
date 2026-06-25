/**
 * Shared domain constants and string-literal unions used across models, auth,
 * and API routes. Centralized so the receptionist permission matrix (spec §5.2),
 * billing thresholds (spec §11), and account lifecycle states stay consistent.
 */

export const ROLES = ["doctor", "receptionist", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = [
  "incomplete-onboarding",
  "active",
  "paused",
  "unsubscribed",
  "suspended",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const VISIT_STATUSES = ["draft", "confirmed"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_TYPES = ["new", "follow-up"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export const MEDICINE_SOURCES = ["clinic", "pharmacy"] as const;
export type MedicineSource = (typeof MEDICINE_SOURCES)[number];

export const VERIFICATION_DOC_TYPES = [
  "registration",
  "degree",
  "clinic",
] as const;
export type VerificationDocType = (typeof VERIFICATION_DOC_TYPES)[number];

export const DOC_REVIEW_STATUSES = ["submitted", "reviewed", "flagged"] as const;
export type DocReviewStatus = (typeof DOC_REVIEW_STATUSES)[number];

export const INVOICE_STATUSES = [
  "pending",
  "paid",
  "overdue",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYER_TYPES = ["doctor", "sponsor"] as const;
export type PayerType = (typeof PAYER_TYPES)[number];

export const LEAD_STATUSES = ["new", "demo-scheduled", "converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SOS_CONTACT_STATUSES = ["pending", "accepted", "declined"] as const;
export type SosContactStatus = (typeof SOS_CONTACT_STATUSES)[number];

/** Billing model — spec §11. */
export const BILLING = {
  JOINING_FEE_INR: 99,
  MONTHLY_MINIMUM_INR: 299,
  PER_PATIENT_INR: 1.5,
  PER_PATIENT_DISCOUNTED_INR: 1,
  DISCOUNT_THRESHOLD: 1000,
  CYCLE_DAYS: 30,
  REMINDER_DAY: 25,
  INVOICE_DAY: 30,
  GRACE_END_DAY: 40,
} as const;

/** Record lifecycle — spec §9.2, §9.3. */
export const RECORD = {
  EDIT_LOCK_DAYS: 3,
  RETENTION_DAYS: 365,
} as const;

export const MAX_SOS_CONTACTS = 10;

export const MEDICINE_TYPES = [
  "Tab", "Cap", "Syr", "Inj", "Susp", "Drops", "Gel", "Cream", "Oint",
  "Inhaler", "Patch", "Sachet", "Spray", "Powder", "Loz", "Supp",
] as const;
export type MedicineType = (typeof MEDICINE_TYPES)[number];

export const MEDICINE_DOSES = [
  "1/2", "1", "1.5", "2", "3",
  "1tsf", "2tsf",
  "5ml", "10ml", "15ml", "20ml", "30ml",
] as const;

export const MEDICINE_FREQUENCIES = [
  "OD", "BD", "TDS", "QID", "HS", "SOS", "Stat", "Weekly", "Fortnightly",
] as const;

export const MEDICINE_TIMINGS = [
  "Before food", "After food",
  "Before breakfast", "After breakfast",
  "Before lunch", "After lunch",
  "Before dinner", "After dinner",
  "Empty stomach", "At bedtime", "With water", "With milk",
] as const;
