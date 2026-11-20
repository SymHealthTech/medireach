import "server-only";
import type { Types } from "mongoose";
import { escapeRegExp } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { seedMasterLists } from "@/lib/seed/masters";
import { masterSlugError, slugify } from "@/lib/slug";
import { DEFAULT_CLINIC_THEME, DEFAULT_HOSPITAL_THEME, isThemeKey, type ThemeKey } from "@/themes/specialty";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";

/**
 * Master lists (councils, degrees, specialties, cities, areas, clinic
 * categories, design slots) as the dashboard needs them.
 */

let ensured: Promise<void> | null = null;

/**
 * A fresh database has empty master lists, so every dropdown in the editors
 * is empty. The first dashboard page that needs them fills in the standard
 * lists (only missing entries; nothing edited is overwritten). Runs once per
 * server process.
 */
export function ensureMasterLists(): Promise<void> {
  ensured ??= (async () => {
    await connectToDatabase();
    const counts = await Promise.all([Council, Degree, Specialty, City, ClinicCategory, TemplateSlot].map((m) => (m as typeof Council).estimatedDocumentCount()));
    if (counts.some((n) => n === 0)) await seedMasterLists();
  })().catch((e) => {
    ensured = null; // try again on the next request
    throw e;
  });
  return ensured;
}

/** Masters the admin can add from an editor dropdown ("Other: not in the list"). */
export const QUICK_MASTER_KINDS = ["council", "degree", "specialty", "area", "category"] as const;
export type QuickMasterKind = (typeof QUICK_MASTER_KINDS)[number];

export interface QuickMasterExtra {
  /** Areas: the city. */
  cityId?: string;
  /** Categories: clinic or hospital, and the design new sites of this category start with. */
  establishmentKind?: "clinic" | "hospital";
  themeKey?: string;
}

export class MasterInputError extends Error {}

const exact = (s: string) => new RegExp(`^${escapeRegExp(s.trim())}$`, "i");

/** "Dermatologist" → "Dermatologists"; "Skin Clinic" → "Skin Clinics". */
const pluralOf = (name: string) => (/s$/i.test(name) ? name : /y$/i.test(name) && !/[aeiou]y$/i.test(name) ? `${name.slice(0, -1)}ies` : `${name}s`);

/**
 * The entry with this name (case-insensitive, or the same slug), created if
 * it doesn't exist yet. Used by the editors' "add" option and when a website
 * form becomes a draft, so what the applicant typed lands in the real field.
 */
export async function findOrCreateMaster(kind: QuickMasterKind, rawName: string, extra: QuickMasterExtra = {}): Promise<{ id: string; name: string; created: boolean }> {
  const name = rawName.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!name) throw new MasterInputError("Enter a name.");
  const slug = slugify(name);
  if (!slug) throw new MasterInputError("Use letters or numbers in the name.");
  await connectToDatabase();
  const match = (scope: Record<string, unknown> = {}) => ({ ...scope, $or: [{ name: exact(name) }, { slug }] });
  const out = (doc: { _id: Types.ObjectId; name: string }, created: boolean) => ({ id: String(doc._id), name: doc.name, created });

  switch (kind) {
    case "council": {
      const hit = await Council.findOne(match()).select({ name: 1 }).lean();
      return hit ? out(hit, false) : out(await Council.create({ name, slug }), true);
    }
    case "degree": {
      const hit = await Degree.findOne(match()).select({ name: 1 }).lean();
      return hit ? out(hit, false) : out(await Degree.create({ name, slug }), true);
    }
    case "specialty": {
      const hit = await Specialty.findOne({ $or: [{ name: exact(name) }, { plural: exact(name) }, { slug }] }).select({ name: 1 }).lean();
      if (hit) return out(hit, false);
      const err = masterSlugError("specialty", slug);
      if (err) throw new MasterInputError(err);
      return out(await Specialty.create({ name, slug, plural: pluralOf(name) }), true);
    }
    case "area": {
      if (!extra.cityId) throw new MasterInputError("Choose the city first.");
      const hit = await Area.findOne(match({ cityId: extra.cityId })).select({ name: 1 }).lean();
      if (hit) return out(hit, false);
      const err = masterSlugError("area", slug);
      if (err) throw new MasterInputError(err);
      return out(await Area.create({ name, slug, cityId: extra.cityId }), true);
    }
    case "category": {
      const kindOf = extra.establishmentKind ?? "clinic";
      const hit = await ClinicCategory.findOne(match({ kind: kindOf })).select({ name: 1 }).lean();
      if (hit) return out(hit, false);
      if (await ClinicCategory.exists({ slug })) throw new MasterInputError("A category with this name exists for the other type.");
      const themeKey: ThemeKey = extra.themeKey && isThemeKey(extra.themeKey) ? extra.themeKey : kindOf === "hospital" ? DEFAULT_HOSPITAL_THEME : DEFAULT_CLINIC_THEME;
      return out(await ClinicCategory.create({ name, slug, plural: pluralOf(name), kind: kindOf, defaultThemeKey: themeKey, icon: kindOf === "hospital" ? "hospital" : "stethoscope" }), true);
    }
  }
}
