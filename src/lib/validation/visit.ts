import { z } from "zod";
import { MEDICINE_SOURCES } from "@/lib/constants";

/**
 * Visit clinical-field update schema (spec §7.3). All fields optional — the
 * doctor confirms a partial draft and edits any field by re-recording or typing
 * (§7.4). Used for both AI-structured saves and manual edits.
 */
export const medicineSchema = z.object({
  type: z.string().trim().max(30).default("Tab"),
  name: z.string().trim().min(1),
  generic: z.string().trim().max(200).default(""),
  dose: z.string().trim().max(30).default(""),
  dosage: z.string().trim().max(60).default(""),
  frequency: z.string().trim().max(60).default(""),
  timing: z.string().trim().max(100).default(""),
  source: z.enum(MEDICINE_SOURCES),
  clinicalText: z.string().trim().max(500).default(""),
  patientText: z.string().trim().max(500).default(""),
});

export const oeSchema = z
  .object({
    bp: z.string().trim().max(30).optional(),
    weight: z.string().trim().max(30).optional(),
    height: z.string().trim().max(30).optional(),
    pulse: z.string().trim().max(30).optional(),
    temp: z.string().trim().max(30).optional(),
    rr: z.string().trim().max(30).optional(),
    pa: z.string().trim().max(120).optional(),
    cvs: z.string().trim().max(120).optional(),
    cns: z.string().trim().max(120).optional(),
    bsl: z.string().trim().max(30).optional(),
  })
  .optional();

export const procedureSchema = z
  .object({
    nebuliserAgent: z.string().trim().max(300).optional(),
    injectionDetails: z.string().trim().max(500).optional(),
    woundSpec: z.string().trim().max(1000).optional(),
    mechanismOfInjury: z.string().trim().max(300).optional(),
    dressingNotes: z.string().trim().max(1000).optional(),
  })
  .optional();

export const visitUpdateSchema = z.object({
  ho: z.string().trim().max(2000).optional(),
  fh: z.string().trim().max(2000).optional(),
  co: z.string().trim().max(2000).optional(),
  oe: oeSchema,
  procedure: procedureSchema,
  notes: z.string().trim().max(2000).optional(),
  provisionalDiagnosis: z.string().trim().max(500).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  followUp: z.string().trim().max(500).optional(),
  adviceGeneral: z.string().trim().max(2000).optional(),
  adviceLabTest: z.string().trim().max(2000).optional(),
  prescriptionLanguage: z.enum(["english", "hindi", "marathi"]).optional(),
  medicines: z.array(medicineSchema).max(50).optional(),
  fees: z.number().min(0).max(1_000_000).optional(),
  reportPublicIds: z.array(z.string().trim().min(1)).max(20).optional(),
});

export type VisitUpdateInput = z.infer<typeof visitUpdateSchema>;
