import "server-only";
import { Types } from "mongoose";
import { Visit } from "@/models/Visit";
import { Errors } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/api/context";
import { requireDoctorId } from "@/lib/api/context";
import { startOfTodayIST } from "@/lib/time";

/**
 * Receptionist write-permission rule (spec §5.2). A receptionist may edit or
 * delete a patient ONLY while that patient is still "pending" today — i.e. the
 * doctor has not yet confirmed (examined) their visit. The instant a visit is
 * confirmed, the receptionist's access to that patient for the day locks
 * completely. We derive this purely from today's Visit statuses (§5.2 impl note:
 * tie to the Visit status field, no separate flag).
 *
 * Returns the pending draft visit when modification is allowed; throws 403
 * otherwise.
 */
export async function assertReceptionistMayModify(
  ctx: AuthContext,
  patientId: string,
): Promise<void> {
  const doctorId = requireDoctorId(ctx);
  if (!Types.ObjectId.isValid(patientId)) throw Errors.badRequest("Invalid patient id.");

  const since = startOfTodayIST();
  const todaysVisits = await Visit.find({
    doctorId,
    patientId,
    createdAt: { $gte: since },
  })
    .select("status")
    .lean();

  if (todaysVisits.length === 0) {
    // Not in today's queue at all → receptionist has no business editing it.
    throw Errors.forbidden("This patient isn't in today's pending queue.");
  }
  const anyConfirmed = todaysVisits.some((v) => v.status === "confirmed");
  if (anyConfirmed) {
    throw Errors.forbidden("This patient has already been seen and is now locked.");
  }
}
