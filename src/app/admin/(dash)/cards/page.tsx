import type { Metadata } from "next";
import QRCode from "qrcode";
import { IdCard } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId, pageOf, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fillShareTemplate } from "@/lib/share-message";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { CardTools } from "./CardTools";

export const metadata: Metadata = { title: "Visiting cards" };

const PER_PAGE = 12;

export default async function CardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/cards"));
  await connectToDatabase();
  const sp = await searchParams;
  const filter: FilterQuery<DoctorProfileDoc> = {};
  const doctor = param(sp, "doctor");
  if (isObjectId(doctor)) filter._id = doctor;
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
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1, cardTemplateId: 1 })
      .lean(),
  ]);

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
        ? await QRCode.toString(shareUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0E3B3C", light: "#FFFFFF" } })
        : undefined;
      const published = d.status === "published" && d.slug && d.citySlug;
      return {
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
      <p className="max-w-2xl text-muted-foreground">
        QR codes point to the doctor&apos;s website address (or short link). Printable and phone-share card designs arrive with the card
        templates; QR, links, contact file and the WhatsApp message work now.
      </p>
      <ListToolbar placeholder="Search doctors…" />
      {cards.length === 0 ? (
        <EmptyState icon={IdCard} title="No cards yet" description="A card is created automatically for every doctor." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {cards.map((c) => (
            <li key={c.id} className="flex gap-4 rounded-xl border border-line bg-card p-4 shadow-soft">
              <div className="size-28 shrink-0 overflow-hidden rounded-lg border border-line bg-white p-1">
                {c.qrSvg ? (
                  <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: c.qrSvg }} />
                ) : (
                  <p className="p-2 text-center text-xs text-muted-foreground">Set name and clinic to get a link</p>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-ink">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                {c.shareUrl && <p className="break-all text-xs text-muted-foreground">{c.shareUrl}</p>}
                {c.shareUrl && c.qrSvg && <CardTools qrSvg={c.qrSvg} fileBase={c.fileBase} shareUrl={c.shareUrl} message={c.message} vcfUrl={c.vcfUrl} />}
                {c.status !== "published" && <p className="text-xs text-marigold">Not published yet — the link won&apos;t work until it is.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} total={total} />
    </div>
  );
}
