import type { Metadata } from "next";
import QRCode from "qrcode";
import { IdCard } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { ownedScope } from "@/lib/admin/scope";
import { isObjectId, pageOf, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fillShareTemplate } from "@/lib/share-message";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { CardView } from "@/components/cards/CardView";
import { loadDoctorForCard } from "@/lib/cards/admin";
import { getReadyTemplates } from "@/lib/public/templates";
import { CardTools } from "./CardTools";
import { CardTabs, SiteCards } from "./SiteCards";

export const metadata: Metadata = { title: "Visiting cards" };

const PER_PAGE = 12;

export default async function CardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/cards"));
  // Sales executives see only their own cards.
  const scope = ownedScope(admin);
  await connectToDatabase();
  const sp = await searchParams;
  const type = param(sp, "type");
  if (type === "clinic" || type === "hospital" || type === "sites") return <SiteCards sp={sp} kind={type === "hospital" ? "hospital" : "clinic"} scope={scope} />;
  const doctor = param(sp, "doctor");
  // Opened from the doctor editor ("Visiting card"): only this doctor's card.
  if (isObjectId(doctor)) return <OneDoctorCard id={doctor} scope={scope} />;
  const filter: FilterQuery<DoctorProfileDoc> = { ...scope };
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ firstName: re }, { lastName: re }, { displayName: re }];
  const page = pageOf(sp);

  const [settings, total, docs] = await Promise.all([
    getSettings(),
    DoctorProfile.countDocuments(filter),
    DoctorProfile.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1 })
      .lean(),
  ]);

  const ready = await getReadyTemplates();
  const cards = await Promise.all(
    docs.map(async (d) => {
      const name = d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`;
      // Cards and QR codes use the subdomain when set, otherwise the short link.
      const shareUrl = d.subdomain
        ? subdomainUrl(d.subdomain)
        : d.shortSlug
          ? absUrl(paths.short(d.shortSlug))
          : d.slug && d.citySlug
            ? absUrl(paths.doctor(d.citySlug, d.slug))
            : undefined;
      const qrSvg = shareUrl
        ? await QRCode.toString(shareUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0A3F3F", light: "#FFFFFF" } })
        : undefined;
      const published = d.status === "published" && d.slug && d.citySlug;
      const publicDoctor = await loadDoctorForCard(String(d._id));
      return {
        publicDoctor,
        id: String(d._id),
        name,
        status: d.status,
        shareUrl,
        qrSvg,
        fileBase: d.shortSlug || String(d._id),
        message: shareUrl ? fillShareTemplate(settings.whatsappShareTemplate, { name, link: shareUrl }) : "",
        vcfUrl: published ? absUrl(paths.doctorVcf(d.citySlug!, d.slug!)) : undefined,
      };
    }),
  );

  return (
    <div className="space-y-5">
      <CardTabs active="doctor" />
      <p className="max-w-2xl text-muted-foreground">
        Each doctor&apos;s card, in the same design as their website. The QR opens their website address (or short link). Download the
        print PDF for the printer, the phone PNG to share on WhatsApp, or the full card PDF. The buttons work in both PDFs.
      </p>
      <ListToolbar placeholder="Search doctors…" />
      {cards.length === 0 ? (
        <EmptyState icon={IdCard} title="No cards yet" description="A card is created automatically for every doctor." />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id} className="space-y-3 rounded-xl border border-line bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              {c.publicDoctor && c.shareUrl ? (
                <CardView doctor={c.publicDoctor} variant="print" ready={ready} />
              ) : (
                <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Add the name and a clinic to generate the card.</p>
              )}
              {c.shareUrl && <p className="break-all text-xs text-muted-foreground">QR opens {c.shareUrl}</p>}
              {c.shareUrl && (
                <div className="flex flex-wrap gap-2">
                  <a className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/${c.id}/print.pdf?download=1`}>
                    PDF (print)
                  </a>
                  <a className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/${c.id}/phone.pdf?download=1`}>
                    PDF (full card)
                  </a>
                  <a className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/${c.id}/print.png?download=1`}>
                    PNG (print)
                  </a>
                  <a className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/${c.id}/phone.png?download=1`}>
                    PNG (phone)
                  </a>
                  <a className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-ink hover:underline" href={`/admin/cards/${c.id}/phone.png`} target="_blank" rel="noopener">
                    View phone card
                  </a>
                </div>
              )}
              {c.shareUrl && c.qrSvg && <CardTools qrSvg={c.qrSvg} fileBase={c.fileBase} shareUrl={c.shareUrl} message={c.message} vcfUrl={c.vcfUrl} />}
              {c.status !== "published" && <p className="text-xs text-amber-700 dark:text-amber-400">Not published yet — the QR link won&apos;t open until it is.</p>}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} />
    </div>
  );
}

/** One doctor's card on its own: print and phone card, downloads, QR, contact file and the WhatsApp message. */
async function OneDoctorCard({ id, scope }: { id: string; scope: Record<string, unknown> }) {
  // Check it exists (and, for a sales executive, is theirs) before building the card.
  const d = await DoctorProfile.findOne({ _id: id, ...scope }).select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1 }).lean();
  if (!d) return <EmptyState icon={IdCard} title="Not found" description="This doctor no longer exists." />;
  const [settings, publicDoctor, ready] = await Promise.all([getSettings(), loadDoctorForCard(id), getReadyTemplates()]);
  const name = d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`;
  const shareUrl = d.subdomain ? subdomainUrl(d.subdomain) : d.shortSlug ? absUrl(paths.short(d.shortSlug)) : d.slug && d.citySlug ? absUrl(paths.doctor(d.citySlug, d.slug)) : undefined;
  const qrSvg = shareUrl ? await QRCode.toString(shareUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0A3F3F", light: "#FFFFFF" } }) : undefined;
  const published = d.status === "published" && d.slug && d.citySlug;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-semibold text-ink">Visiting card · {name}</h2>
        <StatusBadge status={d.status} />
        <a href={`/admin/doctors/${id}?step=review`} className="ml-auto text-sm font-medium text-ink underline underline-offset-2">
          Back to the doctor
        </a>
      </div>
      {publicDoctor && shareUrl ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">Print card (85 × 55 mm)</p>
              <CardView doctor={publicDoctor} variant="print" ready={ready} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink">Phone card (WhatsApp)</p>
              <CardView doctor={publicDoctor} variant="phone" ready={ready} />
            </div>
          </div>
          <p className="break-all text-xs text-muted-foreground">QR opens {shareUrl}</p>
          <div className="flex flex-wrap gap-2">
            {(["print.pdf", "phone.pdf", "print.png", "phone.png"] as const).map((f) => (
              <a key={f} className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3 text-sm font-semibold hover:border-ink/40" href={`/admin/cards/${id}/${f}?download=1`}>
                {f === "print.pdf" ? "PDF (print)" : f === "phone.pdf" ? "PDF (full card)" : f === "print.png" ? "PNG (print)" : "PNG (phone)"}
              </a>
            ))}
          </div>
          {qrSvg && (
            <CardTools
              qrSvg={qrSvg}
              fileBase={d.shortSlug || id}
              shareUrl={shareUrl}
              message={fillShareTemplate(settings.whatsappShareTemplate, { name, link: shareUrl })}
              vcfUrl={published ? absUrl(paths.doctorVcf(d.citySlug!, d.slug!)) : undefined}
            />
          )}
        </>
      ) : (
        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Add the name and a clinic, and save, to generate the card.</p>
      )}
      {d.status !== "published" && <p className="text-xs text-amber-700 dark:text-amber-400">Not published yet. The QR link won&apos;t open until it is.</p>}
    </div>
  );
}
