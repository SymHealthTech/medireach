/** Shared list-page parsing (search params → safe query inputs). */

export const PAGE_SIZE = 20;

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length <= 100 ? s : undefined;
}

export function pageOf(sp: SearchParams): number {
  const n = Number(param(sp, "page"));
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

/** Only accept a value from a known list (filters/sorts never hit the DB raw). */
export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive "contains" regex for a user search string (escaped). */
export function searchRegex(q: string | undefined): RegExp | undefined {
  const t = q?.trim();
  return t ? new RegExp(escapeRegExp(t), "i") : undefined;
}

export const isObjectId = (s: string | undefined): s is string => Boolean(s && /^[a-f0-9]{24}$/i.test(s));
