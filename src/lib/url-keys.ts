import "server-only";
import { Types } from "mongoose";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { subdomainError } from "@/lib/slug";

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

/**
 * The first free, valid subdomain among `candidates`, else `candidates[0]`
 * with -2, -3… Used to give every published site its own website address
 * (amit.medireach.co.in), which visiting cards, QR codes and Google show.
 */
export async function freeSubdomain(candidates: string[], owner: UrlKeyOwner): Promise<string | undefined> {
  const valid = [...new Set(candidates)].filter((c) => subdomainError(c) === null);
  for (const c of valid) if (!(await sharedUrlKeyTaken("subdomain", c, owner))) return c;
  const base = valid[0];
  if (!base) return undefined;
  for (let n = 2; n < 200; n++) {
    const c = `${base.slice(0, 36)}-${n}`;
    if (subdomainError(c) === null && !(await sharedUrlKeyTaken("subdomain", c, owner))) return c;
  }
  return undefined;
}
