import Link from "next/link";
import { notFound } from "next/navigation";
import { InquiryList } from "@/components/account/InquiryList";
import { demoDoctor, demoInquiries } from "@/fixtures/demo-doctors/dashboard";
import { cn } from "@/lib/cn";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUSES, type InquiryStatus } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

/** Demo appointment requests (same screen as /account/inquiries; nothing is saved). */
export default async function DemoInquiriesPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ key }, { status }] = await Promise.all([params, searchParams]);
  const d = demoDoctor(key);
  if (!d) notFound();
  const all = demoInquiries(d);
  const filter = (INQUIRY_STATUSES as readonly string[]).includes(status ?? "") ? (status as InquiryStatus) : undefined;
  const rows = filter ? all.filter((r) => r.status === filter) : all;
  const base = `/sample/${key}/admin/inquiries`;
  const tabs: { key?: InquiryStatus; label: string }[] = [{ label: "All" }, ...INQUIRY_STATUSES.map((s) => ({ key: s, label: INQUIRY_STATUS_LABEL[s] }))];
  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Appointment requests</h1>
        <p className="mt-1 text-body">Sent from the form on your website. Each one is also emailed to you. Call or WhatsApp the patient, then mark the request so your staff know where it stands.</p>
      </div>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `${base}?status=${t.key}` : base}
            aria-current={filter === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition",
              filter === t.key ? "bg-ink text-paper ring-ink" : "bg-surface text-ink ring-line hover:ring-ink/30",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === t.key ? "bg-paper/20" : "bg-mist")}>{t.key ? all.filter((r) => r.status === t.key).length : all.length}</span>
          </Link>
        ))}
      </nav>
      <InquiryList key={filter ?? "all"} initial={rows} demo />
    </main>
  );
}
