import type { Metadata } from "next";
import { EstablishmentEditor } from "@/components/admin/establishment-editor/EstablishmentEditor";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { emptyEstablishmentForm, STEPS, type StepKey } from "@/lib/establishments/form";
import { getEstablishmentEditorOptions } from "@/lib/establishments/options";
import { siteFormHints } from "@/lib/intake/hints-server";
import { docToForm } from "@/lib/establishments/server";
import { Establishment } from "@/models/Establishment";
import { DEFAULT_HOSPITAL_CATEGORY } from "@/data/masters";

export const metadata: Metadata = { title: "New clinic or hospital" };

/**
 * New clinic or hospital (?kind=clinic|hospital). Once the draft exists the URL
 * becomes /admin/establishments/new?id=… (same route, so the editor keeps its
 * state); reloading that URL resumes it.
 */
export default async function NewEstablishmentPage({ searchParams }: { searchParams: Promise<{ kind?: string; id?: string; step?: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/establishments"));
  const [{ kind, id, step }, options] = await Promise.all([searchParams, getEstablishmentEditorOptions()]);
  await connectToDatabase();

  if (isObjectId(id)) {
    const existing = await Establishment.findById(id).lean();
    if (existing) {
      const initialStep = STEPS.some((s) => s.key === step) ? (step as StepKey) : "basics";
      return <EstablishmentEditor initial={docToForm(existing)} options={options} role={admin.role} initialStep={initialStep} hints={await siteFormHints(existing._id)} />;
    }
  }

  const form = emptyEstablishmentForm(kind === "hospital" ? "hospital" : "clinic");
  const pune = options.cities.find((c) => c.slug === "pune");
  if (pune) form.address = { ...form.address, cityId: pune.id, state: pune.state };
  if (form.kind === "hospital") {
    const hospitalCategory = options.categories.find((c) => c.slug === DEFAULT_HOSPITAL_CATEGORY) ?? options.categories.find((c) => c.kind === "hospital");
    if (hospitalCategory) form.categoryId = hospitalCategory.id;
  }
  return <EstablishmentEditor initial={form} options={options} role={admin.role} />;
}
