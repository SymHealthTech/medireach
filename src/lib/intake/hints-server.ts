import "server-only";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ClinicCategory } from "@/models/ClinicCategory";
import { Intake } from "@/models/Intake";
import { withDefaults, type IntakeData } from "./form";
import { doctorHints, siteHints, type DoctorFormHints, type SiteFormHints } from "./hints";

/** The website form a draft was made from (latest, if several). */
async function sourceIntake(id: string | Types.ObjectId) {
  await connectToDatabase();
  return Intake.findOne({ "convertedTo.id": id }).sort({ updatedAt: -1 }).select({ _id: 1, ref: 1, kind: 1, data: 1 }).lean();
}

export async function doctorFormHints(id: string | Types.ObjectId): Promise<DoctorFormHints | undefined> {
  const intake = await sourceIntake(id);
  return intake?.kind === "doctor" ? doctorHints(intake.ref, withDefaults("doctor", intake.data as IntakeData), String(intake._id)) : undefined;
}

export async function siteFormHints(id: string | Types.ObjectId): Promise<SiteFormHints | undefined> {
  const intake = await sourceIntake(id);
  if (!intake || intake.kind === "doctor") return undefined;
  const hints = siteHints(intake.ref, intake.kind, withDefaults(intake.kind, intake.data as IntakeData), String(intake._id));
  // A clinic type from a category added in the dashboard: show its name, not its slug.
  if (hints.category && /^[a-z0-9-]+$/.test(hints.category)) {
    const cat = await ClinicCategory.findOne({ slug: hints.category }).select({ name: 1 }).lean();
    if (cat) hints.category = cat.name;
  }
  return hints;
}
