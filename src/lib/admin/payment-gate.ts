import "server-only";
import type { Types } from "mongoose";
import { ActionError } from "@/lib/admin/action";
import { UNPAID_FIELD } from "@/lib/constants";
import { Payment } from "@/models/Payment";

/**
 * Websites go live once the setup payment has reached the super admin. A
 * website counts as paid when its setup date is set or any payment is
 * recorded for it. Free, founding and demo sites can still be published: the
 * super admin confirms "publish anyway".
 */
export async function hasPaymentFor(kind: "doctor" | "site", doc: { _id: Types.ObjectId; setupPaidAt?: Date | null }): Promise<boolean> {
  if (doc.setupPaidAt) return true;
  const filter = kind === "doctor" ? { doctorId: doc._id } : { $or: [{ establishmentId: doc._id }, { hospitalId: doc._id }] };
  return Boolean(await Payment.exists(filter));
}

/** Throws the "no payment yet" error the dashboard turns into a confirmation, unless the super admin already confirmed. */
export async function assertPaidOrConfirmed(kind: "doctor" | "site", doc: { _id: Types.ObjectId; setupPaidAt?: Date | null }, allowUnpaid?: boolean): Promise<void> {
  if (allowUnpaid || (await hasPaymentFor(kind, doc))) return;
  throw new ActionError("No payment is recorded for this website yet.", { [UNPAID_FIELD]: "No payment recorded." });
}
