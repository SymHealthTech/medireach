import "server-only";
import { findSalesUser } from "@/lib/admin/ownership";
import { nextStaffId } from "@/lib/admin/staff";
import { backfillIntakeSales } from "@/lib/visits/match";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * One-time move to "super admin + sales executives" (safe to re-run):
 *  1. the retired "admin" role becomes "superadmin";
 *  2. the email index becomes "unique when present" (sales may have none);
 *  3. every sales executive gets a staff ID to log in with;
 *  4. existing doctors / clinics / hospitals whose Review-step sales executive
 *     is a dashboard user become owned by them (so they see them);
 *  5. website forms get their match keys and are matched to field visits.
 */
export async function migrateDashboardRoles(): Promise<{ promoted: number; staffIds: string[]; owned: number; formsKeyed: number; formsLinked: number }> {
  const promoted = (await Admin.updateMany({ role: "admin" }, { $set: { role: "superadmin" } })).modifiedCount;
  await Admin.syncIndexes();

  const staffIds: string[] = [];
  for (const u of await Admin.find({ role: "sales", staffId: { $exists: false } }).sort({ createdAt: 1 }).select({ _id: 1, name: 1 }).lean()) {
    const staffId = await nextStaffId();
    await Admin.updateOne({ _id: u._id }, { $set: { staffId } });
    staffIds.push(`${u.name}: ${staffId}`);
  }

  let owned = 0;
  const unowned = { salesAdminId: { $exists: false }, salesExecutive: { $exists: true, $nin: [null, ""] } };
  for (const model of [DoctorProfile, Establishment] as const) {
    const docs = await (model as typeof DoctorProfile).find(unowned).select({ salesExecutive: 1, salesExecutiveId: 1 }).lean();
    for (const d of docs) {
      const exec = await findSalesUser(d.salesExecutive, d.salesExecutiveId);
      if (!exec) continue;
      await (model as typeof DoctorProfile).collection.updateOne({ _id: d._id }, { $set: { salesAdminId: exec._id } });
      owned += 1;
    }
  }
  // 5. website forms: match keys, and the sent ones matched to field visits / the staff ID typed on them.
  const forms = await backfillIntakeSales();
  return { promoted, staffIds, owned, formsKeyed: forms.keyed, formsLinked: forms.linked };
}
