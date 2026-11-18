import type { AnyBulkWriteOperation, Db, Document, ObjectId } from "mongodb";
import { DEFAULT_PRICES, DEFAULT_RENEWAL_GRACE_DAYS, type PriceKey } from "@/lib/constants";
import { computeRenewalStatus, firstRenewalDue, isPastGrace } from "@/lib/renewals";
import { masterSlugError } from "@/lib/slug";

/**
 * Migration v2: doctor-portfolio-only data → three products (doctor portfolio,
 * clinic website, small hospital website) with yearly renewals.
 *
 * Works on raw collections (not the Mongoose models) so it keeps running
 * whatever shape the models have before or after the v2 code ships.
 *
 * Re-runnable: every write only fills fields that are still missing, so a
 * second run changes nothing. Legacy fields are kept unless `dropLegacy` is
 * set, so the old code keeps working if it is still deployed.
 *
 *  1. Settings   prices.gp → prices.doctorSetup, prices.update → prices.updatePrice,
 *                add the other v2 price keys + renewalGraceDays.
 *  2. Hospitals  each `hospitals` doc → `establishments` doc (kind 'hospital',
 *                status 'draft'), reusing the same _id so hospitalId values map 1:1.
 *  3. Doctors    plan gp/consultant → 'doctor', hospital → 'doctor_addon';
 *                foundingDoctor → founding; setupPaidAt from the first setup payment;
 *                renewalDueDate = max(setupPaidAt + 1 year, old hostingFreeUntil date);
 *                renewalPrice from Settings; renewalStatus from the due date;
 *                clinics[].hospitalId → clinics[].establishmentId;
 *                hospitalAccountId (+ clinic links) → establishmentIds.
 *  4. Payments   hospitalId → establishmentId; purpose 'hospital_bulk' → 'doctor_addon'.
 */

export interface MigrateV2Options {
  apply: boolean;
  /** Also $unset the legacy fields (run only after the v2 code is live). */
  dropLegacy?: boolean;
  now?: Date;
}

export interface MigrationChange {
  collection: string;
  id: string;
  label: string;
  set: Record<string, unknown>;
  unset?: string[];
}

export interface MigrateV2Report {
  applied: boolean;
  changes: MigrationChange[];
  /** Things a human should look at (no setup payment, promises that changed, …). */
  warnings: string[];
  counts: Record<string, { scanned: number; changed: number }>;
}

const V2_PRICE_DEFAULTS = DEFAULT_PRICES;
export type V2Prices = Record<PriceKey, number>;

const RENEWAL_GRACE_DAYS_DEFAULT = DEFAULT_RENEWAL_GRACE_DAYS;

const SETTINGS_KEY = "global";
const NEW_DOCTOR_PLANS = ["doctor", "doctor_addon"];
const LEGACY_DOCTOR_PLAN: Record<string, string> = { gp: "doctor", consultant: "doctor", hospital: "doctor_addon" };

const isDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());
const has = (doc: Document, key: string) => doc[key] !== undefined;


function doctorLabel(d: Document): string {
  return [d.title ?? "Dr.", d.firstName, d.lastName].filter(Boolean).join(" ") + ` (${d.status ?? "?"})`;
}

class Collector {
  changes: MigrationChange[] = [];
  warnings: string[] = [];
  counts: MigrateV2Report["counts"] = {};
  private ops = new Map<string, AnyBulkWriteOperation<Document>[]>();
  private inserts = new Map<string, Document[]>();

  scanned(coll: string) {
    (this.counts[coll] ??= { scanned: 0, changed: 0 }).scanned++;
  }

  update(coll: string, id: ObjectId, label: string, set: Record<string, unknown>, unset: string[] = []) {
    if (!Object.keys(set).length && !unset.length) return;
    (this.counts[coll] ??= { scanned: 0, changed: 0 }).changed++;
    this.changes.push({ collection: coll, id: String(id), label, set, ...(unset.length ? { unset } : {}) });
    const update: Document = {};
    if (Object.keys(set).length) update.$set = set;
    if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, ""]));
    const list = this.ops.get(coll) ?? [];
    list.push({ updateOne: { filter: { _id: id }, update } });
    this.ops.set(coll, list);
  }

  insert(coll: string, doc: Document, label: string) {
    (this.counts[coll] ??= { scanned: 0, changed: 0 }).changed++;
    this.changes.push({ collection: coll, id: String(doc._id), label: `insert ${label}`, set: doc });
    const list = this.inserts.get(coll) ?? [];
    list.push(doc);
    this.inserts.set(coll, list);
  }

  async flush(db: Db) {
    for (const [coll, docs] of this.inserts) if (docs.length) await db.collection(coll).insertMany(docs, { ordered: true });
    for (const [coll, ops] of this.ops) if (ops.length) await db.collection(coll).bulkWrite(ops, { ordered: true });
    this.inserts.clear();
    this.ops.clear();
  }
}

// ---------------------------------------------------------------- Settings
async function migrateSettings(db: Db, c: Collector, dropLegacy: boolean): Promise<{ prices: V2Prices; graceDays: number }> {
  const coll = "settings";
  const s = await db.collection(coll).findOne({ key: SETTINGS_KEY });
  const old = (s?.prices ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

  const prices = { ...V2_PRICE_DEFAULTS } as V2Prices;
  const set: Record<string, unknown> = {};
  for (const key of Object.keys(V2_PRICE_DEFAULTS) as (keyof V2Prices)[]) {
    const current = num(old[key]);
    if (current !== undefined) {
      prices[key] = current;
      continue;
    }
    // Carry over what the admin already set under the old names.
    const legacy = key === "doctorSetup" ? num(old.gp) : key === "updatePrice" ? num(old.update) : undefined;
    prices[key] = legacy ?? V2_PRICE_DEFAULTS[key];
    set[`prices.${key}`] = prices[key];
  }
  const graceDays = num(s?.renewalGraceDays) ?? RENEWAL_GRACE_DAYS_DEFAULT;
  if (s?.renewalGraceDays === undefined) set.renewalGraceDays = graceDays;

  if (!s) {
    // No settings doc yet: the app creates one with defaults; nothing to migrate.
    c.warnings.push("settings: no 'global' document found; v2 defaults will be used (run seed:masters).");
    return { prices, graceDays };
  }
  c.scanned(coll);
  if (num(old.consultant) !== undefined && num(old.consultant) !== V2_PRICE_DEFAULTS.clinicSetup) {
    c.warnings.push(`settings: old consultant price ₹${old.consultant} has no v2 equivalent and is not carried over.`);
  }
  const unset = dropLegacy ? ["prices.gp", "prices.consultant", "prices.update"].filter((k) => old[k.slice(7)] !== undefined) : [];
  c.update(coll, s._id as ObjectId, "global settings", set, unset);
  return { prices, graceDays };
}

// --------------------------------------------------------------- Hospitals
async function migrateHospitals(db: Db, c: Collector, prices: V2Prices, dropLegacy: boolean) {
  const hospitals = await db.collection("hospitals").find().toArray();
  if (!hospitals.length) return;
  const existing = new Set(
    (await db.collection("establishments").find({ _id: { $in: hospitals.map((h) => h._id) } }, { projection: { _id: 1 } }).toArray()).map((e) =>
      String(e._id),
    ),
  );
  const cities = new Map((await db.collection("cities").find().toArray()).map((x) => [String(x._id), x]));
  // Seeded by seed:masters; if it isn't there yet the category is left empty for the admin to pick.
  const hospitalCategory = await db.collection("cliniccategories").findOne({ slug: "small-hospital" });
  if (!hospitalCategory) c.warnings.push("establishments: 'small-hospital' category not found (run seed:masters first); categoryId left empty.");

  for (const h of hospitals) {
    c.scanned("hospitals");
    if (existing.has(String(h._id))) continue;

    const linked = await db
      .collection("doctorprofiles")
      .find({ $or: [{ hospitalAccountId: h._id }, { "clinics.hospitalId": h._id }] }, { projection: { _id: 1 } })
      .toArray();
    const city = cities.get(String(h.cityId));
    const notes = [
      h.notes,
      typeof h.pricePerDoctor === "number" ? `Legacy hospital account: ₹${h.pricePerDoctor} per doctor (bulk deal).` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    const doc: Document = {
      _id: h._id,
      kind: "hospital",
      status: "draft",
      name: h.name,
      ...(city?.slug ? { citySlug: city.slug } : {}),
      ...(hospitalCategory ? { categoryId: hospitalCategory._id } : {}),
      themeKey: "small-hospital",
      address: {
        ...(h.address ? { line1: h.address } : {}),
        ...(h.areaId ? { areaId: h.areaId } : {}),
        cityId: h.cityId,
        ...(city?.state ? { state: city.state } : {}),
      },
      contact: { phones: h.phone ? [h.phone] : [], ...(h.email ? { email: h.email } : {}) },
      contactPerson: {
        ...(h.contactPerson ? { name: h.contactPerson } : {}),
        ...(h.phone ? { phone: h.phone } : {}),
        ...(h.email ? { email: h.email } : {}),
      },
      timings: [],
      is24x7: false,
      services: [],
      facilities: [],
      equipment: [],
      departments: [],
      doctors: linked.map((d) => ({ doctorProfileId: d._id })),
      languages: [],
      gallery: [],
      links: {},
      siteTemplateId: "classic",
      cardTemplateId: "classic",
      seo: { noindex: false },
      plan: "hospital",
      founding: false,
      renewalPrice: prices.renewalHospital,
      renewalStatus: "active",
      source: "hospital",
      ...(notes ? { internalNotes: notes } : {}),
      compliance: { issues: [] },
      migratedFrom: { collection: "hospitals", at: new Date() },
      createdAt: h.createdAt ?? new Date(),
      updatedAt: h.updatedAt ?? new Date(),
    };
    c.insert("establishments", doc, `hospital "${h.name}"`);
    c.warnings.push(
      `establishments: "${h.name}" created as a DRAFT hospital site. Old hospital accounts were bulk deals for visiting consultants ` +
        `and may have more than 10 beds; review kind/category/plan before publishing.`,
    );
  }
  if (dropLegacy) c.warnings.push("hospitals: legacy collection left in place (drop it by hand once you're happy).");
}

// ----------------------------------------------------------------- Doctors
async function migrateDoctors(db: Db, c: Collector, prices: V2Prices, graceDays: number, now: Date, dropLegacy: boolean) {
  const doctors = await db.collection("doctorprofiles").find().toArray();

  // Earliest setup payment per doctor → setupPaidAt.
  const setupPayments = await db
    .collection("payments")
    .aggregate<{ _id: ObjectId; first: Date }>([
      { $match: { doctorId: { $exists: true }, purpose: "setup" } },
      { $group: { _id: "$doctorId", first: { $min: "$date" } } },
    ])
    .toArray();
  const firstSetup = new Map(setupPayments.map((p) => [String(p._id), p.first]));

  for (const d of doctors) {
    c.scanned("doctorprofiles");
    const label = doctorLabel(d);
    const set: Record<string, unknown> = {};
    const unset: string[] = [];

    // Plan
    if (!NEW_DOCTOR_PLANS.includes(d.plan)) {
      const mapped = LEGACY_DOCTOR_PLAN[d.plan as string] ?? "doctor";
      set.plan = mapped;
      if (d.plan === "hospital") c.warnings.push(`doctorprofiles: ${label} had plan 'hospital' → 'doctor_addon'; check it belongs to an establishment.`);
    }

    // Founding
    const founding = has(d, "founding") ? Boolean(d.founding) : Boolean(d.foundingDoctor);
    if (!has(d, "founding")) set.founding = founding;

    // Setup date
    let setupPaidAt: Date | undefined = isDate(d.setupPaidAt) ? d.setupPaidAt : undefined;
    if (!setupPaidAt) {
      const first = firstSetup.get(String(d._id));
      if (isDate(first)) {
        setupPaidAt = first;
        set.setupPaidAt = first;
      }
    }

    // Renewal
    if (!has(d, "renewalPrice")) set.renewalPrice = founding ? prices.foundingRenewal : prices.renewalDoctor;

    let due: Date | undefined = isDate(d.renewalDueDate) ? d.renewalDueDate : undefined;
    if (!due && setupPaidAt) {
      due = firstRenewalDue(setupPaidAt);
      // Honour a longer free-hosting promise that was already given.
      if (isDate(d.hostingFreeUntil) && d.hostingFreeUntil > due) due = d.hostingFreeUntil;
      set.renewalDueDate = due;
    }
    if (!due && !setupPaidAt && d.status === "published") {
      c.warnings.push(`doctorprofiles: ${label} is published but has no setup payment; renewalDueDate left empty.`);
    }
    if (d.hostingFreeUntil === null && !has(d, "renewalPrice")) {
      c.warnings.push(
        `doctorprofiles: ${label} was promised free hosting forever (hostingFreeUntil = null); v2 sets renewal ₹${set.renewalPrice}/yr. Confirm before reminders go out.`,
      );
    }
    if (!has(d, "renewalStatus")) {
      // Never 'lapsed' here: that hides a page, which the renewals job decides.
      set.renewalStatus = computeRenewalStatus(due, now);
      if (isPastGrace(due, graceDays, now)) c.warnings.push(`doctorprofiles: ${label} is past the renewal grace period (${due?.toISOString().slice(0, 10)}).`);
    }

    // Links: clinics[].hospitalId → establishmentId, hospitalAccountId → establishmentIds
    const clinics = (d.clinics ?? []) as Document[];
    const ids = [...((d.establishmentIds ?? []) as ObjectId[])];
    const addLink = (id: ObjectId | undefined) => {
      if (id && !ids.some((x) => String(x) === String(id))) ids.push(id);
    };
    clinics.forEach((cl, i) => {
      if (cl.hospitalId && !cl.establishmentId) set[`clinics.${i}.establishmentId`] = cl.hospitalId;
      addLink(cl.hospitalId);
      if (dropLegacy && has(cl, "hospitalId")) unset.push(`clinics.${i}.hospitalId`);
    });
    addLink(d.hospitalAccountId);
    if (ids.length !== (d.establishmentIds ?? []).length) set.establishmentIds = ids;

    if (dropLegacy) {
      for (const k of ["foundingDoctor", "hostingFreeUntil", "hospitalAccountId"]) if (has(d, k)) unset.push(k);
    }
    c.update("doctorprofiles", d._id as ObjectId, label, set, unset);
  }
}

// ---------------------------------------------------------------- Payments
async function migratePayments(db: Db, c: Collector, dropLegacy: boolean) {
  const payments = await db
    .collection("payments")
    .find({ $or: [{ hospitalId: { $exists: true } }, { purpose: "hospital_bulk" }] })
    .toArray();
  for (const p of payments) {
    c.scanned("payments");
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    if (p.hospitalId && !p.establishmentId) set.establishmentId = p.hospitalId;
    if (p.purpose === "hospital_bulk") set.purpose = "doctor_addon";
    if (dropLegacy && has(p, "hospitalId")) unset.push("hospitalId");
    c.update("payments", p._id as ObjectId, `payment ${p.invoiceNo ?? p._id}`, set, unset);
  }
}

// ----------------------------------------------------- Reserved URL words
/** v2 reserves new paths (/designs, /[city]/clinic, …). Flag master slugs that now collide; renaming them changes live URLs, so it's manual. */
async function checkReservedSlugs(db: Db, c: Collector) {
  const [cities, specialties] = await Promise.all([
    db.collection("cities").find({}, { projection: { name: 1, slug: 1 } }).toArray(),
    db.collection("specialties").find({}, { projection: { name: 1, slug: 1 } }).toArray(),
  ]);
  for (const x of cities) {
    const err = masterSlugError("city", String(x.slug));
    if (err) c.warnings.push(`cities: "${x.name}" has slug "${x.slug}", which is now reserved (${err}). Rename it in Master lists.`);
  }
  for (const x of specialties) {
    const err = masterSlugError("specialty", String(x.slug));
    if (err) c.warnings.push(`specialties: "${x.name}" has slug "${x.slug}", which is now reserved (${err}). Rename it in Master lists.`);
  }
}

export async function migrateV2(db: Db, opts: MigrateV2Options): Promise<MigrateV2Report> {
  const now = opts.now ?? new Date();
  const dropLegacy = Boolean(opts.dropLegacy);
  const c = new Collector();

  const { prices, graceDays } = await migrateSettings(db, c, dropLegacy);
  await migrateHospitals(db, c, prices, dropLegacy);
  await migrateDoctors(db, c, prices, graceDays, now, dropLegacy);
  await migratePayments(db, c, dropLegacy);
  await checkReservedSlugs(db, c);

  if (opts.apply) await c.flush(db);
  return { applied: opts.apply, changes: c.changes, warnings: c.warnings, counts: c.counts };
}
