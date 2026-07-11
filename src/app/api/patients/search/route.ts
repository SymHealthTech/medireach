import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { scopedFind } from "@/lib/api/scoped";
import { Patient } from "@/models/Patient";
import { RECEPTIONIST_PATIENT_FIELDS } from "@/lib/api/projections";

/**
 * Search existing patients by name, mobile, or DOB (spec §7.1). Results are
 * tenant-scoped and role-projected: the receptionist receives demographics
 * only (no clinical fields, no vitals — §5.2 / §16.2 default), enforced here at
 * the data layer via field projection, not just hidden in the UI.
 *
 * If a mobile matches multiple patients (family members) the caller gets the
 * full list to choose from (§7.1).
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DOCTOR_FIELDS = {
  ...RECEPTIONIST_PATIENT_FIELDS,
  allergicTo: 1,
  bp: 1,
  weightKg: 1,
  heightCm: 1,
} as const;

export const GET = route({ roles: Roles.clinic }, async (req, ctx) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const dob = (url.searchParams.get("dob") ?? "").trim();

  if (!q && !dob) return jsonOk({ patients: [] });

  const conditions: Record<string, unknown>[] = [];
  if (q) {
    const safe = escapeRegex(q);
    conditions.push({ name: { $regex: `(^|\\s)${safe}`, $options: "i" } });
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 4) conditions.push({ mobile: { $regex: escapeRegex(digits) } });
    // Patient ID lookup: matches the clinic-unique code (e.g. "P-0001"), whether
    // the user types the full code, just the number ("1", "0001"), or a prefix.
    conditions.push({ code: { $regex: safe, $options: "i" } });

    // Initials search: "R S" or "RS" → match "Ramesh Sharma", "Raj Singh"
    const spaceTokens = q.trim().split(/\s+/);
    const allSingleLetters = spaceTokens.length >= 2 && spaceTokens.every((t) => /^[a-zA-Z]$/.test(t));
    const compactInitials = /^[a-zA-Z]{2,4}$/.test(q);
    if (allSingleLetters || compactInitials) {
      const letters = allSingleLetters ? spaceTokens : q.split("");
      const initialsPattern = letters.map((l) => `${escapeRegex(l)}[^\\s]*`).join("\\s+");
      conditions.push({ name: { $regex: initialsPattern, $options: "i" } });
    }
  }
  if (dob) {
    const day = new Date(dob);
    if (!Number.isNaN(day.getTime())) {
      const next = new Date(day.getTime() + 86_400_000);
      conditions.push({ dob: { $gte: day, $lt: next } });
    }
  }
  if (conditions.length === 0) return jsonOk({ patients: [] });

  const projection = ctx.role === "receptionist" ? RECEPTIONIST_PATIENT_FIELDS : DOCTOR_FIELDS;
  const patients = await scopedFind(Patient, ctx, { $or: conditions })
    .select(projection)
    .sort({ name: 1 })
    .limit(25)
    .lean();

  return jsonOk({ patients });
});
