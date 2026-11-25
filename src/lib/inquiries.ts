import { z } from "zod";

/**
 * Appointment requests from the contact form on doctor pages: the form schema
 * (shared by the public form's server action) and labels used by the account
 * page and the email. No server-only imports, so client components can use
 * the labels.
 */

export const INQUIRY_STATUSES = ["new", "contacted", "booked", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_TIMES = ["morning", "afternoon", "evening", "any"] as const;
export type InquiryTime = (typeof INQUIRY_TIMES)[number];

export const INQUIRY_TIME_LABEL: Record<InquiryTime, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  any: "Any time",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Appointment fixed",
  closed: "Closed",
};

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .optional()
    .transform((v) => v || undefined);

/** "2026-11-30" → that day (IST); must not be in the past or more than 6 months ahead. */
const preferredDate = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      ctx.addIssue({ code: "custom", message: "Pick a date." });
      return z.NEVER;
    }
    const d = new Date(`${s}T00:00:00+05:30`);
    const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
    if (Number.isNaN(d.getTime()) || d < today || d.getTime() - today.getTime() > 183 * 86_400_000) {
      ctx.addIssue({ code: "custom", message: "Pick a date from today onwards." });
      return z.NEVER;
    }
    return d;
  });

export const inquirySchema = z.object({
  doctorId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+?91)(?=\d{10}$)/, ""))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "Enter a 10-digit mobile number."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .refine((s) => !s || z.string().email().safeParse(s).success, "Enter a valid email address.")
    .transform((s) => s || undefined),
  clinicId: optional(40),
  preferredDate,
  preferredTime: z
    .enum(["", ...INQUIRY_TIMES])
    .optional()
    .transform((s) => (s || undefined) as InquiryTime | undefined),
  message: optional(1000),
  consent: z.literal("on", { errorMap: () => ({ message: "Please agree so the clinic can contact you." }) }),
  // Honeypot: real people never see or fill this.
  website: z.string().max(0).optional(),
});

export type InquiryInput = z.output<typeof inquirySchema>;

export const INQUIRY_FIELDS = ["doctorId", "name", "phone", "email", "clinicId", "preferredDate", "preferredTime", "message", "consent", "website"] as const;

export interface InquiryFormState {
  ok?: boolean;
  /** Sent from a demo page whose doctor isn't in the database: nothing was stored or emailed. */
  demo?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was submitted, echoed back on error: React resets the form after an action. */
  values?: Record<string, string>;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "Mon, 30 Nov 2026 · Morning" or "" when neither was given. */
export function preferredLabel(date?: Date | string | null, time?: InquiryTime | null): string {
  return [date ? dateFmt.format(new Date(date)) : "", time ? INQUIRY_TIME_LABEL[time] : ""].filter(Boolean).join(" · ");
}
