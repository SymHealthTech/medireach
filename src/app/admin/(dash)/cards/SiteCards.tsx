import QRCode from "qrcode";
import { IdCard } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { KindTabs, type ProductKind } from "@/components/admin/KindTabs";
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

/** Card switcher: doctors, clinics and hospitals each have their own cards (in the colours of their website design). */
export function CardTabs({ active }: { active: ProductKind }) {
  return <KindTabs label="Card type" active={active} hrefFor={(k) => (k === "doctor" ? "/admin/cards" : `/admin/cards?type=${k}`)} />;
}

/** Clinic/hospital visiting cards: preview, downloads, QR and share message. */
export async function SiteCards({ sp, kind }: { sp: SearchParams; kind: "clinic" | "hospital" }) {
  const id = param(sp, "establishment");
  // Opened from the editor ("Visiting card"): only this site's card.
  if (isObjectId(id)) return <OneSiteCard id={id} />;
  const filter: FilterQuery<EstablishmentDoc> = { kind };
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
      <CardTabs active={kind} />
      <p className="max-w-2xl text-muted-foreground">
        Each {kind}&apos;s card, in the colours of its website design. The QR opens the website address (or the site page). Download the print PDF
        for the printer, the phone PNG to share on WhatsApp, or the full card PDF. The buttons work in both PDFs.
      </p>
      <ListToolbar placeholder={`Search ${kind}s…`} />
      {cards.length === 0 ? (
        <EmptyState icon={IdCard} title={`No ${kind} cards yet`} description={`A card is created automatically for every ${kind}.`} />
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
                    {(["print.pdf", "phone.pdf", "print.png", "phone.png"] as const).map((f) => (
                      <a
                        key={f}
                        className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40"
                        href={`/admin/cards/site/${c.id}/${f}?download=1`}
                      >
                        {f === "print.pdf" ? "PDF (print)" : f === "phone.pdf" ? "PDF (full card)" : f === "print.png" ? "PNG (print)" : "PNG (phone)"}
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

/** One clinic's or hospital's card on its own: phone and print card, downloads, QR and the WhatsApp message. */
async function OneSiteCard({ id }: { id: string }) {
  const [settings, doc, site] = await Promise.all([getSettings(), Establishment.findById(id).select({ name: 1, kind: 1, status: 1 }).lean(), loadSiteForCard(id)]);
  if (!doc) return <EmptyState icon={IdCard} title="Not found" description="This clinic or hospital no longer exists." />;
  const what = doc.kind === "hospital" ? "hospital" : "clinic";
  const qrSvg = site ? await QRCode.toString(site.shareUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0A3F3F", light: "#FFFFFF" } }) : undefined;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-semibold text-ink">Visiting card · {doc.name}</h2>
        <StatusBadge status={doc.status} />
        <a href={`/admin/establishments/${id}?step=review`} className="ml-auto text-sm font-medium text-ink underline underline-offset-2">
          Back to the {what}
        </a>
      </div>
      {site ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">Print card (85 × 55 mm)</p>
              <SiteCardView site={site} variant="print" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">Phone card (WhatsApp)</p>
              <SiteCardView site={site} variant="phone" />
            </div>
          </div>
          <p className="break-all text-xs text-muted-foreground">QR opens {site.shareUrl}</p>
          <div className="flex flex-wrap gap-2">
            {(["print.pdf", "phone.pdf", "print.png", "phone.png"] as const).map((f) => (
              <a key={f} className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/site/${id}/${f}?download=1`}>
                {f === "print.pdf" ? "PDF (print)" : f === "phone.pdf" ? "PDF (full card)" : f === "print.png" ? "PNG (print)" : "PNG (phone)"}
              </a>
            ))}
          </div>
          {qrSvg && <CardTools qrSvg={qrSvg} fileBase={site.slug} shareUrl={site.shareUrl} message={fillShareTemplate(settings.whatsappShareTemplate, { name: doc.name, link: site.shareUrl })} />}
        </>
      ) : (
        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Add the city and area (Location step) and save, to generate the card.</p>
      )}
      {doc.status !== "published" && <p className="text-xs text-amber-700 dark:text-amber-400">Not published yet. The QR link won&apos;t open until it is.</p>}
    </div>
  );
}
