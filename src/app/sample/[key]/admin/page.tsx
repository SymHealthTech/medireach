import { notFound } from "next/navigation";
import { ExternalLink, IdCard } from "lucide-react";
import Link from "next/link";
import { DoctorOverview } from "@/components/account/DoctorOverview";
import { UidBadge } from "@/components/account/UidBadge";
import { demoDoctorForm } from "@/fixtures/demo-doctors/dashboard";
import { demoDoctor, demoInquiries, demoName } from "@/fixtures/demo-doctors/dashboard";
import { subdomainUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const btn = "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40";

/** Demo dashboard overview: request counts, latest requests, the website address. */
export default async function DemoOverviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = demoDoctor(key);
  if (!d) notFound();
  const rows = demoInquiries(d);
  const monthAgo = Date.now() - 30 * 86_400_000;
  return (
    <main className="max-w-3xl space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Hello, {demoName(d)}</h1>
        <p className="mt-2 text-body">Keep your website up to date. Changes show straight away.</p>
      </div>
      <DoctorOverview
        base={`/sample/${key}/admin`}
        counts={{ new: rows.filter((r) => r.status === "new").length, month: rows.filter((r) => Date.parse(r.createdAt) >= monthAgo).length }}
        healthTipsOn={d.showHealthTips}
        latest={rows.slice(0, 4)}
      />
      <section className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Your website</h2>
          <UidBadge uid={demoDoctorForm(d).uid!} />
        </div>
        <p className="break-all text-body">
          <a href={`/sample/${key}`} target="_blank" rel="noopener" className="font-semibold text-ink underline">
            {subdomainUrl(d.subdomain).replace(/^https?:\/\//, "")}
          </a>
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={`/sample/${key}`} target="_blank" rel="noopener" className={btn}>
            <ExternalLink className="size-4" strokeWidth={1.75} /> View website
          </a>
          <Link href={`/sample/${key}/card`} className={btn}>
            <IdCard className="size-4" strokeWidth={1.75} /> Visiting card: share, download, print
          </Link>
        </div>
      </section>
    </main>
  );
}
