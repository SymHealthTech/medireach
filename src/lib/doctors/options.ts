import "server-only";
import { connectToDatabase } from "@/lib/db";
import { ensureMasterLists } from "@/lib/masters/server";
import { getSettings } from "@/lib/settings";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import type { EstablishmentKind } from "@/lib/constants";
import { Establishment } from "@/models/Establishment";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";
import { Admin } from "@/models/Admin";

/** Everything the doctor editor's dropdowns need, as plain serialisable data. */
export interface EditorOptions {
  cities: { id: string; name: string; slug: string; state: string }[];
  areas: { id: string; name: string; slug: string; cityId: string }[];
  specialties: { id: string; name: string; slug: string; plural: string }[];
  degrees: { id: string; name: string }[];
  councils: { id: string; name: string; state?: string }[];
  /** Clinics and hospitals with a MediReach site (for linking doctors). */
  establishments: {
    id: string;
    name: string;
    kind: EstablishmentKind;
    cityId?: string;
    areaId?: string;
    address?: string;
    address2?: string;
    pincode?: string;
    phone?: string;
  }[];
  /** Prices from Settings (the Review step pre-fills payments and renewals from these). */
  prices: { renewalDoctor: number; foundingRenewal: number; doctorSetup: number; doctorAddon: number };
  /** GST included in recorded payments by default (Settings). */
  gstIncluded: boolean;
  /** Dashboard users, for the sales executive dropdown. */
  team: string[];
  templates: { type: "portfolio" | "card"; key: string; name: string; status: string; previewUrl?: string }[];
  bannedPhrases: string[];
}

export async function getEditorOptions(): Promise<EditorOptions> {
  await connectToDatabase();
  await ensureMasterLists();
  const [cities, areas, specialties, degrees, councils, establishments, templates, settings] = await Promise.all([
    City.find().sort({ name: 1 }).lean(),
    Area.find().sort({ name: 1 }).lean(),
    Specialty.find().sort({ name: 1 }).lean(),
    Degree.find().sort({ name: 1 }).lean(),
    Council.find().sort({ name: 1 }).lean(),
    Establishment.find().sort({ name: 1 }).select({ name: 1, kind: 1, address: 1, "contact.phones": 1 }).lean(),
    TemplateSlot.find().sort({ type: 1, key: 1 }).lean(),
    getSettings(),
  ]);
  const team = await salesTeam();
  return {
    cities: cities.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state })),
    areas: areas.map((a) => ({ id: String(a._id), name: a.name, slug: a.slug, cityId: String(a.cityId) })),
    specialties: specialties.map((s) => ({ id: String(s._id), name: s.name, slug: s.slug, plural: s.plural })),
    degrees: degrees.map((d) => ({ id: String(d._id), name: d.name })),
    councils: councils.map((c) => ({ id: String(c._id), name: c.name, ...(c.state ? { state: c.state } : {}) })),
    establishments: establishments.map((e) => ({
      id: String(e._id),
      name: e.name,
      kind: e.kind,
      ...(e.address?.cityId ? { cityId: String(e.address.cityId) } : {}),
      ...(e.address?.areaId ? { areaId: String(e.address.areaId) } : {}),
      ...(e.address?.line1 ? { address: e.address.line1 } : {}),
      ...(e.address?.line2 ? { address2: e.address.line2 } : {}),
      ...(e.address?.pincode ? { pincode: e.address.pincode } : {}),
      ...(e.contact?.phones?.[0] ? { phone: e.contact.phones[0] } : {}),
    })),
    prices: {
      renewalDoctor: settings.prices.renewalDoctor,
      foundingRenewal: settings.prices.foundingRenewal,
      doctorSetup: settings.prices.doctorSetup,
      doctorAddon: settings.prices.doctorAddon,
    },
    gstIncluded: settings.gstMode !== "exclusive",
    team,
    // Doctors only pick portfolio and card designs (clinic/hospital slots belong to establishments).
    templates: templates.flatMap((t) => (t.type === "portfolio" || t.type === "card" ? [t] : [])).map((t) => ({
      type: t.type as "portfolio" | "card",
      key: t.key,
      name: t.name,
      status: t.status,
      ...(t.previewImage?.url ? { previewUrl: t.previewImage.url } : {}),
    })),
    bannedPhrases: settings.bannedPhrases,
  };
}

/** Dashboard users for the "Sales executive" dropdown: sales first, then A–Z. */
export async function salesTeam(): Promise<string[]> {
  const admins = await Admin.find({ active: true }).select({ name: 1, role: 1 }).lean();
  return admins
    .sort((a, b) => Number(b.role === "sales") - Number(a.role === "sales") || a.name.localeCompare(b.name, "en"))
    .map((a) => a.name)
    .filter((n, i, all) => n && all.indexOf(n) === i);
}
