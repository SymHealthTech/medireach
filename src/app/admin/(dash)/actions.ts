"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { leadScope, ownedScope } from "@/lib/admin/scope";
import { Establishment } from "@/models/Establishment";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Lead } from "@/models/Lead";

/** Global ⌘K search across doctors, clinics/hospitals and leads. Staff only. */

export interface SearchResult {
  id: string;
  type: "doctor" | "clinic" | "hospital" | "lead";
  title: string;
  subtitle?: string;
  href: string;
}

const querySchema = z.string().trim().min(2).max(60);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchAction(raw: string): Promise<SearchResult[]> {
  const admin = await requireAdmin();
  // Sales executives find only their own doctors, sites and leads.
  const own = ownedScope(admin);
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) return [];

  const q = parsed.data;
  const re = new RegExp(escapeRegExp(q), "i");
  const digits = q.replace(/\D/g, "");
  const phoneRe = digits.length >= 4 ? new RegExp(escapeRegExp(digits)) : null;

  const [doctors, leads, establishments] = await Promise.all([
    DoctorProfile.find({
      ...own,
      $or: [
        { firstName: re },
        { lastName: re },
        { displayName: re },
        { slug: re },
        { shortSlug: re },
        { subdomain: re },
        ...(phoneRe ? [{ mobile: phoneRe }, { whatsapp: phoneRe }] : []),
      ],
    })
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, citySlug: 1 })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean(),
    Lead.find({ ...leadScope(admin), $or: [{ name: re }, ...(phoneRe ? [{ phone: phoneRe }] : [])] })
      .select({ name: 1, phone: 1, status: 1 })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Establishment.find({
      ...own,
      $or: [{ name: re }, { slug: re }, { shortSlug: re }, { subdomain: re }, ...(phoneRe ? [{ "contact.phones": phoneRe }, { "contact.emergencyPhone": phoneRe }] : [])],
    })
      .select({ name: 1, kind: 1, status: 1 })
      .sort({ name: 1 })
      .limit(8)
      .lean(),
  ]);

  return [
    ...doctors.map((d) => ({
      id: String(d._id),
      type: "doctor" as const,
      title: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      subtitle: d.status,
      href: `/admin/doctors/${d._id}`,
    })),
    ...leads.map((l) => ({
      id: String(l._id),
      type: "lead" as const,
      title: l.name,
      subtitle: `${l.phone} · ${l.status}`,
      href: `/admin/leads?q=${encodeURIComponent(q)}`,
    })),
    ...establishments.map((e) => ({
      id: String(e._id),
      type: e.kind,
      title: e.name,
      subtitle: e.status,
      href: `/admin/establishments/${e._id}`,
    })),
  ];
}
