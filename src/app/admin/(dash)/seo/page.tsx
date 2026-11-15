import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/FormDialog";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { SEO_HEALTH_SELECT, seoHealth } from "@/lib/admin/seo-health";
import { connectToDatabase } from "@/lib/db";
import { allSitemapEntries, SITEMAP_CHUNK_SIZE } from "@/lib/public/sitemap";
import { absUrl } from "@/lib/site";
import { DoctorProfile } from "@/models/DoctorProfile";
import { revalidateAllAction } from "./actions";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  await requireAdminPage(rolesFor("/admin/seo"));
  await connectToDatabase();
  const [entries, published] = await Promise.all([
    allSitemapEntries().catch(() => []),
    DoctorProfile.find({ status: "published" })
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, ...SEO_HEALTH_SELECT })
      .sort({ firstName: 1 })
      .lean(),
  ]);

  const chunks = Math.max(1, Math.ceil(entries.length / SITEMAP_CHUNK_SIZE));
  const profiles = entries.filter((e) => e.url.includes("/doctor/")).length;
  const hubs = entries.length - profiles - 1;
  const health = published.map((d) => ({ d, h: seoHealth(d) }));
  const needsWork = health.filter(({ h }) => h.missing.length + h.issues > 0);
  const noindex = health.filter(({ h }) => h.noindex).length;

  const stat = (label: string, value: number | string, hint?: string) => (
    <div className="rounded-xl border border-line bg-card p-4 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stat("URLs in sitemap", entries.length, `${chunks} file${chunks === 1 ? "" : "s"} of up to ${SITEMAP_CHUNK_SIZE.toLocaleString("en-IN")}`)}
        {stat("Doctor pages indexed", profiles, `${noindex} hidden with noindex`)}
        {stat("Hub pages", Math.max(0, hubs), "Non-empty city, specialty and area pages")}
        {stat("Pages needing work", needsWork.length, `of ${published.length} published`)}
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink">Sitemaps</h2>
        <ul className="space-y-1 text-sm">
          <li>
            Index:{" "}
            <a className="font-medium text-ink underline" href={absUrl("/sitemap_index.xml")} target="_blank" rel="noopener">
              {absUrl("/sitemap_index.xml")}
            </a>
          </li>
          {Array.from({ length: chunks }, (_, i) => (
            <li key={i} className="text-muted-foreground">
              /sitemap/{i}.xml — {Math.min(SITEMAP_CHUNK_SIZE, entries.length - i * SITEMAP_CHUNK_SIZE)} URLs
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline">
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener">
              <ExternalLink /> Google Search Console
            </a>
          </Button>
          <ConfirmButton
            trigger={
              <Button variant="outline">
                <RefreshCw /> Refresh all public pages
              </Button>
            }
            title="Refresh every public page?"
            description="Profiles, hub pages and sitemaps are rebuilt on their next visit. Use this after bulk changes."
            confirmLabel="Refresh"
            successMessage="All public pages will refresh"
            onConfirm={async () => {
              "use server";
              return revalidateAllAction({});
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">Published pages missing recommended fields</h2>
        {needsWork.length === 0 ? (
          <p className="text-sm text-leaf">Every published page has a photo, short bio, map location and timings.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
            {needsWork.map(({ d, h }) => (
              <li key={String(d._id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link href={`/admin/doctors/${d._id}`} className="font-medium text-ink hover:underline">
                  {d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`}
                </Link>
                <span className="flex flex-wrap gap-1.5 text-xs">
                  {h.issues > 0 && <span className="rounded-full bg-clay/15 px-2 py-0.5 font-semibold text-clay">{h.issues} compliance</span>}
                  {h.missing.map((m) => (
                    <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
