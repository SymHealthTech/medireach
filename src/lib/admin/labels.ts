import type {
  DoctorPlan,
  IntakeStatus,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PAYMENT_MODES,
  PAYMENT_PURPOSES,
  PAYMENT_PURPOSES_V2,
  RenewalStatus,
  UPDATE_REQUEST_STATUSES,
} from "@/lib/constants";

/** Display labels for enums (plain module: usable from server and client). */

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  draft: "In progress",
  submitted: "Submitted",
  in_review: "In review",
  done: "Website created",
  archived: "Archived",
};

export const INTAKE_STATUS_TONE: Record<IntakeStatus, "marigold" | "ink" | "leaf" | "muted" | "clay"> = {
  draft: "muted",
  submitted: "marigold",
  in_review: "ink",
  done: "leaf",
  archived: "muted",
};

export const LEAD_STATUS_LABEL: Record<(typeof LEAD_STATUSES)[number], string> = {
  new: "New",
  contacted: "Contacted",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCE_LABEL: Record<(typeof LEAD_SOURCES)[number], string> = {
  homepage_form: "Website form",
  whatsapp_click: "WhatsApp click",
  pricing: "Pricing page",
  doctors: "For doctors page",
  clinics: "For clinics page",
  hospitals: "For hospitals page",
};

export const PAYMENT_MODE_LABEL: Record<(typeof PAYMENT_MODES)[number], string> = {
  upi: "UPI",
  cash: "Cash",
  bank: "Bank transfer",
  card: "Card",
};

export const DOCTOR_PLAN_LABEL: Record<DoctorPlan, string> = {
  doctor: "Doctor portfolio",
  doctor_addon: "Add-on (clinic/hospital bundle)",
};

export const RENEWAL_STATUS_LABEL: Record<RenewalStatus, string> = {
  active: "Active",
  due: "Due soon",
  overdue: "Overdue",
  grace: "In grace period",
  lapsed: "Lapsed",
};
export const RENEWAL_STATUS_TONE: Record<RenewalStatus, "leaf" | "marigold" | "clay" | "muted"> = {
  active: "leaf",
  due: "marigold",
  overdue: "clay",
  grace: "clay",
  lapsed: "muted",
};

export const PAYMENT_PURPOSE_LABEL: Record<(typeof PAYMENT_PURPOSES)[number] | (typeof PAYMENT_PURPOSES_V2)[number], string> = {
  setup: "Setup",
  update: "Update",
  domain: "Own domain",
  renewal: "Renewal",
  doctor_addon: "Doctor add-on",
  hospital_bulk: "Hospital bulk (old)",
};

export const UPDATE_STATUS_LABEL: Record<(typeof UPDATE_REQUEST_STATUSES)[number], string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
};
