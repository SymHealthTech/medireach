import "server-only";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";
import { UpdateRequest } from "@/models/UpdateRequest";

/**
 * New done-for-you update request (dashboard or doctor's "Request a change").
 * The doctor's first one is free (price 0, marked paid) when `freeUpdateUsed`
 * is false; claiming it is atomic, so two quick requests can't both be free.
 * Returns null when the doctor doesn't exist.
 */
export async function createUpdateRequest(doctorId: string, description: string) {
  const claimed = await DoctorProfile.findOneAndUpdate(
    { _id: doctorId, freeUpdateUsed: { $ne: true } },
    { $set: { freeUpdateUsed: true } },
    { projection: { _id: 1 } },
  ).lean();
  if (!claimed && !(await DoctorProfile.exists({ _id: doctorId }))) return null;
  const free = Boolean(claimed);
  const settings = await getSettings();
  const req = await UpdateRequest.create({
    doctorId,
    description,
    status: "new",
    price: free ? 0 : settings.prices.updatePrice,
    paid: free,
  });
  return { id: String(req._id), free, price: req.price };
}
