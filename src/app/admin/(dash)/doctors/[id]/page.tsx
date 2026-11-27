import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorEditor } from "@/components/admin/doctor-editor/DoctorEditor";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { STEPS, type StepKey } from "@/lib/doctors/form";
import { getEditorOptions } from "@/lib/doctors/options";
import { docToForm } from "@/lib/doctors/server";
import { doctorFormHints } from "@/lib/intake/hints-server";
import { DoctorProfile } from "@/models/DoctorProfile";
import { editUnlockUntil } from "@/lib/admin/edit-unlock";
import { assertOwnedPage, isSales } from "@/lib/admin/scope";

export const metadata: Metadata = { title: "Edit doctor" };

export default async function EditDoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const admin = await requireAdminPage(rolesFor("/admin/doctors"));
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  const [doc, options, sp, hints] = await Promise.all([DoctorProfile.findById(id).lean(), getEditorOptions(admin), searchParams, doctorFormHints(id)]);
  // Sales executives open only their own doctors.
  assertOwnedPage(admin, doc);
  const unlockedUntil = isSales(admin) && doc!.status === "published" ? await editUnlockUntil(admin.id, id) : null;
  const step = STEPS.some((s) => s.key === sp.step) ? (sp.step as StepKey) : "basics";

  return (
    <DoctorEditor key={id} initial={docToForm(doc!)} options={options} role={admin.role} initialStep={step} hints={hints} liveUnlockedUntil={unlockedUntil?.toISOString()} />
  );
}
