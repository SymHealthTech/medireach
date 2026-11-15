import type { Metadata } from "next";
import { DoctorEditor } from "@/components/admin/doctor-editor/DoctorEditor";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { emptyClinic, emptyDoctorForm } from "@/lib/doctors/form";
import { getEditorOptions } from "@/lib/doctors/options";
import { Hospital } from "@/models/Hospital";
import { Lead } from "@/models/Lead";

export const metadata: Metadata = { title: "New doctor" };

/**
 * New doctor. Optional prefills:
 *  ?hospital=<id> — "Add consultant" from a hospital: clinic pre-set as visiting
 *  ?lead=<id>     — convert a lead: name and phone pre-filled, lead marked won on save
 */
export default async function NewDoctorPage({ searchParams }: { searchParams: Promise<{ hospital?: string; lead?: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/doctors"));
  const [{ hospital, lead }, options] = await Promise.all([searchParams, getEditorOptions()]);
  await connectToDatabase();
  const form = emptyDoctorForm();

  if (isObjectId(hospital)) {
    const h = await Hospital.findById(hospital).lean();
    if (h) {
      const city = options.cities.find((c) => c.id === String(h.cityId));
      form.practitionerType = "consultant";
      form.plan = "hospital";
      form.source = "hospital";
      form.hospitalAccountId = String(h._id);
      form.clinics = [
        {
          ...emptyClinic(String(h.cityId)),
          type: "hospital_visiting",
          hospitalId: String(h._id),
          name: h.name,
          addressLine1: h.address ?? "",
          areaId: h.areaId ? String(h.areaId) : "",
          state: city?.state ?? "Maharashtra",
          phone: h.phone ?? "",
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
