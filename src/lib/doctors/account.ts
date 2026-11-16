import { z } from "zod";
import { sectionSchemas, type ClinicForm } from "@/lib/doctors/form";

/**
 * Doctor self-edit (/account). Doctors may change ONLY: clinic timings, clinic
 * phone, address lines and pincode, maps link, fee + show/hide, appointment
 * note, and their mobile / WhatsApp. Everything else (name, registration,
 * specialties, clinic names, area/city that decide the page address…) goes
 * through a "Request a change" update request.
 *
 * Validation reuses the dashboard editor's field schemas, so both paths accept
 * exactly the same values.
 */

export type AccountClinic = Pick<
  ClinicForm,
  "key" | "addressLine1" | "addressLine2" | "pincode" | "mapsUrl" | "phone" | "timings" | "appointmentNote" | "fee" | "showFee"
> & { name: string; area: string };

export interface AccountForm {
  mobile: string;
  whatsapp: string;
  clinics: AccountClinic[];
}

/** The fields a doctor can edit, per clinic. */
export const ACCOUNT_CLINIC_FIELDS = {
  key: true,
  addressLine1: true,
  addressLine2: true,
  pincode: true,
  mapsUrl: true,
  phone: true,
  timings: true,
  appointmentNote: true,
  fee: true,
  showFee: true,
} as const;

export const accountSchema = z.object({
  mobile: sectionSchemas.contact.shape.mobile,
  whatsapp: sectionSchemas.contact.shape.whatsapp,
  clinics: z.array(sectionSchemas.clinics.shape.clinics.element.pick(ACCOUNT_CLINIC_FIELDS)).max(6),
});

export type AccountInput = z.output<typeof accountSchema>;

/** Free text a doctor can write, keyed by field path, for the NMC scan. */
export function accountTextFields(input: AccountInput): Record<string, string> {
  const out: Record<string, string> = {};
  input.clinics.forEach((c, i) => {
    out[`clinics.${i}.appointmentNote`] = c.appointmentNote ?? "";
    out[`clinics.${i}.addressLine1`] = c.addressLine1;
    out[`clinics.${i}.addressLine2`] = c.addressLine2 ?? "";
  });
  return out;
}

export const changeRequestSchema = z.object({
  description: z.string().trim().min(10, "Tell us what to change (at least a few words).").max(2000, "Use at most 2000 characters."),
});
