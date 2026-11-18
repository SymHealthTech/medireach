import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { UPDATE_STATUS_LABEL } from "@/lib/admin/labels";
import { UPDATE_REQUEST_STATUSES } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatINR, timeAgo } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";
import { UpdateRequest } from "@/models/UpdateRequest";
import { NewUpdateRequestButton, UpdateRequestCardActions } from "./UpdateRequestControls";

export const metadata: Metadata = { title: "Update requests" };

export default async function UpdateRequestsPage() {
  await requireAdminPage(rolesFor("/admin/update-requests"));
  await connectToDatabase();
  const [requests, doctors, settings] = await Promise.all([
    UpdateRequest.find({ $or: [{ status: { $ne: "done" } }, { completedAt: { $gte: new Date(Date.now() - 60 * 86400_000) } }] })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean(),
    DoctorProfile.find().select({ title: 1, firstName: 1, lastName: 1, displayName: 1, freeUpdateUsed: 1 }).sort({ firstName: 1 }).lean(),
    getSettings(),
  ]);
  const name = new Map(doctors.map((d) => [String(d._id), d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`]));

  const card = (r: (typeof requests)[number]) => (
    <article key={String(r._id)} className="space-y-2 rounded-xl border border-line bg-card p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/doctors/${r.doctorId}`} className="font-semibold text-ink hover:underline">
          {name.get(String(r.doctorId)) ?? "Doctor"}
        </Link>
        {r.price === 0 ? <Pill tone="leaf">Free</Pill> : <Pill tone={r.paid ? "leaf" : "marigold"}>{formatINR(r.price)} {r.paid ? "paid" : "due"}</Pill>}
      </div>
      <p className="whitespace-pre-line text-sm text-body">{r.description}</p>
      <p className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</p>
      <UpdateRequestCardActions id={String(r._id)} status={r.status} paid={r.paid} price={r.price} />
    </article>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">Done-for-you updates: {formatINR(settings.prices.updatePrice)} each; the first one per doctor is free.</p>
        <NewUpdateRequestButton
          defaultPrice={settings.prices.updatePrice}
          doctors={doctors.map((d) => ({ id: String(d._id), name: name.get(String(d._id))!, freeAvailable: !d.freeUpdateUsed }))}
        />
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={Wrench} title="No update requests" description="Requests from doctors and the team will show up here." />
      ) : (
        <>
          {/* Kanban (tablet/desktop) */}
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {UPDATE_REQUEST_STATUSES.map((s) => {
              const col = requests.filter((r) => r.status === s);
              return (
                <section key={s} aria-label={UPDATE_STATUS_LABEL[s]} className="space-y-3 rounded-xl bg-muted p-3">
                  <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
                    {UPDATE_STATUS_LABEL[s]} <span className="text-muted-foreground">{col.length}</span>
                  </h2>
                  {col.length === 0 ? <p className="px-1 text-sm text-muted-foreground">Nothing here.</p> : col.map(card)}
                </section>
              );
            })}
          </div>
          {/* List (mobile) */}
          <div className="space-y-5 md:hidden">
            {UPDATE_REQUEST_STATUSES.map((s) => {
              const col = requests.filter((r) => r.status === s);
              if (col.length === 0) return null;
              return (
                <section key={s} className="space-y-2">
                  <h2 className="text-sm font-semibold">
                    {UPDATE_STATUS_LABEL[s]} ({col.length})
                  </h2>
                  {col.map(card)}
                </section>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Done requests older than 60 days are hidden.</p>
        </>
      )}
    </div>
  );
}
