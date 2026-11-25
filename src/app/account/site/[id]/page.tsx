import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteSelfEditor } from "@/components/account/SiteSelfEditor";
import { UidBadge } from "@/components/account/UidBadge";
import { requireAccountPage } from "@/lib/auth/doctor";
import { docToForm } from "@/lib/establishments/server";
import { getSiteSelfEditOptions } from "@/lib/self-edit-options";
import { ensureUid } from "@/lib/uid";
import { Establishment } from "@/models/Establishment";

export const dynamic = "force-dynamic";

/** A clinic or hospital owner's full self-editor for one of their sites. */
export default async function SiteEditPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAccountPage();
  const { id } = await params;
  const site = me.sites.find((s) => String(s._id) === id);
  if (!site) notFound();
  const [options, uid] = await Promise.all([getSiteSelfEditOptions(), ensureUid(Establishment as never, site, site.kind === "hospital" ? "hospital" : "clinic")]);
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-8 sm:px-6">
      <Link href="/account" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink hover:text-lagoon">
        <ArrowLeft className="size-4" /> My account
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{site.name}</h1>
          <p className="mt-1 text-body">Update anything on your {site.kind === "hospital" ? "hospital" : "clinic"} website. Changes go live when you save.</p>
        </div>
        <UidBadge uid={uid} />
      </div>
      <SiteSelfEditor initial={docToForm(site.toObject())} options={options} />
    </main>
  );
}
