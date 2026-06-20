import "server-only";
import { optionalEnv, requireEnv } from "@/lib/env";
import type { MedicineSource } from "@/lib/constants";

/**
 * Claude structuring layer (spec §7.3, §14). Takes a free-form dictated
 * transcript plus the doctor's personal context (custom keyword dictionary
 * §9.5, known medicine names) and returns the consultation as structured visit
 * fields — including the two parallel medicine representations: the doctor's
 * clinical shorthand and a plain patient-facing version.
 *
 * Structured output is forced via tool use (single tool, tool_choice = that
 * tool) so we always get well-typed JSON back rather than prose to parse.
 *
 * Model is env-configurable (ANTHROPIC_MODEL). Default is Sonnet 4.6 — a
 * deliberate unit-economics choice given billing is ₹1.5/patient (spec §11);
 * set it to claude-opus-4-8 for maximum accuracy where margins allow.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface StructuredMedicine {
  name: string;
  dosage: string;
  frequency: string;
  source: MedicineSource;
  clinicalText: string;
  patientText: string;
}

export interface StructuredVisit {
  ho?: string;
  fh?: string;
  co?: string;
  oe?: {
    bp?: string;
    weight?: string;
    height?: string;
    pulse?: string;
    temp?: string;
    rr?: string;
    pa?: string;
    cvs?: string;
    cns?: string;
    bsl?: string;
  };
  notes?: string;
  provisionalDiagnosis?: string;
  diagnosis?: string;
  medicines: StructuredMedicine[];
  newMedicineNames: string[];
  fees?: number;
}

export interface StructureResult {
  ok: boolean;
  data?: StructuredVisit;
  error?: string;
}

export interface StructureContext {
  keywords: { keyword: string; expansion: string }[];
  knownMedicines: string[];
}

const STRUCTURE_TOOL = {
  name: "record_consultation",
  description:
    "Record the structured clinical consultation extracted from the doctor's dictation.",
  input_schema: {
    type: "object",
    properties: {
      ho: { type: "string", description: "History of present illness (H/O)" },
      fh: { type: "string", description: "Family history (F/H)" },
      co: { type: "string", description: "Complaints of (C/O)" },
      oe: {
        type: "object",
        description: "On examination findings; include only what was dictated.",
        properties: {
          bp: { type: "string" },
          weight: { type: "string" },
          height: { type: "string" },
          pulse: { type: "string" },
          temp: { type: "string" },
          rr: { type: "string" },
          pa: { type: "string", description: "Per abdomen (P/A)" },
          cvs: { type: "string" },
          cns: { type: "string" },
          bsl: { type: "string", description: "Blood sugar level" },
        },
      },
      notes: { type: "string" },
      provisionalDiagnosis: { type: "string" },
      diagnosis: { type: "string" },
      medicines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Medicine/brand name" },
            dosage: { type: "string", description: "e.g. 500mg" },
            frequency: { type: "string", description: "e.g. TDS, BD, OD" },
            source: {
              type: "string",
              enum: ["self", "pharmacy"],
              description: "self = dispensed from clinic stock; pharmacy = bought externally. Default pharmacy unless stated otherwise.",
            },
            clinicalText: {
              type: "string",
              description: "Doctor's clinical line with abbreviations retained, e.g. 'Tab. Paracetamol 500mg — 1 TDS'.",
            },
            patientText: {
              type: "string",
              description: "Plain-language patient instruction, e.g. 'Paracetamol 500mg — Take 3 times a day after food'.",
            },
          },
          required: ["name", "source", "clinicalText", "patientText"],
        },
      },
      newMedicineNames: {
        type: "array",
        items: { type: "string" },
        description: "Medicine names mentioned that are NOT in the provided known-medicines list.",
      },
      fees: { type: "number", description: "Consultation fee if explicitly dictated." },
    },
    required: ["medicines", "newMedicineNames"],
  },
} as const;

function buildSystemPrompt(ctx: StructureContext): string {
  const dict =
    ctx.keywords.length > 0
      ? ctx.keywords.map((k) => `  "${k.keyword}" → ${k.expansion}`).join("\n")
      : "  (none)";
  const meds = ctx.knownMedicines.length > 0 ? ctx.knownMedicines.join(", ") : "(none yet)";

  return [
    "You are a clinical scribe for an Indian general practitioner. Convert the doctor's dictated consultation into structured fields by calling the record_consultation tool.",
    "",
    "Rules:",
    "- Only fill a field if the dictation actually contains it. Leave others empty; never invent clinical findings.",
    "- Expand the doctor's personal shorthand using this dictionary before interpreting:",
    dict,
    "- For every medicine, produce TWO forms: clinicalText (keep abbreviations like TDS/BD/OD/SOS, 'Tab.', 'Cap.', strengths) and patientText (plain language a patient understands: expand TDS→'3 times a day', BD→'twice a day', OD→'once a day', HS→'at night', add 'after food'/'before food' if stated; do not invent timing not implied).",
    "- Preserve the doctor's brand names. Do NOT substitute generics.",
    "- source: mark 'self' only if the doctor says it's from clinic stock / dispensed here; otherwise 'pharmacy'.",
    "- Known medicines for this doctor (for spelling consistency): " + meds,
    "- newMedicineNames: list any medicine names you used that are NOT in the known list above.",
  ].join("\n");
}

export async function structureTranscript(
  transcript: string,
  ctx: StructureContext,
): Promise<StructureResult> {
  if (!transcript.trim()) return { ok: true, data: emptyStructured() };

  let apiKey: string;
  try {
    apiKey = requireEnv("ANTHROPIC_API_KEY");
  } catch {
    return { ok: false, error: "AI structuring is not configured." };
  }

  const model = optionalEnv("ANTHROPIC_MODEL", DEFAULT_MODEL);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: buildSystemPrompt(ctx),
        tools: [STRUCTURE_TOOL],
        tool_choice: { type: "tool", name: STRUCTURE_TOOL.name },
        messages: [{ role: "user", content: `Dictation:\n${transcript}` }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[claude] structuring failed:", res.status, detail);
      return { ok: false, error: "Could not structure the dictation. You can edit the fields manually." };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>;
    };
    const toolUse = data.content?.find((c) => c.type === "tool_use" && c.name === STRUCTURE_TOOL.name);
    if (!toolUse?.input) {
      return { ok: false, error: "AI returned an unexpected response. Please edit manually." };
    }

    return { ok: true, data: normalize(toolUse.input as Partial<StructuredVisit>) };
  } catch (err) {
    console.error("[claude] structuring error:", err);
    return { ok: false, error: "AI service is unavailable. Please edit the fields manually." };
  }
}

function emptyStructured(): StructuredVisit {
  return { medicines: [], newMedicineNames: [] };
}

/* ───────────────────────────────────────────────────────────────────────────
 * Patient-registration structuring (Change 2). Same push-to-talk → AI
 * structures → review → confirm pattern as the consultation, applied to the
 * patient intake fields instead of clinical fields. Lets the doctor add a new
 * patient to today's queue by voice when no receptionist is available.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface StructuredPatient {
  name?: string;
  ageYears?: number;
  gender?: "male" | "female" | "other";
  mobile?: string;
  address?: string;
  allergicTo?: string;
}

export interface StructurePatientResult {
  ok: boolean;
  data?: StructuredPatient;
  error?: string;
}

const RECORD_PATIENT_TOOL = {
  name: "record_patient",
  description: "Record the new patient's intake details extracted from the doctor's spoken description.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Patient's full name." },
      ageYears: { type: "number", description: "Age in years if stated." },
      gender: { type: "string", enum: ["male", "female", "other"], description: "Only if stated or clearly implied." },
      mobile: { type: "string", description: "Mobile number, digits only." },
      address: { type: "string", description: "Address if stated." },
      allergicTo: { type: "string", description: "Known allergies if stated." },
    },
    required: [],
  },
} as const;

const PATIENT_SYSTEM_PROMPT = [
  "You are a front-desk assistant for an Indian clinic. The doctor will speak a new patient's basic details in one or two natural sentences. Extract them by calling the record_patient tool.",
  "",
  "Rules:",
  "- Only fill a field if it was actually stated. Never invent a value (especially mobile number or name).",
  "- mobile: digits only, no spaces or country code prefix.",
  "- ageYears: a whole number of years.",
  "- gender: set only if stated or unambiguous from the description; otherwise leave empty.",
].join("\n");

export async function structurePatient(transcript: string): Promise<StructurePatientResult> {
  if (!transcript.trim()) return { ok: true, data: {} };

  let apiKey: string;
  try {
    apiKey = requireEnv("ANTHROPIC_API_KEY");
  } catch {
    return { ok: false, error: "AI structuring is not configured." };
  }

  const model = optionalEnv("ANTHROPIC_MODEL", DEFAULT_MODEL);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: PATIENT_SYSTEM_PROMPT,
        tools: [RECORD_PATIENT_TOOL],
        tool_choice: { type: "tool", name: RECORD_PATIENT_TOOL.name },
        messages: [{ role: "user", content: `Patient details:\n${transcript}` }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[claude] patient structuring failed:", res.status, detail);
      return { ok: false, error: "Could not read the details. You can type them instead." };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>;
    };
    const toolUse = data.content?.find((c) => c.type === "tool_use" && c.name === RECORD_PATIENT_TOOL.name);
    if (!toolUse?.input) {
      return { ok: false, error: "AI returned an unexpected response. Please type the details." };
    }

    return { ok: true, data: normalizePatient(toolUse.input as Partial<StructuredPatient>) };
  } catch (err) {
    console.error("[claude] patient structuring error:", err);
    return { ok: false, error: "AI service is unavailable. Please type the details." };
  }
}

function normalizePatient(input: Partial<StructuredPatient>): StructuredPatient {
  const gender = input.gender === "male" || input.gender === "female" || input.gender === "other" ? input.gender : undefined;
  const age = typeof input.ageYears === "number" && input.ageYears > 0 && input.ageYears < 130 ? Math.floor(input.ageYears) : undefined;
  return {
    name: input.name?.trim() || undefined,
    ageYears: age,
    gender,
    mobile: input.mobile ? String(input.mobile).replace(/\D/g, "") || undefined : undefined,
    address: input.address?.trim() || undefined,
    allergicTo: input.allergicTo?.trim() || undefined,
  };
}

/** Defensive normalization — never trust the shape blindly even from a tool call. */
function normalize(input: Partial<StructuredVisit>): StructuredVisit {
  const medicines: StructuredMedicine[] = Array.isArray(input.medicines)
    ? input.medicines.map((m) => ({
        name: String(m?.name ?? "").trim(),
        dosage: String(m?.dosage ?? "").trim(),
        frequency: String(m?.frequency ?? "").trim(),
        source: m?.source === "self" ? "self" : "pharmacy",
        clinicalText: String(m?.clinicalText ?? "").trim(),
        patientText: String(m?.patientText ?? "").trim(),
      }))
    : [];

  return {
    ho: input.ho?.trim() || undefined,
    fh: input.fh?.trim() || undefined,
    co: input.co?.trim() || undefined,
    oe: input.oe ?? undefined,
    notes: input.notes?.trim() || undefined,
    provisionalDiagnosis: input.provisionalDiagnosis?.trim() || undefined,
    diagnosis: input.diagnosis?.trim() || undefined,
    medicines,
    newMedicineNames: Array.isArray(input.newMedicineNames)
      ? input.newMedicineNames.map((n) => String(n).trim()).filter(Boolean)
      : [],
    fees: typeof input.fees === "number" && input.fees >= 0 ? input.fees : undefined,
  };
}
