import "server-only";
import { Types } from "mongoose";
import type { CurrentAdmin } from "@/lib/auth/admin";
import type { EstablishmentKind } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { ensureMasterLists } from "@/lib/masters/server";
import { getSettings } from "@/lib/settings";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";
import type { ThemeKey } from "@/themes/specialty";
import { salesTeam } from "@/lib/doctors/options";

/** Everything the clinic/hospital editor's pickers need, as plain serialisable data. */
export interface EstablishmentEditorOptions {
  cities: { id: string; name: string; slug: string; state: string }[];
  areas: { id: string; name: string; slug: string; cityId: string }[];
  categories: { id: string; name: string; slug: string; kind: EstablishmentKind; defaultThemeKey: ThemeKey }[];
  /** Doctor portfolios that can be linked (any status; drafts show as such). */
  doctors: { id: string; name: string; specialty?: string; status: string; degrees?: string }[];
  templates: { type: "clinic" | "hospital"; key: string; name: string; status: string }[];
  prices: {
    doctorAddon: number;
    renewalClinic: number;
    renewalHospital: number;
    foundingRenewal: number;
    foundingRenewalHospital: number;
    clinicSetup: number;
    hospitalSetup: number;
  };
  /** GST included in recorded payments by default (Settings). */
  gstIncluded: boolean;
  /** Dashboard users, for the sales executive dropdown. */
  team: string[];
  bannedPhrases: string[];
}

/** Editor choices; for a sales executive only their own doctors plus live ones, and only their own name (see doctors/options). */
export async function getEstablishmentEditorOptions(admin?: CurrentAdmin): Promise<EstablishmentEditorOptions> {
  const sales = admin?.role === "sales" ? new Types.ObjectId(admin.id) : null;
  await connectToDatabase();
  await ensureMasterLists();
  const [cities, areas, categories, doctors, specialties, templates, settings] = await Promise.all([
    City.find().sort({ name: 1 }).lean(),
    Area.find().sort({ name: 1 }).lean(),
    ClinicCategory.find().sort({ kind: 1, name: 1 }).lean(),
    DoctorProfile.find(sales ? { $or: [{ salesAdminId: sales }, { status: "published" }] } : {})
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, primarySpecialtyId: 1, status: 1 })
      .sort({ firstName: 1, lastName: 1 })
      .limit(5000)
      .lean(),
    Specialty.find().select({ name: 1 }).lean(),
    TemplateSlot.find({ type: { $in: ["clinic", "hospital"] } }).sort({ type: 1, key: 1 }).lean(),
    getSettings(),
  ]);
  const team = sales ? [admin!.name] : await salesTeam();
  const specName = new Map(specialties.map((s) => [String(s._id), s.name]));
  return {
    cities: cities.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state })),
    areas: areas.map((a) => ({ id: String(a._id), name: a.name, slug: a.slug, cityId: String(a.cityId) })),
    categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, kind: c.kind, defaultThemeKey: c.defaultThemeKey })),
    doctors: doctors.map((d) => ({
      id: String(d._id),
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      status: d.status,
      ...(d.primarySpecialtyId && specName.has(String(d.primarySpecialtyId)) ? { specialty: specName.get(String(d.primarySpecialtyId)) } : {}),
    })),
    templates: templates.map((x) => ({ type: x.type as "clinic" | "hospital", key: x.key, name: x.name, status: x.status })),
    prices: {
      doctorAddon: settings.prices.doctorAddon,
      renewalClinic: settings.prices.renewalClinic,
      renewalHospital: settings.prices.renewalHospital,
      foundingRenewal: settings.prices.foundingRenewal,
      foundingRenewalHospital: settings.prices.foundingRenewalHospital,
      clinicSetup: settings.prices.clinicSetup,
      hospitalSetup: settings.prices.hospitalSetup,
    },
    gstIncluded: settings.gstMode !== "exclusive",
    team,
    bannedPhrases: settings.bannedPhrases,
  };
}
