import Link from "next/link";
import QRCode from "qrcode";
import { IdCard } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SiteCardView } from "@/components/cards/SiteCardView";
import { isObjectId, pageOf, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { loadSiteForCard } from "@/lib/cards/admin";
import { getSettings } from "@/lib/settings";
import { fillShareTemplate } from "@/lib/share-message";
import { Establishment, type EstablishmentDoc } from "@/models/Establishment";
import { CardTools } from "./CardTools";

const PER_PAGE = 12;

/** Card switcher between doctors and clinics/hospitals. */
export function CardTabs({ active }: { active: "doctors" | "sites" }) {
  const tab = (key: "doctors" | "sites", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold ${active === key ? "bg-ink text-on-ink" : "text-muted-foreground hover:bg-accent hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Card type" className="inline-flex gap-1 rounded-xl border border-line bg-card p-1 shadow-soft">
      {tab("doctors", "/admin/cards", "Doctors")}
      {tab("sites", "/admin/cards?type=sites", "Clinics & hospitals")}
    </nav>
  );
}

/** Clinic/hospital visiting cards: preview, downloads, QR and share message. */
export async function SiteCards({ sp }: { sp: SearchParams }) {
  const filter: FilterQuery<EstablishmentDoc> = {};
  const id = param(sp, "establishment");
  if (isObjectId(id)) filter._id = id;
  const re = searchRegex(param(sp, "q"));
  if (re) filter.name = re;
  const page = pageOf(sp);

  const [settings, total, docs] = await Promise.all([
    getSettings(),
    Establishment.countDocuments(filter),
    Establishment.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).select({ _id: 1, name: 1, status: 1, slug: 1 }).lean(),
  ]);

  const cards = await Promise.all(
    docs.map(async (d) => {
      const site = await loadSiteForCard(String(d._id));
      const qrSvg = site
        ? await QRCode.toString(site.shareUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0A3F3F", light: "#FFFFFF" } })
        : undefined;
      return {
        id: String(d._id),
        name: d.name,
        status: d.status,
        site,
        qrSvg,
        message: site ? fillShareTemplate(settings.whatsappShareTemplate, { name: d.name, link: site.shareUrl }) : "",
      };
    }),
  );

  return (
    <div className="space-y-5">
      <CardTabs active="sites" />
      <p className="max-w-2xl text-muted-foreground">
        Each clinic&apos;s and hospital&apos;s card in its specialty colours. The QR opens the website address (or the site page). Download the
        PDF for the printer, or the phone PNG to share on WhatsApp.
      </p>
      <ListToolbar placeholder="Search clinics and hospitals…" />
      {cards.length === 0 ? (
        <EmptyState icon={IdCard} title="No clinic or hospital cards yet" description="A card is created automatically for every clinic and hospital." />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id} className="space-y-3 rounded-xl border border-line bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              {c.site ? (
                <SiteCardView site={c.site} variant="print" />
              ) : (
                <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Add the city and area (Location step) to generate the card.</p>
              )}
              {c.site && (
                <>
                  <p className="break-all text-xs text-muted-foreground">QR opens {c.site.shareUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    {(["print.pdf", "print.png", "phone.png"] as const).map((f) => (
                      <a
                        key={f}
                        className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40"
                        href={`/admin/cards/site/${c.id}/${f}?download=1`}
                      >
                        {f === "print.pdf" ? "PDF (print)" : f === "print.png" ? "PNG (print)" : "PNG (phone)"}
                      </a>
                    ))}
                    <a className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-ink hover:underline" href={`/admin/cards/site/${c.id}/phone.png`} target="_blank" rel="noopener">
                      View phone card
                    </a>
                  </div>
                  {c.qrSvg && <CardTools qrSvg={c.qrSvg} fileBase={c.site.slug} shareUrl={c.site.shareUrl} message={c.message} />}
                </>
              )}
              {c.status !== "published" && <p className="text-xs text-amber-700 dark:text-amber-400">Not published yet. The QR link won&apos;t open until it is.</p>}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} />
    </div>
  );
}
