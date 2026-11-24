import "server-only";
import { connectToDatabase } from "@/lib/db";
import { ensureMasterLists } from "@/lib/masters/server";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { ClinicCategory } from "@/models/ClinicCategory";
import { hospitalTypeFor } from "./form";

/**
 * City name → its area names (A–Z), from the same master lists the admin
 * editors use, for the website forms' city and area dropdowns. Areas added in
 * the dashboard show up here too.
 */
export async function intakePlaces(): Promise<Record<string, string[]>> {
  await connectToDatabase();
  await ensureMasterLists();
  const [cities, areas] = await Promise.all([City.find().select({ name: 1 }).sort({ name: 1 }).lean(), Area.find().select({ name: 1, cityId: 1 }).sort({ name: 1 }).lean()]);
  return Object.fromEntries(cities.map((c) => [c.name, areas.filter((a) => String(a.cityId) === String(c._id)).map((a) => a.name)]));
}

/**
 * Clinic or hospital types for the website form: the live categories, then
 * Other. Categories added in the dashboard show up here too. Values are the
 * category slug, except the built-in hospital types, which keep their short
 * form values ("maternity") so saved forms and the design picker still match.
 */
export async function intakeSiteTypes(kind: "clinic" | "hospital"): Promise<{ value: string; label: string }[]> {
  await connectToDatabase();
  await ensureMasterLists();
  const cats = await ClinicCategory.find({ kind }).select({ name: 1, slug: 1 }).sort({ name: 1 }).lean();
  return [...cats.map((c) => ({ value: (kind === "hospital" && hospitalTypeFor(c.slug)) || c.slug, label: c.name })), { value: "other", label: "Other" }];
}
