import { z } from "zod";
import { HHMM, phone, t, url } from "@/lib/doctors/form";

/**
 * What a clinic or hospital owner may change from /account
 * (MEDIREACH_BUILD_PROMPT.md Phase 7): timings (incl. 24×7), phones,
 * WhatsApp, emergency number, appointment note, visiting hours and address
 * fields. Everything else goes through our team. Shared by the browser editor
 * and the server action; empty optional values are "" in the form.
 */

export interface OwnerSiteForm {
  id: string;
  kind: "clinic" | "hospital";
  /** Read-only context for the editor. */
  name: string;
  area: string;
  address: { line1: string; line2: string; pincode: string; landmark: string; parkingNote: string };
  mapsUrl: string;
  phones: string[];
  whatsapp: string;
  emergencyPhone: string;
  is24x7: boolean;
  timings: { day: number; slots: { open: string; close: string }[] }[];
  appointmentNote: string;
  visitingHours: string;
}

const slot = z
  .object({ open: z.string().regex(HHMM, "Use HH:MM."), close: z.string().regex(HHMM, "Use HH:MM.") })
  .refine((s) => s.open !== s.close, "Opening and closing times are the same.");

export const ownerSiteSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/i),
    address: z.object({
      line1: z.string().trim().min(3, "Enter the address.").max(200),
      line2: t(200),
      pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode."),
      landmark: t(120),
      parkingNote: t(200),
    }),
    mapsUrl: url,
    phones: z.array(phone).max(4),
    whatsapp: phone,
    emergencyPhone: phone,
    is24x7: z.boolean(),
    timings: z.array(z.object({ day: z.number().int().min(0).max(6), slots: z.array(slot).max(4) })).max(7),
    appointmentNote: t(200),
    visitingHours: t(200),
  })
  .refine((s) => s.phones.some(Boolean), { message: "Keep at least one phone number.", path: ["phones.0"] })
  .refine((s) => s.is24x7 || s.timings.some((d) => d.slots.length > 0), { message: "Add timings, or turn on Open 24×7.", path: ["timings"] });

export type OwnerSiteInput = z.output<typeof ownerSiteSchema>;

/** Free text the NMC scan checks (field paths match the editor's ids). */
export function ownerSiteTextFields(input: OwnerSiteInput): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (k: string, v: string | undefined) => {
    if (v) out[k] = v;
  };
  add("appointmentNote", input.appointmentNote);
  add("visitingHours", input.visitingHours);
  add("address.landmark", input.address.landmark);
  add("address.parkingNote", input.address.parkingNote);
  return out;
}
