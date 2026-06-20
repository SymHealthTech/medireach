import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { loadDoctor } from "@/lib/api/account";
import { nextSequence } from "@/models/Counter";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";

// DEV-ONLY: skip payment and activate the account directly. Remove before production.
export const POST = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  if (process.env.NODE_ENV === "production") {
    throw Errors.notFound();
  }

  const doctor = await loadDoctor(ctx);

  if (doctor.accountStatus === "active" && doctor.onboardingStep >= 7) {
    return jsonOk({ ok: true, appId: doctor.appId, alreadyActive: true });
  }

  if (!doctor.appId) {
    doctor.appId = `MR-${(await nextSequence("doctorAppId")).toString().padStart(5, "0")}`;
  }
  doctor.accountStatus = "active";
  doctor.onboardingStep = 7;
  doctor.cycleStartDate = new Date();

  if (!doctor.selectedTemplateId) {
    const template = await PrescriptionTemplate.create({
      doctorId: doctor._id,
      presetKey: "classic",
      logoPlacement: "left",
    });
    doctor.selectedTemplateId = template._id;
  }

  await doctor.save();

  return jsonOk({ ok: true, appId: doctor.appId });
});
