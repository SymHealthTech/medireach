import "server-only";
import { Types } from "mongoose";
import { escapeRegExp } from "@/lib/admin/list";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { Admin } from "@/models/Admin";

/**
 * Who owns a doctor / clinic / hospital website (`salesAdminId`).
 *  - A sales executive's own saves always keep it theirs (name, staff ID and
 *    owner are set to them, whatever the form sent).
 *  - When the super admin picks a sales executive on the Review step, the
 *    website moves to that executive (matched by staff ID, else by name).
 *    A name that isn't a dashboard user leaves it with the super admin only.
 */
type Ownable = {
  salesExecutive?: string;
  salesExecutiveId?: string;
  salesAdminId?: Types.ObjectId;
  set(path: string, value: unknown): unknown;
};

export async function assignSalesOwner(doc: Ownable, admin: CurrentAdmin): Promise<void> {
  if (admin.role === "sales") {
    doc.set("salesExecutive", admin.name);
    doc.set("salesExecutiveId", admin.staffId ?? doc.salesExecutiveId);
    doc.set("salesAdminId", new Types.ObjectId(admin.id));
    return;
  }
  const exec = await findSalesUser(doc.salesExecutive, doc.salesExecutiveId);
  if (exec) {
    doc.set("salesAdminId", exec._id);
    if (exec.staffId) doc.set("salesExecutiveId", exec.staffId);
  } else {
    doc.set("salesAdminId", undefined);
  }
}

/** The sales executive (dashboard user) a Review-step pick refers to: by staff ID first, else by exact name (any case or spacing). */
export async function findSalesUser(name?: string, staffId?: string) {
  const id = staffId?.trim().toUpperCase();
  if (id) {
    const byId = await Admin.findOne({ role: "sales", staffId: id }).select({ _id: 1, staffId: 1, name: 1 }).lean();
    if (byId) return byId;
  }
  const n = name?.replace(/\s+/g, " ").trim();
  if (!n) return null;
  const re = new RegExp(`^\\s*${escapeRegExp(n).replace(/ /g, "\\s+")}\\s*$`, "i");
  const matches = await Admin.find({ role: "sales", name: re }).select({ _id: 1, staffId: 1, name: 1 }).limit(2).lean();
  // Two executives with the same name: only the staff ID can tell them apart.
  return matches.length === 1 ? matches[0]! : null;
}

/** Sales executives to pick from (name and staff ID), A–Z. */
export async function salesTeamOptions(): Promise<{ id: string; name: string; staffId?: string }[]> {
  const team = await Admin.find({ role: "sales" }).select({ name: 1, staffId: 1 }).sort({ name: 1 }).lean();
  return team.map((t) => ({ id: String(t._id), name: t.name, ...(t.staffId ? { staffId: t.staffId } : {}) }));
}
