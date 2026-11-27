import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake } from "@/models/Intake";

/**
 * Remove the retired visiting card fields from stored documents. The card
 * now always follows the website design, so nothing reads them:
 *
 *  - doctors and clinic/hospital sites: `cardTemplateId` (card layout) and
 *    `cardStyle` (colour code such as "DOC-AMBER");
 *  - website forms (Get started): the applicant's `data.cardStyle` answer.
 *
 * Uses the raw collections because the models no longer have these fields.
 * Only touches documents that still have one; `updatedAt` is left alone, so
 * cached pages and "last edited" dates don't change. Safe to run again.
 * `npm run cleanup:card-fields`.
 */
export async function removeOldCardFields(): Promise<{ doctors: number; establishments: number; intakes: number }> {
  const unsetCard = { $unset: { cardTemplateId: "", cardStyle: "" } };
  const hasCard = { $or: [{ cardTemplateId: { $exists: true } }, { cardStyle: { $exists: true } }] };
  const [doctors, establishments, intakes] = await Promise.all([
    DoctorProfile.collection.updateMany(hasCard, unsetCard),
    Establishment.collection.updateMany(hasCard, unsetCard),
    Intake.collection.updateMany({ "data.cardStyle": { $exists: true } }, { $unset: { "data.cardStyle": "" } }),
  ]);
  return { doctors: doctors.modifiedCount, establishments: establishments.modifiedCount, intakes: intakes.modifiedCount };
}
