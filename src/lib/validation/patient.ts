import { z } from "zod";
import { fields } from "@/lib/api/validate";

/**
 * Patient registration fields (spec §7.2). Either DOB or age is accepted.
 * Consent is mandatory — registration must not save without the plain-language
 * consent being affirmed (spec §7.2, §15.8).
 */
export const patientRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    gender: z.enum(["male", "female", "other"]),
    dob: z.string().datetime().optional(),
    ageYears: z.number().int().min(0).max(130).optional(),
    mobile: fields.mobile,
    address: z.string().trim().max(500).optional().default(""),
    bp: z.string().trim().max(20).optional(),
    weightKg: z.number().min(0).max(500).optional(),
    heightCm: z.number().min(0).max(300).optional(),
    allergicTo: z.string().trim().max(300).optional(),
    referredBy: z.string().trim().max(200).optional(),
    emergencyContact: z.string().trim().max(60).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: "Patient consent is required to register." }) }),
  })
  .refine((d) => d.dob || d.ageYears !== undefined, {
    message: "Provide either date of birth or age.",
    path: ["ageYears"],
  });

export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;
