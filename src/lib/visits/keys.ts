/**
 * Identity keys shared by field visits and website forms. A visit records
 * three confirming fields: the doctor's name, the clinic / hospital name and
 * the mobile number. A form matches a visit when any key is the same:
 *
 *   "m:9876543210"         mobile (last 10 digits)
 *   "n:amit kulkarni"      doctor's name, without "Dr." or punctuation
 *   "c:shah skin clinic"   clinic / hospital name
 */

export const MATCH_FIELD_LABEL = { m: "mobile", n: "doctor name", c: "clinic name" } as const;
type KeyType = keyof typeof MATCH_FIELD_LABEL;

/** "Dr. Amit  S. Kulkarni" → "amit s kulkarni". */
export function normName(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .toLowerCase()
    .replace(/^\s*(dr|doctor)\.?\s+/, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

/** Every 10-digit Indian mobile in a string ("+91 98765 43210, 020-2567…" → ["9876543210"]). */
export function mobilesIn(s: unknown): string[] {
  if (typeof s !== "string") return [];
  return s
    .split(/[,;/]|\bor\b/)
    .map((part) => part.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
    .filter((d) => /^[6-9]\d{9}$/.test(d));
}

const key = (type: KeyType, value: string) => (value ? `${type}:${value}` : "");
const uniq = (keys: string[]) => [...new Set(keys.filter((k) => k.length > 2))];

/** Keys for a field visit. Names shorter than 3 letters are too vague to match on. */
export function visitKeys(v: { doctorName?: string; clinicName?: string; mobile?: string }): string[] {
  const n = normName(v.doctorName);
  const c = normName(v.clinicName);
  return uniq([...mobilesIn(v.mobile).map((m) => key("m", m)), n.length >= 3 ? key("n", n) : "", c.length >= 3 ? key("c", c) : ""]);
}

const rowsOf = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object") : []);

/** Keys for a website form: its doctor(s), clinic / hospital name(s) and mobile numbers. */
export function intakeKeys(kind: "doctor" | "clinic" | "hospital", data: Record<string, unknown>): string[] {
  const names: string[] = [];
  const clinics: string[] = [];
  const phones: string[] = [...mobilesIn(data.mobile), ...mobilesIn(data.whatsapp)];
  if (kind === "doctor") {
    names.push(normName(data.fullName));
    for (const c of rowsOf(data.clinics)) {
      clinics.push(normName(c.name));
      phones.push(...mobilesIn(c.phone));
    }
    for (const h of rowsOf(data.visiting)) clinics.push(normName(h.name));
  } else {
    clinics.push(normName(data.name));
    names.push(normName(data.contactName));
    for (const d of rowsOf(data.doctors)) names.push(normName(d.name));
    phones.push(...mobilesIn(data.phones));
  }
  return uniq([...phones.map((m) => key("m", m)), ...names.filter((n) => n.length >= 3).map((n) => key("n", n)), ...clinics.filter((c) => c.length >= 3).map((c) => key("c", c))]);
}

/** "mobile", "doctor name"… for the keys two records share. */
export function matchedFields(a: string[], b: string[]): string[] {
  const shared = new Set(a.filter((k) => b.includes(k)).map((k) => k.slice(0, 1) as KeyType));
  return (["m", "n", "c"] as const).filter((t) => shared.has(t)).map((t) => MATCH_FIELD_LABEL[t]);
}
