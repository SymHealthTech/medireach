import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Medical Disclaimer — MediReach" };

export const dynamic = "force-dynamic";

export default async function AppMedicalDisclaimerPage() {
  const { title, body } = await getContent("medical-disclaimer");
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <Link
        href="/app/menu"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        ‹ Menu
      </Link>
      <PageHeader title={title} />
      <div className="space-y-4">
        {body.split("\n").map((line, i) =>
          line.trim() ? (
            <p key={i} className="text-ink-muted">{line}</p>
          ) : (
            <div key={i} className="h-1" />
          ),
        )}
      </div>
    </div>
  );
}
