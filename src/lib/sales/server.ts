import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { escapeRegExp } from "@/lib/admin/list";
import type { EstablishmentKind } from "@/lib/constants";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

/**
 * Sales executives and the business each one brought in. An executive is a
 * dashboard user, or any name typed as "Other" in a Review step: once a name
 * is saved on a doctor, clinic or hospital it joins the list (and the
 * dropdown), and its page shows everything recorded under it.
 */

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const key = (s: string) => norm(s).toLowerCase();
/** Exact name, any case or spacing. */
const nameFilter = (name: string) => ({ salesExecutive: new RegExp(`^\\s*${escapeRegExp(norm(name)).replace(/ /g, "\\s+")}\\s*$`, "i") });

/** Every executive name: dashboard users (sales first), then names typed on records, A–Z, one per person. */
export async function salesExecutiveNames(): Promise<string[]> {
  await connectToDatabase();
  const [admins, doctorNames, siteNames] = await Promise.all([
    Admin.find({ active: true }).select({ name: 1, role: 1 }).lean(),
    DoctorProfile.distinct("salesExecutive"),
    Establishment.distinct("salesExecutive"),
  ]);
  const team = admins
    .sort((a, b) => Number(b.role === "sales") - Number(a.role === "sales") || a.name.localeCompare(b.name, "en"))
    .map((a) => norm(a.name));
  const typed = [...doctorNames, ...siteNames]
    .filter((n): n is string => typeof n === "string" && norm(n) !== "")
    .map(norm)
    .sort((a, b) => a.localeCompare(b, "en"));
  const seen = new Set<string>();
  return [...team, ...typed].filter((n) => n && !seen.has(key(n)) && seen.add(key(n)));
}

export interface SalesRow {
  name: string;
  /** Their staff ID, from the latest record that has one. */
  staffId?: string;
  isUser: boolean;
  doctors: number;
  clinics: number;
  hospitals: number;
  published: number;
  /** Payments recorded for their doctors and sites (₹). */
  collected: number;
}

interface Owned {
  _id: Types.ObjectId;
  salesExecutive?: string;
  salesExecutiveId?: string;
  status: string;
  updatedAt: Date;
}

async function paymentTotals(doctorIds: Types.ObjectId[], siteIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (doctorIds.length + siteIds.length === 0) return new Map();
  const rows = await Payment.aggregate<{ _id: Types.ObjectId; amount: number }>([
    { $match: { $or: [{ doctorId: { $in: doctorIds } }, { establishmentId: { $in: siteIds } }, { hospitalId: { $in: siteIds } }] } },
    { $group: { _id: { $ifNull: ["$doctorId", { $ifNull: ["$establishmentId", "$hospitalId"] }] }, amount: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.amount]));
}

/** One row per executive (including ones with no business yet), most business first. */
export async function salesSummary(): Promise<SalesRow[]> {
  await connectToDatabase();
  const sel = { salesExecutive: 1, salesExecutiveId: 1, status: 1, updatedAt: 1 } as const;
  const has = { salesExecutive: { $exists: true, $nin: [null, ""] } };
  const [names, admins, doctors, sites] = await Promise.all([
    salesExecutiveNames(),
    Admin.find({ active: true }).select({ name: 1 }).lean(),
    DoctorProfile.find(has).select(sel).lean<Owned[]>(),
    Establishment.find(has).select({ ...sel, kind: 1 }).lean<(Owned & { kind: EstablishmentKind })[]>(),
  ]);
  const paid = await paymentTotals(
    doctors.map((d) => d._id),
    sites.map((s) => s._id),
  );
  const users = new Set(admins.map((a) => key(a.name)));
  const rows = new Map<string, SalesRow>(names.map((n) => [key(n), { name: n, isUser: users.has(key(n)), doctors: 0, clinics: 0, hospitals: 0, published: 0, collected: 0 }]));
  const latestId = new Map<string, { id: string; at: number }>();
  const count = (r: Owned, field: "doctors" | "clinics" | "hospitals") => {
    const k = key(r.salesExecutive ?? "");
    const row = rows.get(k);
    if (!row) return;
    row[field] += 1;
    if (r.status === "published") row.published += 1;
    row.collected += paid.get(String(r._id)) ?? 0;
    const at = new Date(r.updatedAt).getTime();
    if (r.salesExecutiveId && (latestId.get(k)?.at ?? -1) < at) latestId.set(k, { id: r.salesExecutiveId, at });
  };
  doctors.forEach((d) => count(d, "doctors"));
  sites.forEach((s) => count(s, s.kind === "hospital" ? "hospitals" : "clinics"));
  for (const [k, v] of latestId) rows.get(k)!.staffId = v.id;
  return [...rows.values()].sort((a, b) => b.doctors + b.clinics + b.hospitals - (a.doctors + a.clinics + a.hospitals) || a.name.localeCompare(b.name, "en"));
}

export interface SalesItem {
  id: string;
  kind: "doctor" | EstablishmentKind;
  name: string;
  status: string;
  href: string;
  plan?: string;
  staffId?: string;
  createdAt: string;
  setupPaidAt?: string;
  renewalDueDate?: string;
  collected: number;
}

/**
 * Everything recorded under one executive, newest first: by name, plus
 * (for a dashboard user) every website they own. `only: "owned"` is the
 * sales executive's own view: strictly the websites they own.
 */
export async function salesBusiness(name: string, opts: { ownerId?: string; only?: "owned" } = {}): Promise<SalesItem[]> {
  await connectToDatabase();
  const owned = opts.ownerId ? { salesAdminId: new Types.ObjectId(opts.ownerId) } : null;
  const f = opts.only === "owned" && owned ? owned : owned ? { $or: [nameFilter(name), owned] } : nameFilter(name);
  const common = { status: 1, plan: 1, salesExecutiveId: 1, createdAt: 1, setupPaidAt: 1, renewalDueDate: 1 } as const;
  const [doctors, sites] = await Promise.all([
    DoctorProfile.find(f).select({ ...common, title: 1, firstName: 1, lastName: 1, displayName: 1 }).lean(),
    Establishment.find(f).select({ ...common, name: 1, kind: 1 }).lean(),
  ]);
  const paid = await paymentTotals(
    doctors.map((d) => d._id),
    sites.map((s) => s._id),
  );
  const iso = (d?: Date) => (d ? new Date(d).toISOString() : undefined);
  const items: SalesItem[] = [
    ...doctors.map((d) => ({
      id: String(d._id),
      kind: "doctor" as const,
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      status: d.status,
      href: `/admin/doctors/${d._id}`,
      plan: d.plan,
      staffId: d.salesExecutiveId || undefined,
      createdAt: iso(d.createdAt)!,
      setupPaidAt: iso(d.setupPaidAt),
      renewalDueDate: iso(d.renewalDueDate),
      collected: paid.get(String(d._id)) ?? 0,
    })),
    ...sites.map((s) => ({
      id: String(s._id),
      kind: s.kind,
      name: s.name,
      status: s.status,
      href: `/admin/establishments/${s._id}`,
      plan: s.plan,
      staffId: s.salesExecutiveId || undefined,
      createdAt: iso(s.createdAt)!,
      setupPaidAt: iso(s.setupPaidAt),
      renewalDueDate: iso(s.renewalDueDate),
      collected: paid.get(String(s._id)) ?? 0,
    })),
  ];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Same person: names compared ignoring case and spacing. */
export const isSameExecutive = (a: string, b: string) => key(a) === key(b);

/** The name as listed (canonical spelling), or null when nobody has it. */
export async function findSalesExecutive(name: string): Promise<string | null> {
  const names = await salesExecutiveNames();
  return names.find((n) => key(n) === key(name)) ?? null;
}
