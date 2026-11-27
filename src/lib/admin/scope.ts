import "server-only";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import { ActionError } from "@/lib/admin/action";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { hasEditUnlock } from "@/lib/admin/edit-unlock";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * What a dashboard user may see and touch. The super admin sees everything.
 * A sales executive sees only the doctors, clinics and hospitals they own
 * (`salesAdminId`), the leads they added, and the website forms made into
 * their sites. Every list query and every action on one record goes through
 * here, so the rules live in one place.
 */

export const isSales = (admin: CurrentAdmin) => admin.role === "sales";
const oid = (id: string) => new Types.ObjectId(id);

/** Mongo filter for doctors / clinics / hospitals this user can see. */
export function ownedScope(admin: CurrentAdmin): Record<string, unknown> {
  return isSales(admin) ? { salesAdminId: oid(admin.id) } : {};
}

/** Mongo filter for leads this user can see. */
export function leadScope(admin: CurrentAdmin): Record<string, unknown> {
  return isSales(admin) ? { createdBy: oid(admin.id) } : {};
}

/**
 * Mongo filter for website forms this user can see: a sales executive only
 * the forms matched or assigned to them (lib/visits/match.ts) and the forms
 * made into their own sites.
 */
export async function intakeScope(admin: CurrentAdmin): Promise<Record<string, unknown>> {
  if (!isSales(admin)) return {};
  const mine = { salesAdminId: oid(admin.id) };
  const [doctors, sites] = await Promise.all([DoctorProfile.find(mine).distinct("_id"), Establishment.find(mine).distinct("_id")]);
  // Inside $and, so a page's own $or (search) can sit next to it.
  return { $and: [{ $or: [mine, { "convertedTo.id": { $in: [...doctors, ...sites] } }] }] };
}

type Owned = { salesAdminId?: Types.ObjectId | null; status: string; publishedAt?: Date | null };

export const ownsRecord = (admin: CurrentAdmin, doc: Pick<Owned, "salesAdminId">) => !isSales(admin) || String(doc.salesAdminId ?? "") === admin.id;

/** For pages: 404 when a sales executive opens someone else's record (no hint that it exists). */
export function assertOwnedPage(admin: CurrentAdmin, doc: Pick<Owned, "salesAdminId"> | null): void {
  if (!doc || !ownsRecord(admin, doc)) notFound();
}

/** For actions: same rule, as a user-facing error. */
export function assertOwned(admin: CurrentAdmin, doc: Pick<Owned, "salesAdminId"> | null, what = "website"): void {
  if (!doc || !ownsRecord(admin, doc)) throw new ActionError(`This ${what} was not found.`);
}

/** May this user change a live (published) site right now? Super admin: always. Sales: only with the owner's code (an active unlock). */
export async function canEditLive(admin: CurrentAdmin, siteId: string): Promise<boolean> {
  return !isSales(admin) || hasEditUnlock(admin.id, siteId);
}

/** Before a save: owner check, plus the code check for live sites. */
export async function assertCanEdit(admin: CurrentAdmin, doc: Owned & { _id: Types.ObjectId }, what: "page" | "site"): Promise<void> {
  assertOwned(admin, doc, what === "page" ? "doctor" : "clinic or hospital");
  if (doc.status === "published" && !(await canEditLive(admin, String(doc._id)))) {
    throw new ActionError(`This ${what} is live. Ask the owner for the code we email them, enter it on the editor, then save again.`);
  }
}

/** Sales executives may delete only their own work that was never published. */
export function assertCanDelete(admin: CurrentAdmin, doc: Owned): void {
  assertOwned(admin, doc);
  if (isSales(admin) && (doc.status === "published" || doc.publishedAt)) {
    throw new ActionError("A website that has been published can't be deleted by a sales executive. Ask the super admin.");
  }
}
