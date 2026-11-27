import "server-only";
import { Types } from "mongoose";
import { STAFF_ID_RE } from "@/lib/constants";
import { findSalesUser } from "@/lib/admin/ownership";
import { intakeKeys, matchedFields } from "@/lib/visits/keys";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake, type IntakeDoc } from "@/models/Intake";
import { Visit } from "@/models/Visit";

/**
 * Website form → sales executive.
 *
 * When a doctor, clinic or hospital sends the website form (or a sales
 * executive logs a visit after the form came in), the form is matched to the
 * field visits on its three confirming fields: doctor's name, clinic / hospital
 * name, mobile number (any one). The staff ID or name the applicant typed on
 * the form counts too, and wins if given.
 *
 *  - One executive matches: the form becomes theirs (they see it; the website
 *    draft made from it is theirs), and their visit shows "Form filled".
 *  - Several match: nobody gets it automatically; the super admin sees the
 *    candidates on the form and picks one.
 *  - The super admin's choice (including "nobody") is final: automatic
 *    matching never changes it.
 */

type Candidate = { salesAdminId: Types.ObjectId; name: string; staffId?: string; on: string[]; visitId?: Types.ObjectId; day?: string };

const VISIT_WINDOW_DAYS = 365;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Recompute an intake's match keys (call before matching forms saved before keys existed). */
export function keysFor(intake: Pick<IntakeDoc, "kind" | "data" | "matchKeys">): string[] {
  return intake.matchKeys?.length ? intake.matchKeys : intakeKeys(intake.kind, intake.data as Record<string, unknown>);
}

/** The executive the applicant named on the form, by staff ID first, else by name. */
async function typedOnForm(data: Record<string, unknown>) {
  const id = str(data.salesStaffId).toUpperCase().replace(/^([A-Z]+)[\s-]?(\d+)$/, "$1-$2");
  if (STAFF_ID_RE.test(id)) {
    const byId = await Admin.findOne({ role: "sales", staffId: id }).select({ _id: 1, name: 1, staffId: 1 }).lean();
    if (byId) return { user: byId, on: "staff ID on the form" };
  }
  const byName = str(data.salesName) ? await findSalesUser(str(data.salesName)) : null;
  return byName ? { user: byName, on: "name on the form" } : null;
}

/** Everyone whose visits match this form, best visit first. */
async function candidatesFor(intake: IntakeDoc, keys: string[]): Promise<Candidate[]> {
  if (keys.length === 0) return [];
  const since = new Date(Date.now() - VISIT_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const visits = await Visit.find({ matchKeys: { $in: keys }, day: { $gte: since }, $or: [{ intakeId: { $exists: false } }, { intakeId: intake._id }] })
    .sort({ day: -1, createdAt: -1 })
    .limit(100)
    .lean();
  const best = new Map<string, Candidate>();
  for (const v of visits) {
    const on = matchedFields(v.matchKeys, keys);
    const k = String(v.salesAdminId);
    const prev = best.get(k);
    if (!prev || on.length > prev.on.length) best.set(k, { salesAdminId: v.salesAdminId, name: v.salesName, staffId: v.staffId, on, visitId: v._id, day: v.day });
  }
  // Only executives who still have a login.
  const live = new Set((await Admin.find({ _id: { $in: [...best.values()].map((c) => c.salesAdminId) }, role: "sales" }).select({ _id: 1 }).lean()).map((a) => String(a._id)));
  return [...best.values()].filter((c) => live.has(String(c.salesAdminId)));
}

/**
 * Match one website form to a sales executive (see the top of this file).
 * Safe to call again at any time: it only changes automatic links.
 */
export async function linkIntakeToSales(intakeId: Types.ObjectId | string): Promise<void> {
  const intake = await Intake.findById(intakeId).lean();
  if (!intake || intake.salesMatch?.by === "admin") return;
  const keys = keysFor(intake);
  const [candidates, typed] = await Promise.all([candidatesFor(intake, keys), typedOnForm(intake.data as Record<string, unknown>)]);

  let winner: Candidate | undefined;
  let by: "form" | "visit" = "visit";
  if (typed) {
    const fromVisit = candidates.find((c) => String(c.salesAdminId) === String(typed.user._id));
    winner = { salesAdminId: typed.user._id, name: typed.user.name, staffId: typed.user.staffId, on: [typed.on, ...(fromVisit?.on ?? [])], visitId: fromVisit?.visitId, day: fromVisit?.day };
    by = "form";
  } else if (candidates.length === 1) {
    winner = candidates[0];
  }

  if (!winner) {
    await Intake.updateOne(
      { _id: intake._id },
      {
        $unset: { salesAdminId: 1, salesMatch: 1, ...(candidates.length > 1 ? {} : { salesCandidates: 1 }) },
        ...(candidates.length > 1 ? { $set: { salesCandidates: candidates } } : {}),
      },
    );
    await Visit.updateMany({ intakeId: intake._id }, { $unset: { intakeId: 1, matchedOn: 1, matchedAt: 1 } });
    return;
  }

  await Intake.updateOne(
    { _id: intake._id },
    {
      $set: { salesAdminId: winner.salesAdminId, salesMatch: { by, on: winner.on, ...(winner.visitId ? { visitId: winner.visitId } : {}), at: new Date() } },
      $unset: { salesCandidates: 1 },
    },
  );
  await markVisit(intake._id, winner.visitId, winner.on);
  if (intake.convertedTo) await giveSiteToSales(intake.convertedTo.kind, intake.convertedTo.id, winner.salesAdminId, { onlyIfUnowned: true });
}

/** After a visit is logged or changed: re-match every form it could belong to. */
export async function linkVisitToIntakes(visitId: Types.ObjectId | string): Promise<void> {
  const visit = await Visit.findById(visitId).select({ matchKeys: 1, intakeId: 1 }).lean();
  const ids = new Set<string>(visit?.intakeId ? [String(visit.intakeId)] : []);
  if (visit?.matchKeys.length) {
    const forms = await Intake.find({ matchKeys: { $in: visit.matchKeys }, status: { $ne: "draft" } }).select({ _id: 1 }).limit(20).lean();
    for (const f of forms) ids.add(String(f._id));
  }
  for (const id of ids) await linkIntakeToSales(id);
}

/** The super admin assigns a form to a sales executive (or to nobody). Final: automatic matching won't change it. */
export async function assignIntakeToSales(intakeId: string, salesAdminId: string | null): Promise<{ visitDay?: string }> {
  const intake = await Intake.findById(intakeId).lean();
  if (!intake) throw new Error("Form not found.");
  if (!salesAdminId) {
    await Intake.updateOne({ _id: intake._id }, { $unset: { salesAdminId: 1, salesCandidates: 1 }, $set: { salesMatch: { by: "admin", on: [], at: new Date() } } });
    await Visit.updateMany({ intakeId: intake._id }, { $unset: { intakeId: 1, matchedOn: 1, matchedAt: 1 } });
    return {};
  }
  const exec = new Types.ObjectId(salesAdminId);
  // Their visit to this doctor or clinic, if they logged one.
  const keys = keysFor(intake);
  const visit = keys.length
    ? await Visit.findOne({ salesAdminId: exec, matchKeys: { $in: keys }, $or: [{ intakeId: { $exists: false } }, { intakeId: intake._id }] }).sort({ day: -1 }).lean()
    : null;
  const on = ["assigned by super admin", ...(visit ? matchedFields(visit.matchKeys, keys) : [])];
  await Intake.updateOne(
    { _id: intake._id },
    { $set: { salesAdminId: exec, salesMatch: { by: "admin", on, ...(visit ? { visitId: visit._id } : {}), at: new Date() } }, $unset: { salesCandidates: 1 } },
  );
  await markVisit(intake._id, visit?._id, on);
  if (intake.convertedTo) await giveSiteToSales(intake.convertedTo.kind, intake.convertedTo.id, exec, { onlyIfUnowned: false });
  return { visitDay: visit?.day };
}

/** Link the visit to the form (and unlink any other visit that pointed at it). */
async function markVisit(intakeId: Types.ObjectId, visitId: Types.ObjectId | undefined, on: string[]) {
  await Visit.updateMany({ intakeId, ...(visitId ? { _id: { $ne: visitId } } : {}) }, { $unset: { intakeId: 1, matchedOn: 1, matchedAt: 1 } });
  if (visitId) await Visit.updateOne({ _id: visitId }, { $set: { intakeId, matchedOn: on, matchedAt: new Date() } });
}

/** Make a website (draft or live) the sales executive's: they can then see and edit it. */
export async function giveSiteToSales(
  kind: "doctor" | "clinic" | "hospital",
  siteId: Types.ObjectId | string,
  salesAdminId: Types.ObjectId | null,
  { onlyIfUnowned }: { onlyIfUnowned: boolean },
): Promise<boolean> {
  const exec = salesAdminId ? await Admin.findOne({ _id: salesAdminId, role: "sales" }).select({ name: 1, staffId: 1 }).lean() : null;
  const filter = { _id: siteId, ...(onlyIfUnowned ? { salesAdminId: { $exists: false } } : {}) };
  const update = exec
    ? { $set: { salesAdminId: exec._id, salesExecutive: exec.name, ...(exec.staffId ? { salesExecutiveId: exec.staffId } : {}) } }
    : { $unset: { salesAdminId: 1 } };
  const model = (kind === "doctor" ? DoctorProfile : Establishment) as unknown as typeof DoctorProfile;
  const res = await model.updateOne(filter, update);
  return res.modifiedCount > 0;
}

/** Forms saved before visits existed: give them match keys and match the sent ones. Safe to re-run. */
export async function backfillIntakeSales(): Promise<{ keyed: number; linked: number }> {
  let keyed = 0;
  for (const f of await Intake.find({ matchKeys: { $exists: false } }).select({ kind: 1, data: 1 }).lean()) {
    await Intake.updateOne({ _id: f._id }, { $set: { matchKeys: intakeKeys(f.kind, f.data as Record<string, unknown>) } });
    keyed += 1;
  }
  let linked = 0;
  for (const f of await Intake.find({ status: { $ne: "draft" }, salesMatch: { $exists: false } }).select({ _id: 1 }).lean()) {
    await linkIntakeToSales(f._id);
    if (await Intake.exists({ _id: f._id, salesAdminId: { $exists: true } })) linked += 1;
  }
  return { keyed, linked };
}
