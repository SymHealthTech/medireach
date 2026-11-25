import Link from "next/link";
import { InquiryList, type InquiryRow } from "@/components/account/InquiryList";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { cn } from "@/lib/cn";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUSES, type InquiryStatus } from "@/lib/inquiries";
import { Inquiry } from "@/models/Inquiry";

export const dynamic = "force-dynamic";

/** Appointment requests from the doctor's website, newest first, filterable by status. */
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const me = await requireDoctorPage();
  const { status } = await searchParams;
  const filter = (INQUIRY_STATUSES as readonly string[]).includes(status ?? "") ? (status as InquiryStatus) : undefined;
  const [rows, counts] = await Promise.all([
    Inquiry.find({ doctorId: me.doctor._id, ...(filter ? { status: filter } : {}) })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Inquiry.aggregate<{ _id: InquiryStatus; n: number }>([{ $match: { doctorId: me.doctor._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const count = (s?: InquiryStatus) => (s ? (counts.find((c) => c._id === s)?.n ?? 0) : counts.reduce((a, c) => a + c.n, 0));

  const initial: InquiryRow[] = rows.map((q) => ({
    id: String(q._id),
    name: q.name,
    phone: q.phone,
    ...(q.email ? { email: q.email } : {}),
    ...(q.clinicName ? { clinicName: q.clinicName } : {}),
    ...(q.preferredDate ? { preferredDate: q.preferredDate.toISOString() } : {}),
    ...(q.preferredTime ? { preferredTime: q.preferredTime } : {}),
    ...(q.message ? { message: q.message } : {}),
    status: q.status,
    ...(q.note ? { note: q.note } : {}),
    createdAt: q.createdAt.toISOString(),
  }));

  const tabs: { key?: InquiryStatus; label: string }[] = [{ label: "All" }, ...INQUIRY_STATUSES.map((s) => ({ key: s, label: INQUIRY_STATUS_LABEL[s] }))];

  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Appointment requests</h1>
        <p className="mt-1 text-body">
          Sent from the form on your website. Each one is also emailed to you. Call or WhatsApp the patient, then mark the request so your staff know where it stands.
        </p>
      </div>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/account/inquiries?status=${t.key}` : "/account/inquiries"}
            aria-current={filter === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition",
              filter === t.key ? "bg-ink text-paper ring-ink" : "bg-surface text-ink ring-line hover:ring-ink/30",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === t.key ? "bg-paper/20" : "bg-mist")}>{count(t.key)}</span>
          </Link>
        ))}
      </nav>
      <InquiryList key={filter ?? "all"} initial={initial} />
      <p className="text-xs text-muted-foreground">
        Patients&apos; details are private to you. Please use them only to reply to their request, and delete notes you no longer need.
      </p>
    </main>
  );
}
