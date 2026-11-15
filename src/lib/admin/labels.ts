import type { LEAD_SOURCES, LEAD_STATUSES, PAYMENT_MODES, PAYMENT_PURPOSES, UPDATE_REQUEST_STATUSES } from "@/lib/constants";

/** Display labels for enums (plain module: usable from server and client). */

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
  hospitals: "Hospitals page",
};

export const PAYMENT_MODE_LABEL: Record<(typeof PAYMENT_MODES)[number], string> = {
  upi: "UPI",
  cash: "Cash",
  bank: "Bank transfer",
  card: "Card",
};

export const PAYMENT_PURPOSE_LABEL: Record<(typeof PAYMENT_PURPOSES)[number], string> = {
  setup: "Page setup",
  update: "Update",
  domain: "Own domain",
  renewal: "Renewal",
  hospital_bulk: "Hospital bulk",
};

export const UPDATE_STATUS_LABEL: Record<(typeof UPDATE_REQUEST_STATUSES)[number], string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
};
