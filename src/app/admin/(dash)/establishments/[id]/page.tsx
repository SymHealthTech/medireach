import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstablishmentEditor } from "@/components/admin/establishment-editor/EstablishmentEditor";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { STEPS, type StepKey } from "@/lib/establishments/form";
import { getEstablishmentEditorOptions } from "@/lib/establishments/options";
import { docToForm } from "@/lib/establishments/server";
import { siteFormHints } from "@/lib/intake/hints-server";
import { Establishment } from "@/models/Establishment";

export const metadata: Metadata = { title: "Edit clinic or hospital" };

export default async function EditEstablishmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/establishments"));
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  await connectToDatabase();
  const [doc, options, sp, hints] = await Promise.all([Establishment.findById(id).lean(), getEstablishmentEditorOptions(), searchParams, siteFormHints(id)]);
  if (!doc) notFound();
  const step = STEPS.some((s) => s.key === sp.step) ? (sp.step as StepKey) : "basics";
  return <EstablishmentEditor key={id} initial={docToForm(doc)} options={options} role={admin.role} initialStep={step} hints={hints} />;
}
