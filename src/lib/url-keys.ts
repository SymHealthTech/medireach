import "server-only";
import { Types } from "mongoose";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Subdomains (amit.medireach.co.in) and short links are one namespace across
 * doctors and clinics/hospitals. Each collection's unique index only covers
 * itself, so every save checks the other collection here. (Canonical slugs
 * don't need this: /[city]/doctor/… and /[city]/clinic/… never collide.)
 */

export type UrlKeyOwner = { kind: "doctor" | "establishment"; id?: string | Types.ObjectId };
export type SharedUrlKey = "subdomain" | "shortSlug";

/** Is `value` already used for this key by any site other than `owner`? */
export async function sharedUrlKeyTaken(key: SharedUrlKey, value: string, owner?: UrlKeyOwner): Promise<boolean> {
  const excl = (kind: UrlKeyOwner["kind"]) =>
    owner?.kind === kind && owner.id ? { _id: { $ne: new Types.ObjectId(String(owner.id)) } } : {};
  const [d, e] = await Promise.all([
    DoctorProfile.exists({ [key]: value, ...excl("doctor") }),
    Establishment.exists({ [key]: value, ...excl("establishment") }),
  ]);
  return Boolean(d || e);
}
