import type { Metadata } from "next";
import { DoctorEditor } from "@/components/admin/doctor-editor/DoctorEditor";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { emptyClinic, emptyDoctorForm, STEPS, type StepKey } from "@/lib/doctors/form";
import { docToForm } from "@/lib/doctors/server";
import { doctorFormHints } from "@/lib/intake/hints-server";
import { DoctorProfile } from "@/models/DoctorProfile";
import { getEditorOptions } from "@/lib/doctors/options";
import { Establishment } from "@/models/Establishment";
import { Lead } from "@/models/Lead";

export const metadata: Metadata = { title: "New doctor" };

/**
 * New doctor. Once the draft exists the URL becomes /admin/doctors/new?id=…
 * (same route, so the editor keeps its state); reloading that URL resumes it.
 * Optional prefills:
 *  ?establishment=<id> — from a clinic/hospital: clinic pre-filled and linked, add-on plan
 *  ?hospital=<id>      — older links for the same thing
 *  ?lead=<id>          — convert a lead: name and phone pre-filled, lead marked won on save
 */
export default async function NewDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ establishment?: string; hospital?: string; lead?: string; id?: string; step?: string }>;
}) {
  const admin = await requireAdminPage(rolesFor("/admin/doctors"));
  const [{ establishment, hospital, lead, id, step }, options] = await Promise.all([searchParams, getEditorOptions()]);
  await connectToDatabase();

  if (isObjectId(id)) {
    const existing = await DoctorProfile.findById(id).lean();
    if (existing) {
      const initialStep = STEPS.some((s) => s.key === step) ? (step as StepKey) : "basics";
      return (
        <DoctorEditor
          initial={docToForm(existing)}
          options={options}
          role={admin.role}
          initialStep={initialStep}
          hints={await doctorFormHints(existing._id)}
        />
      );
    }
  }

  const form = emptyDoctorForm();

  // "Create portfolio for this doctor" from a clinic/hospital (`hospital` = old links; migrated hospitals keep their id).
  const siteId = establishment ?? hospital;
  if (isObjectId(siteId)) {
    const e = await Establishment.findById(siteId).lean();
    if (e) {
      const cityId = e.address?.cityId ? String(e.address.cityId) : (options.cities.find((c) => c.slug === "pune")?.id ?? "");
      const city = options.cities.find((c) => c.id === cityId);
      if (e.kind === "hospital") form.practitionerType = "consultant";
      form.plan = "doctor_addon";
      form.source = "hospital";
      form.establishmentIds = [String(e._id)];
      form.clinics = [
        {
          ...emptyClinic(cityId),
          type: e.kind === "hospital" ? "hospital_visiting" : "own_clinic",
          establishmentId: String(e._id),
          name: e.name,
          addressLine1: e.address?.line1 ?? "",
          addressLine2: e.address?.line2 ?? "",
          areaId: e.address?.areaId ? String(e.address.areaId) : "",
          pincode: e.address?.pincode ?? "",
          state: e.address?.state || city?.state || "Maharashtra",
          phone: e.contact?.phones?.[0] ?? "",
        },
      ];
    }
  }

  let leadId: string | undefined;
  if (isObjectId(lead)) {
    const l = await Lead.findById(lead).lean();
    if (l) {
      leadId = String(l._id);
      const parts = l.name.replace(/^dr\.?\s+/i, "").trim().split(/\s+/);
      form.firstName = parts[0] ?? "";
      form.lastName = parts.slice(1).join(" ");
      form.mobile = l.phone.replace(/\D/g, "").slice(-10);
      form.source = "inbound";
      const spec = l.specialty ? options.specialties.find((s) => s.name.toLowerCase() === l.specialty!.toLowerCase()) : undefined;
      if (spec) form.primarySpecialtyId = spec.id;
    }
  }

  return <DoctorEditor initial={form} options={options} role={admin.role} leadId={leadId} />;
}
