import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/FormDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { formatINR } from "@/lib/format";
import { getEditorOptions } from "@/lib/doctors/options";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Hospital } from "@/models/Hospital";
import { deleteHospitalAction } from "../actions";
import { HospitalDialog } from "../HospitalForm";

export const metadata: Metadata = { title: "Hospital" };

export default async function HospitalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/hospitals"));
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  const [h, options] = await Promise.all([Hospital.findById(id).lean(), getEditorOptions()]);
  if (!h) notFound();

  const doctors = await DoctorProfile.find({ $or: [{ hospitalAccountId: h._id }, { "clinics.hospitalId": h._id }] })
    .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, primarySpecialtyId: 1 })
    .sort({ firstName: 1, lastName: 1 })
    .lean();
  const spec = new Map(options.specialties.map((s) => [s.id, s.name]));
  const area = options.areas.find((a) => a.id === String(h.areaId));
  const city = options.cities.find((c) => c.id === String(h.cityId));
  const value = {
    id: String(h._id),
    name: h.name,
    cityId: String(h.cityId),
    areaId: h.areaId ? String(h.areaId) : "",
    address: h.address ?? "",
    contactPerson: h.contactPerson ?? "",
    phone: h.phone ?? "",
    email: h.email ?? "",
    pricePerDoctor: h.pricePerDoctor,
    notes: h.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/hospitals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> All hospitals
      </Link>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{h.name}</h2>
            <p className="text-muted-foreground">{[h.address, area?.name, city?.name].filter(Boolean).join(", ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HospitalDialog
              initial={value}
              options={{ cities: options.cities.map(({ id: cid, name }) => ({ id: cid, name })), areas: options.areas.map(({ id: aid, name, cityId }) => ({ id: aid, name, cityId })) }}
            />
            {can.publish(admin.role) && (
              <ConfirmButton
                trigger={
                  <Button variant="outline" className="text-clay-text">
                    <Trash2 /> Delete
                  </Button>
                }
                title="Delete this hospital?"
                description="Only possible when no doctors are linked to it."
                confirmLabel="Delete"
                successMessage="Hospital deleted"
                redirectTo="/admin/hospitals"
                onConfirm={async () => {
                  "use server";
                  return deleteHospitalAction({ id: String(h._id) });
                }}
              />
            )}
          </div>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="font-medium">{h.contactPerson || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{h.phone ? <a href={`tel:${h.phone}`}>{h.phone}</a> : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{h.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Price per doctor</dt>
            <dd className="font-display text-xl text-ink">{formatINR(h.pricePerDoctor)}</dd>
          </div>
        </dl>
        {h.notes && <p className="mt-4 whitespace-pre-line text-sm text-body">{h.notes}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-ink">Consultants ({doctors.length})</h3>
          <Button asChild>
            <Link href={`/admin/doctors/new?hospital=${h._id}`}>
              <UserPlus /> Add consultant
            </Link>
          </Button>
        </div>
        {doctors.length === 0 ? (
          <EmptyState icon={UserRound} title="No consultants yet" description="“Add consultant” starts a doctor with this hospital already set as their clinic." />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
            {doctors.map((d) => (
              <li key={String(d._id)}>
                <Link href={`/admin/doctors/${d._id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40">
                  <span>
                    <span className="block font-semibold text-ink">{d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`}</span>
                    <span className="text-sm text-muted-foreground">{spec.get(String(d.primarySpecialtyId)) ?? "—"}</span>
                  </span>
                  <StatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
