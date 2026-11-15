import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { Hospital } from "@/models/Hospital";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";

/** Everything the doctor editor's dropdowns need, as plain serialisable data. */
export interface EditorOptions {
  cities: { id: string; name: string; slug: string; state: string }[];
  areas: { id: string; name: string; slug: string; cityId: string }[];
  specialties: { id: string; name: string; slug: string; plural: string }[];
  degrees: { id: string; name: string }[];
  councils: { id: string; name: string; state?: string }[];
  hospitals: { id: string; name: string; cityId: string; areaId?: string; address?: string; phone?: string }[];
  templates: { type: "portfolio" | "card"; key: string; name: string; status: string; previewUrl?: string }[];
  bannedPhrases: string[];
}

export async function getEditorOptions(): Promise<EditorOptions> {
  await connectToDatabase();
  const [cities, areas, specialties, degrees, councils, hospitals, templates, settings] = await Promise.all([
    City.find().sort({ name: 1 }).lean(),
    Area.find().sort({ name: 1 }).lean(),
    Specialty.find().sort({ name: 1 }).lean(),
    Degree.find().sort({ name: 1 }).lean(),
    Council.find().sort({ name: 1 }).lean(),
    Hospital.find().sort({ name: 1 }).lean(),
    TemplateSlot.find().sort({ type: 1, key: 1 }).lean(),
    getSettings(),
  ]);
  return {
    cities: cities.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state })),
    areas: areas.map((a) => ({ id: String(a._id), name: a.name, slug: a.slug, cityId: String(a.cityId) })),
    specialties: specialties.map((s) => ({ id: String(s._id), name: s.name, slug: s.slug, plural: s.plural })),
    degrees: degrees.map((d) => ({ id: String(d._id), name: d.name })),
    councils: councils.map((c) => ({ id: String(c._id), name: c.name, ...(c.state ? { state: c.state } : {}) })),
    hospitals: hospitals.map((h) => ({
      id: String(h._id),
      name: h.name,
      cityId: String(h.cityId),
      ...(h.areaId ? { areaId: String(h.areaId) } : {}),
      ...(h.address ? { address: h.address } : {}),
      ...(h.phone ? { phone: h.phone } : {}),
    })),
    templates: templates.map((t) => ({
      type: t.type,
      key: t.key,
      name: t.name,
      status: t.status,
      ...(t.previewImage?.url ? { previewUrl: t.previewImage.url } : {}),
    })),
    bannedPhrases: settings.bannedPhrases,
  };
}
