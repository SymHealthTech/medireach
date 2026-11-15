import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { getEditorOptions } from "@/lib/doctors/options";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Hospital, type HospitalDoc } from "@/models/Hospital";
import { HospitalDialog } from "./HospitalForm";

export const metadata: Metadata = { title: "Hospitals" };

export default async function HospitalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/hospitals"));
  await connectToDatabase();
  const sp = await searchParams;
  const options = await getEditorOptions();

  const filter: FilterQuery<HospitalDoc> = {};
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ name: re }, { contactPerson: re }, { address: re }];
  const city = param(sp, "city");
  if (isObjectId(city)) filter.cityId = city;
  const page = pageOf(sp);

  const [total, hospitals] = await Promise.all([
    Hospital.countDocuments(filter),
    Hospital.find(filter).sort({ name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
  ]);
  const ids = hospitals.map((h) => h._id);
  const linked = await DoctorProfile.aggregate<{ _id: unknown; n: number }>([
    { $match: { $or: [{ hospitalAccountId: { $in: ids } }, { "clinics.hospitalId": { $in: ids } }] } },
    { $project: { h: { $setUnion: [[{ $ifNull: ["$hospitalAccountId", null] }], { $ifNull: ["$clinics.hospitalId", []] }] } } },
    { $unwind: "$h" },
    { $match: { h: { $in: ids } } },
    { $group: { _id: "$h", n: { $sum: 1 } } },
  ]);
  const countFor = (id: unknown) => linked.find((l) => String(l._id) === String(id))?.n ?? 0;
  const areaName = new Map(options.areas.map((a) => [a.id, a.name]));
  const cityName = new Map(options.cities.map((c) => [c.id, c.name]));
  const cityAreas = { cities: options.cities.map(({ id, name }) => ({ id, name })), areas: options.areas.map(({ id, name, cityId }) => ({ id, name, cityId })) };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">Hospital accounts and their visiting consultants.</p>
        <HospitalDialog options={cityAreas} />
      </div>
      <ListToolbar placeholder="Search hospitals…" filters={[{ name: "city", label: "City", options: options.cities.map((c) => ({ value: c.id, label: c.name })) }]} />
      {hospitals.length === 0 ? (
        <EmptyState icon={Building2} title={re ? "No hospitals match" : "No hospitals yet"} description="Add a hospital to create pages for its visiting consultants." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {hospitals.map((h) => (
            <li key={String(h._id)}>
              <Link href={`/admin/hospitals/${h._id}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-soft hover:border-ink/30">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sage">
                  <Building2 className="size-5 text-ink" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{h.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[areaName.get(String(h.areaId)), cityName.get(String(h.cityId))].filter(Boolean).join(", ")} · {countFor(h._id)} doctor
                    {countFor(h._id) === 1 ? "" : "s"}
                    {typeof h.pricePerDoctor === "number" ? ` · ${formatINR(h.pricePerDoctor)}/doctor` : ""}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}
