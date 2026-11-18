import { Counter } from "@/models/Counter";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Founding offer: the first N customers across ALL products (doctors, clinics,
 * hospitals) get a lifetime discounted renewal. One counter numbers them so
 * "Founding #12" is unique across collections (each collection's unique index
 * only covers itself). Numbers are never reused.
 */

const FOUNDING_COUNTER = "founding";

/** Highest founding number already handed out, across both collections. */
async function highestFoundingNumber(): Promise<number> {
  const top = { foundingNumber: { $type: "number" } };
  const [d, e] = await Promise.all([
    DoctorProfile.findOne(top).sort({ foundingNumber: -1 }).select({ foundingNumber: 1 }).lean(),
    Establishment.findOne(top).sort({ foundingNumber: -1 }).select({ foundingNumber: 1 }).lean(),
  ]);
  return Math.max(d?.foundingNumber ?? 0, e?.foundingNumber ?? 0);
}

/** Next founding number (atomic). The first call seeds the counter from existing data. */
export async function nextFoundingNumber(): Promise<number> {
  if (!(await Counter.exists({ _id: FOUNDING_COUNTER }))) {
    // $max is idempotent, so two first calls racing still agree.
    await Counter.updateOne({ _id: FOUNDING_COUNTER }, { $max: { seq: await highestFoundingNumber() } }, { upsert: true });
  }
  const c = await Counter.findOneAndUpdate({ _id: FOUNDING_COUNTER }, { $inc: { seq: 1 } }, { new: true, upsert: true }).lean();
  return c!.seq;
}

/** Founding customers across all products (for "spots left"). */
export async function countFoundingCustomers(): Promise<number> {
  const [doctors, establishments] = await Promise.all([
    // `foundingDoctor` covers doctors not yet migrated (removed in step 3).
    DoctorProfile.countDocuments({ $or: [{ founding: true }, { foundingDoctor: true }] }),
    Establishment.countDocuments({ founding: true }),
  ]);
  return doctors + establishments;
}
