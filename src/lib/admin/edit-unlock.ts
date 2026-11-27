import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { authSecret } from "@/lib/auth/login-link";

/**
 * Owner's code for live sites. A sales executive can't change a published
 * website on their own: they ask for a 6-digit code, which is emailed to the
 * doctor's (or site owner's) login email, and the owner gives it to them only
 * if they agreed to the change. A correct code opens the site for that sales
 * executive for EDIT_UNLOCK_HOURS. The super admin never needs a code.
 *
 * Codes are stored only as an HMAC bound to the sales executive and the site,
 * expire after 10 minutes, and burn after 5 wrong tries (like login codes).
 */

export const EDIT_CODE_TTL_SECONDS = 10 * 60;
export const EDIT_CODE_MAX_ATTEMPTS = 5;
export const EDIT_UNLOCK_HOURS = 2;

type CodeDoc = { _id: string; codeHash: string; expires: Date; attempts: number };
type UnlockDoc = { _id: string; adminId: string; siteId: string; until: Date };

const keyOf = (adminId: string, siteId: string) => `${adminId}:${siteId}`;
const hashCode = (key: string, code: string) => createHmac("sha256", authSecret()).update(`edit:${key}:${code}`).digest("hex");

let indexesReady = false;
async function collections() {
  const m = await connectToDatabase();
  const codes = m.connection.collection<CodeDoc>("edit_unlock_codes");
  const unlocks = m.connection.collection<UnlockDoc>("edit_unlocks");
  if (!indexesReady) {
    await codes.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    await unlocks.createIndex({ until: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    indexesReady = true;
  }
  return { codes, unlocks };
}

/** A new code for this sales executive and site (replaces any earlier one). */
export async function createEditCode(adminId: string, siteId: string): Promise<string> {
  const key = keyOf(adminId, siteId);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { codes } = await collections();
  await codes.updateOne(
    { _id: key },
    { $set: { codeHash: hashCode(key, code), expires: new Date(Date.now() + EDIT_CODE_TTL_SECONDS * 1000), attempts: 0 } },
    { upsert: true },
  );
  return code;
}

/** Check a code; a correct one is used up and opens the site. Returns the unlock's end, or null. */
export async function redeemEditCode(adminId: string, siteId: string, code: string): Promise<Date | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const key = keyOf(adminId, siteId);
  const { codes, unlocks } = await collections();
  const doc = await codes.findOne({ _id: key });
  if (!doc) return null;
  if (doc.expires.getTime() <= Date.now() || doc.attempts >= EDIT_CODE_MAX_ATTEMPTS) {
    await codes.deleteOne({ _id: key });
    return null;
  }
  const a = Buffer.from(doc.codeHash, "hex");
  const b = Buffer.from(hashCode(key, code), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    const after = await codes.findOneAndUpdate({ _id: key }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
    if (after && after.attempts >= EDIT_CODE_MAX_ATTEMPTS) await codes.deleteOne({ _id: key });
    return null;
  }
  const taken = await codes.deleteOne({ _id: key, codeHash: doc.codeHash });
  if (taken.deletedCount !== 1) return null;
  const until = new Date(Date.now() + EDIT_UNLOCK_HOURS * 3600_000);
  await unlocks.updateOne({ _id: key }, { $set: { adminId, siteId, until } }, { upsert: true });
  return until;
}

/** When this sales executive's access to a live site ends, or null if they have none. */
export async function editUnlockUntil(adminId: string, siteId: string): Promise<Date | null> {
  const { unlocks } = await collections();
  const doc = await unlocks.findOne({ _id: keyOf(adminId, siteId) });
  return doc && doc.until.getTime() > Date.now() ? doc.until : null;
}

export async function hasEditUnlock(adminId: string, siteId: string): Promise<boolean> {
  return (await editUnlockUntil(adminId, siteId)) !== null;
}

/** End access early (e.g. after the site is deleted). */
export async function clearEditUnlocks(siteId: string): Promise<void> {
  const { codes, unlocks } = await collections();
  await Promise.all([unlocks.deleteMany({ siteId }), codes.deleteMany({ _id: { $regex: `:${siteId}$` } })]);
}
