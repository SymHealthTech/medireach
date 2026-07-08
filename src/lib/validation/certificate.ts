import { z } from "zod";
import { CERTIFICATE_TYPES } from "@/lib/certificate/types";
import { fields } from "@/lib/api/validate";

/**
 * Medical Certificate creation schema. All type-specific fields are optional at
 * the schema level (the doctor fills only those relevant to the chosen type);
 * `days` is deliberately NOT accepted from the client — the server recomputes it
 * from from/to (see the route) so it can never be tampered. A `yyyy-mm-dd` date
 * string keeps client preview and stored record in the same timezone-free form.
 */
const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .optional();

export const certificateCreateSchema = z.object({
  patientId: fields.objectId,
  // Optional: the originating certificate-only queue visit to complete on issue.
  visitId: fields.objectId.optional(),
  type: z.enum(CERTIFICATE_TYPES),
  diagnosis: z.string().trim().max(500).optional(),
  fromDate: dateStr,
  toDate: dateStr,
  illness: z.string().trim().max(500).optional(),
  resumeDate: dateStr,
  jobPurpose: z.string().trim().max(300).optional(),
  examinationSummary: z.string().trim().max(1000).optional(),
  remarks: z.string().trim().max(1000).optional(),
  certificateDate: dateStr,
});

export type CertificateCreateInput = z.infer<typeof certificateCreateSchema>;
