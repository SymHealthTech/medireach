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

/**
 * Subscription tiers (two-tier system):
 *  - starter: typing only, flat ₹499/cycle. NEVER triggers a paid API call
 *             (no speech-to-text, no Claude) — enforced server-side.
 *  - pro:     voice + AI, ₹299 base or per-patient (whichever is greater).
 * New and existing accounts default to `starter`; upgrading to `pro` unlocks
 * voice/AI immediately (see requireProTier + the billing tier-switch route).
 */
export const TIERS = ["starter", "pro"] as const;
export type Tier = (typeof TIERS)[number];
export const DEFAULT_TIER: Tier = "starter";

/** Billing model — spec §11 + two-tier pricing. */
export const BILLING = {
  JOINING_FEE_INR: 99,
  STARTER_FLAT_INR: 499, // Starter: flat per 30-day cycle, any patient count
  MONTHLY_MINIMUM_INR: 299, // Pro: monthly minimum floor
  PER_PATIENT_INR: 1.5,
  PER_PATIENT_DISCOUNTED_INR: 1,
  DISCOUNT_THRESHOLD: 1000,
  CYCLE_DAYS: 30,
  REMINDER_DAY: 25,
  INVOICE_DAY: 30,
  GRACE_END_DAY: 40,
} as const;

/**
 * GST / tax configuration (India). Pricing is INCLUSIVE — the listed prices
 * (₹299 minimum, ₹1.5/patient) already include GST, so enabling tax does NOT
 * change what a doctor pays; the invoice simply back-computes and shows the tax
 * component. Keep ENABLED=false until the company is GST-registered — collecting
 * GST without a GSTIN is non-compliant. MediReach sells a SaaS subscription to
 * doctors (SAC 9983, 18%); the healthcare exemption does NOT apply to it.
 */
export const TAX = {
  ENABLED: false, // flip on only after GST registration
  PRICING: "inclusive" as const,
  RATE: 18, // % — software/SaaS service
  SAC: "9983", // Services Accounting Code
  SELLER_LEGAL_NAME: "MediReach",
  SELLER_GSTIN: "", // fill in on registration, e.g. "27ABCDE1234F1Z5"
  SELLER_STATE_CODE: "", // 2-digit GST state code, for intra/inter-state split
} as const;

/**
 * GST state/UT codes (India) — the 2-digit code prefixing every GSTIN. Used to
 * determine intra-state (CGST+SGST) vs inter-state (IGST) supply by comparing
 * the clinic's state against TAX.SELLER_STATE_CODE. Order is by code.
 */
export const GST_STATE_CODES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
] as const;

export const GST_STATE_CODE_SET: ReadonlySet<string> = new Set(GST_STATE_CODES.map((s) => s.code));

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

/**
 * Keyword categories (Edit Keyword — spec §9.5). Each consultation field owns
 * its own shorthand dictionary so a shortcut expands into the right field.
 * `medicine` shortcuts expand into every medicine sub-field; the rest expand
 * into free text. The order here drives the display order on the Keywords page.
 * `targets` lists the consult-page field(s) that consume this category so a
 * single dictionary can back combined fields (e.g. C/O + Notes).
 */
export const KEYWORD_FIELDS = [
  { key: "medicine",  label: "Medicines",           short: "Rx",    hint: "Expands into every medicine field — type, contains, dose, frequency, timing, source." },
  { key: "ho",        label: "Past History",        short: "P/H/O", hint: "Personal / past medical history." },
  { key: "fh",        label: "Family History",      short: "F/H",   hint: "Relevant family history." },
  { key: "allergic",  label: "Allergic To",         short: "⚠",     hint: "Known drug or other allergies." },
  { key: "co",        label: "Complaints & Notes",  short: "C/O",   hint: "Presenting complaints and free notes." },
  { key: "oe_pa",     label: "O/E — P/A",           short: "P/A",   hint: "On examination · per abdomen." },
  { key: "oe_cvs",    label: "O/E — CVS",           short: "CVS",   hint: "On examination · cardiovascular system." },
  { key: "oe_cns",    label: "O/E — CNS",           short: "CNS",   hint: "On examination · central nervous system." },
  { key: "diagnosis", label: "Diagnosis",           short: "Dx",    hint: "Provisional and final diagnosis." },
  { key: "fees",      label: "Fees",                short: "₹",     hint: "Consultation fee shortcuts." },
  { key: "advice",    label: "Advice",              short: "Adv",   hint: "General advice given to the patient." },
  { key: "labTest",   label: "Lab Test",            short: "Lab",   hint: "Investigations / lab tests." },
] as const;

export type KeywordField = (typeof KEYWORD_FIELDS)[number]["key"];
export const KEYWORD_FIELD_KEYS = KEYWORD_FIELDS.map((f) => f.key) as [KeywordField, ...KeywordField[]];
