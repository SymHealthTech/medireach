"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, requiredText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { revalidateMasters } from "@/lib/public/revalidate";
import { masterSlugError, SLUG_RE, slugify } from "@/lib/slug";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Hospital } from "@/models/Hospital";
import { Specialty } from "@/models/Specialty";

const ADMINS = ["superadmin", "admin"] as const;
export type MasterKind = "city" | "area" | "specialty" | "degree" | "council";

const schema = z.object({
  kind: z.enum(["city", "area", "specialty", "degree", "council"]),
  id: objectId.optional(),
  name: requiredText(120, "Name"),
  slug: z.string().trim().toLowerCase().max(100).optional(),
  plural: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  cityId: objectId.optional(),
  description: z.string().trim().max(500).optional(),
});

/** Create or update any master-list entry, with slug rules per kind. */
export const saveMasterAction = adminAction({ schema, roles: ADMINS }, async (input, admin) => {
  const slug = input.slug || slugify(input.name);
  if (!SLUG_RE.test(slug)) throw new ActionError("Use lowercase letters, numbers and hyphens.", { slug: "Invalid slug." });
  if (input.kind === "city" || input.kind === "area" || input.kind === "specialty") {
    const err = masterSlugError(input.kind, slug);
    if (err) throw new ActionError(err, { slug: err });
  }
  const others = input.id ? { _id: { $ne: input.id } } : {};

  let id: string;
  let before: Record<string, unknown> | null = null;
  switch (input.kind) {
    case "city": {
      if (!input.state) throw new ActionError("State is required.", { state: "Required." });
      if (await City.exists({ ...others, slug })) throw new ActionError("That slug is already used by another city.", { slug: "Taken." });
      if (input.id) {
        const old = await City.findById(input.id).lean();
        if (!old) throw new ActionError("City not found.");
        before = { name: old.name, slug: old.slug, state: old.state };
        await City.updateOne({ _id: input.id }, { $set: { name: input.name, slug, state: input.state } });
        // Doctors store the city slug in their URL; keep them in sync.
        if (old.slug !== slug) await DoctorProfile.updateMany({ citySlug: old.slug }, { $set: { citySlug: slug } });
        id = input.id;
      } else {
        id = String((await City.create({ name: input.name, slug, state: input.state }))._id);
      }
      break;
    }
    case "area": {
      if (!input.cityId) throw new ActionError("Choose a city.", { cityId: "Required." });
      if (await Area.exists({ ...others, cityId: input.cityId, slug })) throw new ActionError("That slug is already used in this city.", { slug: "Taken." });
      if (input.id) {
        const old = await Area.findById(input.id).lean();
        before = old ? { name: old.name, slug: old.slug } : null;
        await Area.updateOne({ _id: input.id }, { $set: { name: input.name, slug, cityId: input.cityId } });
        id = input.id;
      } else {
        id = String((await Area.create({ name: input.name, slug, cityId: input.cityId }))._id);
      }
      break;
    }
    case "specialty": {
      if (!input.plural) throw new ActionError("Plural name is required (used in page headings).", { plural: "Required." });
      if (await Specialty.exists({ ...others, slug })) throw new ActionError("That slug is already used.", { slug: "Taken." });
      const doc = { name: input.name, slug, plural: input.plural, description: input.description || undefined };
      if (input.id) {
        const old = await Specialty.findById(input.id).lean();
        before = old ? { name: old.name, slug: old.slug, plural: old.plural } : null;
        await Specialty.updateOne({ _id: input.id }, { $set: doc });
        id = input.id;
      } else {
        id = String((await Specialty.create(doc))._id);
      }
      break;
    }
    case "degree": {
      if (await Degree.exists({ ...others, slug })) throw new ActionError("That degree already exists.", { slug: "Taken." });
      if (input.id) {
        await Degree.updateOne({ _id: input.id }, { $set: { name: input.name, slug } });
        id = input.id;
      } else {
        id = String((await Degree.create({ name: input.name, slug }))._id);
      }
      break;
    }
    case "council": {
      if (await Council.exists({ ...others, slug })) throw new ActionError("That council already exists.", { slug: "Taken." });
      const doc = { name: input.name, slug, state: input.state || undefined };
      if (input.id) {
        await Council.updateOne({ _id: input.id }, { $set: doc });
        id = input.id;
      } else {
        id = String((await Council.create(doc))._id);
      }
      break;
    }
  }
  await audit(auditCtx(admin), `master.${input.kind}.${input.id ? "update" : "create"}`, {
    entity: input.kind,
    entityId: id,
    diff: { before, after: { name: input.name, slug } },
  });
  revalidateMasters();
  return { id };
});

/** Delete an entry only when nothing references it. */
export const deleteMasterAction = adminAction(
  { schema: z.object({ kind: z.enum(["city", "area", "specialty", "degree", "council"]), id: objectId }), roles: ADMINS },
  async ({ kind, id }, admin) => {
    const inUse = async (): Promise<number> => {
      switch (kind) {
        case "city":
          return (await Area.countDocuments({ cityId: id })) + (await DoctorProfile.countDocuments({ "clinics.cityId": id })) + (await Hospital.countDocuments({ cityId: id }));
        case "area":
          return (await DoctorProfile.countDocuments({ "clinics.areaId": id })) + (await Hospital.countDocuments({ areaId: id }));
        case "specialty":
          return DoctorProfile.countDocuments({ $or: [{ primarySpecialtyId: id }, { secondarySpecialtyIds: id }] });
        case "degree":
          return DoctorProfile.countDocuments({ "qualifications.degreeId": id });
        case "council":
          return DoctorProfile.countDocuments({ "registration.councilId": id });
      }
    };
    const n = await inUse();
    if (n > 0) throw new ActionError(`Can't delete: it's used in ${n} place${n === 1 ? "" : "s"}.`);
    const model = { city: City, area: Area, specialty: Specialty, degree: Degree, council: Council }[kind];
    await (model as typeof City).deleteOne({ _id: id });
    await audit(auditCtx(admin), `master.${kind}.delete`, { entity: kind, entityId: id });
    revalidateMasters();
    return { id };
  },
);
