import type { Model } from "mongoose";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { Setting, SETTINGS_KEY } from "@/models/Setting";
import { Specialty } from "@/models/Specialty";
import { TemplateSlot } from "@/models/TemplateSlot";
import { AuditLog } from "@/models/AuditLog";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Lead } from "@/models/Lead";
import { Payment } from "@/models/Payment";
import { UpdateRequest } from "@/models/UpdateRequest";
import { ClinicCategory } from "@/models/ClinicCategory";
import { Counter } from "@/models/Counter";
import { Establishment } from "@/models/Establishment";
import { SITE_TEMPLATE_TYPES, TEMPLATE_KEYS } from "@/lib/constants";
import { masterSlugError, slugify, type MasterSlugKind } from "@/lib/slug";
import {
  PUNE_AREAS,
  SEED_CITIES,
  SEED_CLINIC_CATEGORIES,
  SEED_COUNCILS,
  SEED_DEGREES,
  SEED_SPECIALTIES,
  SEED_TEMPLATE_SLOTS,
} from "@/data/masters";

/**
 * Idempotent master-list seed. Uses `$setOnInsert` so existing documents
 * (possibly edited from the dashboard) are never overwritten — re-running only
 * adds what's missing. Requires an open Mongoose connection.
 */

export interface SeedCounts {
  cities: number;
  areas: number;
  specialties: number;
  degrees: number;
  councils: number;
  clinicCategories: number;
  templateSlots: number;
  settings: number;
}

function checkSlug(kind: MasterSlugKind | null, slug: string, label: string): string {
  const err = kind ? masterSlugError(kind, slug) : slug ? null : "empty slug";
  if (err) throw new Error(`Seed slug for ${label} ("${slug}") is invalid: ${err}`);
  return slug;
}

function assertUnique(slugs: string[], what: string): void {
  const seen = new Set<string>();
  for (const s of slugs) {
    if (seen.has(s)) throw new Error(`Duplicate ${what} slug in seed data: ${s}`);
    seen.add(s);
  }
}

/** Upsert docs keyed by `filter`, inserting `doc` only when missing. Returns inserted count. */
async function upsertMany(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are plain seed objects
  model: Model<any>,
  rows: { filter: Record<string, unknown>; doc: Record<string, unknown> }[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await model.bulkWrite(
    rows.map((r) => ({
      updateOne: { filter: r.filter, update: { $setOnInsert: r.doc }, upsert: true },
    })),
    { ordered: false },
  );
  return res.upsertedCount;
}

export async function seedMasters(): Promise<SeedCounts> {
  // Build every portfolio collection's indexes (the seed is the first thing
  // run against a fresh database); unique constraints must exist before upserts.
  await Promise.all(
    [
      City, Area, Specialty, Degree, Council, ClinicCategory, TemplateSlot, Setting, Counter,
      DoctorProfile, Establishment, Payment, UpdateRequest, Lead, AuditLog,
    ].map((m) => (m as Model<unknown>).syncIndexes()),
  );

  const cities = SEED_CITIES.map((c) => ({
    ...c,
    slug: checkSlug("city", slugify(c.name), c.name),
  }));
  assertUnique(cities.map((c) => c.slug), "city");
  const insertedCities = await upsertMany(
    City,
    cities.map((c) => ({ filter: { slug: c.slug }, doc: c })),
  );

  const pune = await City.findOne({ slug: "pune" }).lean();
  if (!pune) throw new Error("Pune city missing after seeding.");
  const areas = PUNE_AREAS.map((name) => ({
    name,
    slug: checkSlug("area", slugify(name), name),
    cityId: pune._id,
  }));
  assertUnique(areas.map((a) => a.slug), "area");
  const insertedAreas = await upsertMany(
    Area,
    areas.map((a) => ({ filter: { cityId: a.cityId, slug: a.slug }, doc: a })),
  );

  const specialties = SEED_SPECIALTIES.map((s) => ({
    name: s.name,
    plural: s.plural,
    slug: checkSlug("specialty", s.slug ?? slugify(s.name), s.name),
  }));
  assertUnique(specialties.map((s) => s.slug), "specialty");
  const insertedSpecialties = await upsertMany(
    Specialty,
    specialties.map((s) => ({ filter: { slug: s.slug }, doc: s })),
  );

  const degrees = SEED_DEGREES.map((d) => ({
    name: d.name,
    slug: checkSlug(null, d.slug ?? slugify(d.name), d.name),
  }));
  assertUnique(degrees.map((d) => d.slug), "degree");
  const insertedDegrees = await upsertMany(
    Degree,
    degrees.map((d) => ({ filter: { slug: d.slug }, doc: d })),
  );

  const councils = SEED_COUNCILS.map((c) => ({
    name: c.name,
    ...(c.state ? { state: c.state } : {}),
    slug: checkSlug(null, c.slug ?? slugify(c.name), c.name),
  }));
  assertUnique(councils.map((c) => c.slug), "council");
  const insertedCouncils = await upsertMany(
    Council,
    councils.map((c) => ({ filter: { slug: c.slug }, doc: c })),
  );

  const categories = SEED_CLINIC_CATEGORIES.map((c) => ({ ...c, slug: checkSlug(null, c.slug, c.name) }));
  assertUnique(categories.map((c) => c.slug), "clinic category");
  const insertedCategories = await upsertMany(
    ClinicCategory,
    categories.map((c) => ({ filter: { slug: c.slug }, doc: c })),
  );

  const slots = SITE_TEMPLATE_TYPES.flatMap((type) =>
    TEMPLATE_KEYS.map((key, i) => ({
      type,
      key,
      name: SEED_TEMPLATE_SLOTS[type][i]!,
      status: key === "classic" ? "ready" : "coming_soon",
      isDefault: key === "classic",
    })),
  );
  const insertedSlots = await upsertMany(
    TemplateSlot,
    slots.map((s) => ({ filter: { type: s.type, key: s.key }, doc: s })),
  );

  const settingsRes = await Setting.updateOne(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return {
    cities: insertedCities,
    areas: insertedAreas,
    specialties: insertedSpecialties,
    degrees: insertedDegrees,
    councils: insertedCouncils,
    clinicCategories: insertedCategories,
    templateSlots: insertedSlots,
    settings: settingsRes.upsertedCount,
  };
}
