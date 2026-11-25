import type { Model } from "mongoose";
import { Counter } from "@/models/Counter";

/**
 * Website UIDs: a permanent reference number for every website, one series per
 * product: doctors "MRD-100001", clinics "MRC-100001", hospitals "MRH-100001".
 * Assigned once (on first save, or by `backfillUids`) and never editable, so
 * the team can always find and act on a website by its UID even after the
 * owner has changed everything else. Shown to the owner in their dashboard and
 * in the welcome messages.
 */

export type UidKind = "doctor" | "clinic" | "hospital";

export const UID_PREFIX: Record<UidKind, string> = { doctor: "MRD", clinic: "MRC", hospital: "MRH" };
const FIRST = 100_000;

export const UID_RE = /^MR[DCH]-\d{6,}$/;

/** "mrd 100023", "MRD100023" → "MRD-100023" (for search boxes); null if it isn't a UID. */
export function normalizeUid(input: string): string | null {
  const m = input.trim().toUpperCase().match(/^(MR[DCH])[-\s]?(\d{6,})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** Next UID in a series (atomic counter "uid:doctor" etc.). */
export async function nextUid(kind: UidKind): Promise<string> {
  const c = await Counter.findOneAndUpdate({ _id: `uid:${kind}` }, { $inc: { seq: 1 } }, { new: true, upsert: true }).lean();
  return `${UID_PREFIX[kind]}-${FIRST + c!.seq}`;
}

/**
 * Give every document without a UID one, oldest first. Cheap when there is
 * nothing to do (one indexed query), so list pages call it on load.
 */
export async function backfillUidsIn(model: Model<{ uid?: string; createdAt: Date }>, kindOf: (doc: Record<string, unknown>) => UidKind): Promise<number> {
  const missing = await model.find({ uid: { $exists: false } }).sort({ createdAt: 1 }).select({ _id: 1, kind: 1 }).lean();
  let n = 0;
  for (const d of missing) {
    const uid = await nextUid(kindOf(d as Record<string, unknown>));
    // The raw collection: Mongoose drops updates to immutable paths.
    const res = await model.collection.updateOne({ _id: d._id, uid: { $exists: false } }, { $set: { uid } });
    n += res.modifiedCount;
  }
  return n;
}

/** UIDs for doctors, clinics and hospitals that don't have one yet. */
export async function backfillUids(): Promise<number> {
  const [{ DoctorProfile }, { Establishment }] = await Promise.all([import("@/models/DoctorProfile"), import("@/models/Establishment")]);
  const doctors = await backfillUidsIn(DoctorProfile as never, () => "doctor");
  const sites = await backfillUidsIn(Establishment as never, (d) => (d.kind === "hospital" ? "hospital" : "clinic"));
  return doctors + sites;
}

/** The document's UID, giving it one first if it has none (older records). */
export async function ensureUid(model: Model<{ uid?: string }>, doc: { _id: unknown; uid?: string }, kind: UidKind): Promise<string> {
  if (doc.uid) return doc.uid;
  const uid = await nextUid(kind);
  await model.collection.updateOne({ _id: doc._id as never, uid: { $exists: false } }, { $set: { uid } });
  const saved = await model.collection.findOne({ _id: doc._id as never }, { projection: { uid: 1 } });
  return (saved?.uid as string | undefined) ?? uid;
}
