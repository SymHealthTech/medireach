import "server-only";
import type { Types } from "mongoose";
import type { PaymentPurpose } from "@/lib/constants";
import { addYears, computeRenewalStatus, firstRenewalDue, listRenewalPrice, type RenewalProduct } from "@/lib/renewals";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * What a recorded payment does to the site's renewal (MEDIREACH_BUILD_PROMPT.md, Payment):
 *  - setup / doctor_addon: setupPaidAt = payment date, renewal due one year later
 *  - renewal: due date moves one year on (from the current due date, or the payment date if none);
 *    a lapsed site becomes live again
 * Other purposes (update, domain) don't touch renewals. The renewal price is
 * filled from Settings if the site doesn't have one yet.
 */

export interface RenewalChange {
  target: "doctor" | "establishment";
  id: string;
  before: { setupPaidAt?: Date; renewalDueDate?: Date; renewalStatus?: string };
  after: { setupPaidAt?: Date; renewalDueDate?: Date; renewalStatus: string };
  /** The site was lapsed and is live again (its public pages need refreshing). */
  restored: boolean;
  /** For refreshing the site's public pages. */
  route: { kind: RenewalProduct; citySlug?: string; slug?: string };
}

const SETS_SETUP: readonly PaymentPurpose[] = ["setup", "doctor_addon"];

export function affectsRenewal(purpose: string): boolean {
  return purpose === "renewal" || (SETS_SETUP as readonly string[]).includes(purpose);
}

export async function applyPaymentToRenewal(p: {
  doctorId?: Types.ObjectId | string;
  establishmentId?: Types.ObjectId | string;
  purpose: string;
  date: Date;
}): Promise<RenewalChange | null> {
  if (!affectsRenewal(p.purpose)) return null;
  const doc = p.doctorId
    ? await DoctorProfile.findById(p.doctorId)
    : p.establishmentId
      ? await Establishment.findById(p.establishmentId)
      : null;
  if (!doc) return null;

  const product: RenewalProduct = "kind" in doc && doc.kind ? doc.kind : "doctor";
  const founding = Boolean(doc.founding || ("foundingDoctor" in doc && doc.foundingDoctor));
  const before = { setupPaidAt: doc.setupPaidAt, renewalDueDate: doc.renewalDueDate, renewalStatus: doc.renewalStatus };

  if (p.purpose === "renewal") {
    doc.renewalDueDate = addYears(doc.renewalDueDate ?? p.date, 1);
  } else {
    doc.setupPaidAt = p.date;
    doc.renewalDueDate = firstRenewalDue(p.date);
  }
  if (doc.renewalPrice === undefined || doc.renewalPrice === null) {
    doc.renewalPrice = listRenewalPrice(product, founding, (await getSettings()).prices);
  }
  doc.renewalStatus = computeRenewalStatus(doc.renewalDueDate);
  await doc.save();

  return {
    target: p.doctorId ? "doctor" : "establishment",
    id: String(doc._id),
    before,
    after: { setupPaidAt: doc.setupPaidAt, renewalDueDate: doc.renewalDueDate, renewalStatus: doc.renewalStatus },
    // A payment always leaves the site un-lapsed (computeRenewalStatus never returns "lapsed").
    restored: before.renewalStatus === "lapsed",
    route: { kind: product, citySlug: doc.citySlug, slug: doc.slug },
  };
}
