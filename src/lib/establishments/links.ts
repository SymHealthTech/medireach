import "server-only";
import { Types } from "mongoose";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Doctor ↔ establishment links are stored on both sides
 * (DoctorProfile.establishmentIds and Establishment.doctors[].doctorProfileId).
 * After a doctor's links change, bring the establishments in line:
 * newly linked ones gain a doctors entry, unlinked ones lose it (and the
 * doctor is taken out of their departments).
 */
export async function syncEstablishmentDoctors(
  doctorId: Types.ObjectId | string,
  before: readonly string[],
  after: readonly string[],
): Promise<void> {
  const id = new Types.ObjectId(String(doctorId));
  const was = new Set(before);
  const now = new Set(after);
  const added = [...now].filter((x) => !was.has(x)).map((x) => new Types.ObjectId(x));
  const removed = [...was].filter((x) => !now.has(x)).map((x) => new Types.ObjectId(x));

  await Promise.all([
    added.length
      ? Establishment.updateMany(
          { _id: { $in: added }, "doctors.doctorProfileId": { $ne: id } },
          { $push: { doctors: { doctorProfileId: id } } },
        )
      : null,
    removed.length
      ? Establishment.updateMany(
          { _id: { $in: removed } },
          { $pull: { doctors: { doctorProfileId: id }, "departments.$[].doctorIds": id } },
        )
      : null,
  ]);
}

/**
 * The other direction: after a clinic/hospital's Doctors step changes, link
 * newly added doctors to it and unlink removed ones (including the
 * "Practises at" link on their clinic entry).
 */
export async function syncDoctorLinksFromEstablishment(
  establishmentId: Types.ObjectId | string,
  before: readonly string[],
  after: readonly string[],
): Promise<void> {
  const id = new Types.ObjectId(String(establishmentId));
  const was = new Set(before);
  const now = new Set(after);
  const added = [...now].filter((x) => !was.has(x)).map((x) => new Types.ObjectId(x));
  const removed = [...was].filter((x) => !now.has(x)).map((x) => new Types.ObjectId(x));

  await Promise.all([
    added.length ? DoctorProfile.updateMany({ _id: { $in: added } }, { $addToSet: { establishmentIds: id } }) : null,
    removed.length
      ? DoctorProfile.updateMany(
          { _id: { $in: removed } },
          { $pull: { establishmentIds: id }, $unset: { "clinics.$[c].establishmentId": "" } },
          { arrayFilters: [{ "c.establishmentId": id }] },
        )
      : null,
  ]);
}
