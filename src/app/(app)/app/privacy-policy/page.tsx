import type { Metadata } from "next";
import Link from "next/link";
import { GrievanceForm } from "@/components/site/GrievanceForm";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Privacy Policy — MediReach" };

export const dynamic = "force-dynamic";

export default async function AppPrivacyPolicyPage() {
  const { title, body } = await getContent("privacy-policy");
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <Link
        href="/app/menu"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        ‹ Menu
      </Link>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="space-y-4">
        {body.split("\n").map((line, i) =>
          line.trim() ? (
            <p key={i} className="text-ink-muted">{line}</p>
          ) : (
            <div key={i} className="h-1" />
          ),
        )}
      </div>
      <section className="mt-4">
        <h2 className="mb-4 text-lg font-bold text-ink">Your data rights</h2>
        <GrievanceForm />
      </section>
    </div>
  );
}
