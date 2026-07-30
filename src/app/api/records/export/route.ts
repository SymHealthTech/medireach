import { NextResponse } from "next/server";
import { z } from "zod";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { Errors } from "@/lib/api/errors";
import { Visit } from "@/models/Visit";
import { Patient } from "@/models/Patient";
import { buildXlsx, type CellValue } from "@/lib/server/xlsx";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.");
const querySchema = z.object({ from: dateStr, to: dateStr });

/** Start-of-day (inclusive) and next-day start (exclusive) in IST → UTC Dates. */
function istRange(from: string, to: string): { start: Date; endExclusive: Date } {
  const start = new Date(`${from}T00:00:00+05:30`);
  const toStart = new Date(`${to}T00:00:00+05:30`);
  return { start, endExclusive: new Date(toStart.getTime() + 86_400_000) };
}

function istDateTime(d?: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function ageFrom(ageYears?: number, dob?: Date): CellValue {
  if (typeof ageYears === "number") return ageYears;
  if (!dob) return "";
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000));
  return years >= 0 ? years : "";
}

function formatMedicines(medicines: { type?: string; name?: string; dose?: string; frequency?: string; timing?: string; clinicalText?: string }[] = []): string {
  return medicines
    .map((m) => {
      if (m.clinicalText && m.clinicalText.trim()) return m.clinicalText.trim();
      return [m.type, m.name, m.dose, m.frequency, m.timing].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean)
    .join(" | ");
}

const HEADERS = [
  "Visit Date",
  "Patient ID",
  "Name",
  "Gender",
  "Age",
  "Mobile",
  "Address",
  "Emergency Contact",
  "Allergic To",
  "Referred By",
  "Intake BP",
  "Intake Weight (kg)",
  "Intake Height (cm)",
  "Intake Temp",
  "Visit Type",
  "Visit Purpose",
  "Complaints",
  "History of Illness",
  "Family History",
  "Provisional Diagnosis",
  "Diagnosis",
  "O/E BP",
  "O/E Pulse",
  "O/E Temp",
  "O/E Weight",
  "O/E Height",
  "O/E RR",
  "O/E BSL",
  "Medicines",
  "Advice (General)",
  "Advice (Lab Test)",
  "Follow Up",
  "Notes",
  "Fees",
  "Fee Paid",
  "Due Amount",
  "Dues Status",
  "Registered On",
];

/**
 * Doctor-only Excel export of confirmed patient records within an IST date
 * range (inclusive of both `from` and `to`). One row per confirmed visit, with
 * the full patient demographic + intake vitals joined to the visit's clinical
 * detail. Tenant-scoped via the session doctorId; never trusts query identity.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) throw Errors.badRequest("Please choose a valid date range.");

  let { from, to } = parsed.data;
  if (from > to) [from, to] = [to, from];
  const { start, endExclusive } = istRange(from, to);

  const visits = await Visit.find({
    doctorId,
    status: "confirmed",
    confirmedAt: { $gte: start, $lt: endExclusive },
  })
    .sort({ confirmedAt: 1 })
    .lean();

  const patientIds = [...new Set(visits.map((v) => String(v.patientId)))];
  const patients = await Patient.find({ _id: { $in: patientIds }, doctorId }).lean();
  const pm = new Map(patients.map((p) => [String(p._id), p]));

  const rows: CellValue[][] = visits.flatMap((v) => {
    const p = pm.get(String(v.patientId));
    if (!p) return [];
    const oe = v.oe ?? {};
    const dues = v.dues;
    return [[
      istDateTime(v.confirmedAt),
      p.code ?? "",
      p.name ?? "",
      p.gender ?? "",
      ageFrom(p.ageYears, p.dob),
      p.mobile ?? "",
      p.address ?? "",
      p.emergencyContact ?? "",
      p.allergicTo ?? "",
      p.referredBy ?? "",
      p.bp ?? "",
      typeof p.weightKg === "number" ? p.weightKg : "",
      typeof p.heightCm === "number" ? p.heightCm : "",
      p.temp ?? "",
      v.type ?? "",
      v.visitMode ?? "",
      v.co ?? "",
      v.ho ?? "",
      v.fh ?? "",
      v.provisionalDiagnosis ?? "",
      v.diagnosis ?? "",
      oe.bp ?? "",
      oe.pulse ?? "",
      oe.temp ?? "",
      oe.weight ?? "",
      oe.height ?? "",
      oe.rr ?? "",
      oe.bsl ?? "",
      formatMedicines(v.medicines),
      v.adviceGeneral ?? "",
      v.adviceLabTest ?? "",
      v.followUp ?? "",
      v.notes ?? "",
      typeof v.fees === "number" ? v.fees : "",
      dues ? dues.amountPaid : "",
      dues ? dues.dueAmount : "",
      dues ? dues.status : "",
      istDateTime(p.registeredAt),
    ]];
  });

  const buffer = buildXlsx("Patient Records", HEADERS, rows);
  const filename = `patient-records_${from}_to_${to}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
});
