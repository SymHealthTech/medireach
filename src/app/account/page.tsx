import Link from "next/link";
import { CalendarClock, Clock, ExternalLink, IdCard, ImageIcon, MapPin, PencilLine, Phone, Stethoscope, UserRound } from "lucide-react";
import { ChangeRequestForm } from "@/components/account/ChangeRequestForm";
import { DoctorOverview } from "@/components/account/DoctorOverview";
import { UidBadge } from "@/components/account/UidBadge";
import { requireAccountPage, type CurrentAccount } from "@/lib/auth/doctor";
import { displayRenewalStatus, listRenewalPrice, type RenewalProduct } from "@/lib/renewals";
import { getSettings } from "@/lib/settings";
import { absUrl, paths, sitePath, subdomainUrl } from "@/lib/site";
import type { RenewalStatus } from "@/lib/constants";
import { ensureUid } from "@/lib/uid";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Area } from "@/models/Area";
import { UpdateRequest } from "@/models/UpdateRequest";
import { Inquiry } from "@/models/Inquiry";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { new: "Received", in_progress: "In progress", done: "Done" } as const;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const longDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const card = "space-y-4 rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-6";
const btn = "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40";

/** Customer-facing renewal wording (the dashboard has its own labels). */
const RENEWAL_TEXT: Record<RenewalStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-leaf/10 text-leaf-text" },
  due: { label: "Renewal due soon", tone: "bg-marigold/20 text-ink" },
  overdue: { label: "Renewal overdue: your site is still live", tone: "bg-clay/15 text-clay-text" },
  grace: { label: "Renewal overdue: your site is still live", tone: "bg-clay/15 text-clay-text" },
  lapsed: { label: "Paused until the renewal is paid", tone: "bg-clay/15 text-clay-text" },
};

/** "Renews on 1 March 2027 · ₹999 a year" with a status chip. */
function RenewalLine({ due, status, price }: { due?: Date; status: RenewalStatus; price: number }) {
  if (!due) return null;
  const r = RENEWAL_TEXT[status];
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-body">
      <CalendarClock className="size-4 text-muted-foreground" strokeWidth={1.75} />
      Renews on {longDate.format(due)} · ₹{price.toLocaleString("en-IN")} a year
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.tone}`}>{r.label}</span>
    </p>
  );
}

/** Shortcuts into the doctor's editor (/account/profile?tab=…). */
const EDIT_LINKS = [
  { tab: "basics", icon: UserRound, title: "Name, photo and languages" },
  { tab: "clinics", icon: Clock, title: "Clinics, timings and fees" },
  { tab: "contact", icon: Phone, title: "Mobile, WhatsApp and links" },
  { tab: "practice", icon: Stethoscope, title: "Specialty, services and conditions" },
  { tab: "about", icon: ImageIcon, title: "About, awards and gallery" },
  { tab: "registration", icon: MapPin, title: "Registration and education" },
] as const;

export default async function AccountPage() {
  const me = await requireAccountPage();
  const settings = await getSettings();
  const what = [me.doctor ? "your website" : "", me.sites.length ? (me.sites.length === 1 ? "your site" : "your sites") : ""].filter(Boolean).join(" and ");

  return (
    <main className={me.doctor ? "max-w-3xl space-y-6 pb-24 pt-6 lg:pt-0" : "mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pt-12"}>
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Hello, {me.name}</h1>
        <p className="mt-2 text-body">You can update everything on {what} yourself. Changes show straight away.</p>
      </div>

      {me.doctor && <DoctorSections me={me} prices={settings.prices} updatePrice={settings.prices.updatePrice} />}
      {me.sites.length > 0 && <SiteSections me={me} prices={settings.prices} />}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

async function DoctorSections({ me, prices, updatePrice }: { me: CurrentAccount; prices: Parameters<typeof listRenewalPrice>[2]; updatePrice: number }) {
  const d = me.doctor!;
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const [uid, requests, newCount, monthCount, latest] = await Promise.all([
    ensureUid(DoctorProfile as never, d, "doctor"),
    UpdateRequest.find({ doctorId: d._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Inquiry.countDocuments({ doctorId: d._id, status: "new" }),
    Inquiry.countDocuments({ doctorId: d._id, createdAt: { $gte: monthAgo } }),
    Inquiry.find({ doctorId: d._id }).sort({ createdAt: -1 }).limit(4).lean(),
  ]);

  const live = d.status === "published" && d.citySlug && d.slug;
  const pagePath = live ? paths.doctor(d.citySlug!, d.slug!) : null;
  const priceLabel = d.freeUpdateUsed ? `₹${updatePrice.toLocaleString("en-IN")} per change` : "your first change is free";
  const status = displayRenewalStatus(d.renewalStatus, d.renewalDueDate);
  const renewalPrice = d.renewalPrice ?? listRenewalPrice("doctor", Boolean(d.founding || d.foundingDoctor), prices);

  return (
    <>
      <DoctorOverview
        counts={{ new: newCount, month: monthCount }}
        healthTipsOn={d.showHealthTips !== false}
        latest={latest.map((q) => ({
          id: String(q._id),
          name: q.name,
          phone: q.phone,
          ...(q.message ? { message: q.message } : {}),
          status: q.status,
          createdAt: q.createdAt.toISOString(),
          ...(q.preferredDate ? { preferredDate: q.preferredDate.toISOString() } : {}),
          ...(q.preferredTime ? { preferredTime: q.preferredTime } : {}),
        }))}
      />

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Your website</h2>
          <UidBadge uid={uid} />
        </div>
        {pagePath ? (
          <>
            <p className="break-all text-body">
              <a href={pagePath} target="_blank" rel="noopener" className="font-semibold text-ink underline">
                {absUrl(pagePath).replace(/^https?:\/\//, "")}
              </a>
              {d.subdomain && <span className="block text-sm text-muted-foreground">Also at {subdomainUrl(d.subdomain).replace(/^https?:\/\//, "")}</span>}
              {d.shortSlug && <span className="block text-sm text-muted-foreground">Short link: {absUrl(paths.short(d.shortSlug)).replace(/^https?:\/\//, "")}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={pagePath} target="_blank" rel="noopener" className={btn}>
                <ExternalLink className="size-4" strokeWidth={1.75} /> View website
              </a>
              <Link href="/account/card" className={btn}>
                <IdCard className="size-4" strokeWidth={1.75} /> Visiting card: share, download, print
              </Link>
            </div>
          </>
        ) : (
          <p className="text-body">
            {d.status === "suspended"
              ? "Your website is paused at the moment. Message us to turn it back on."
              : "Your website isn't live yet. We'll send you the link as soon as it is. You can already update your details."}
          </p>
        )}
        <RenewalLine due={d.renewalDueDate} status={status} price={renewalPrice} />
      </section>

      <section className={card}>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Update your website</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Everything on your website is yours to change.</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EDIT_LINKS.map(({ tab, icon: Icon, title }) => (
            <li key={tab}>
              <Link href={`/account/profile?tab=${tab}`} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink hover:border-ink/40">
                <span className="flex size-9 items-center justify-center rounded-lg bg-mist text-lagoon">
                  <Icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                {title}
                <PencilLine aria-hidden className="ml-auto size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Prefer us to do it?</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Tell us what to change and our team will do it for you ({priceLabel}). For your page address, quote your UID {uid}.</p>
        </div>
        <ChangeRequestForm priceLabel={priceLabel} />
        {requests.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ink">Recent requests</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {requests.map((r) => (
                <li key={String(r._id)} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <span className="line-clamp-2 min-w-0 text-body">{r.description}</span>
                  <span className="shrink-0 text-right text-muted-foreground">
                    {STATUS_LABEL[r.status]}
                    <span className="block text-xs">{dateFmt.format(r.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Clinic and hospital sites owned by this email
// ---------------------------------------------------------------------------

async function SiteSections({ me, prices }: { me: CurrentAccount; prices: Parameters<typeof listRenewalPrice>[2] }) {
  const [areas, uids] = await Promise.all([
    Area.find({ _id: { $in: me.sites.map((s) => s.address?.areaId).filter(Boolean) } }).select({ name: 1 }).lean(),
    Promise.all(me.sites.map((s) => ensureUid(Establishment as never, s, s.kind === "hospital" ? "hospital" : "clinic"))),
  ]);
  const areaName = (id: unknown) => areas.find((a) => String(a._id) === String(id))?.name ?? "";

  return (
    <>
      {me.doctor && <h2 className="pt-4 font-display text-2xl font-semibold text-ink">{me.sites.length === 1 ? "Your clinic site" : "Your clinic and hospital sites"}</h2>}
      {me.sites.map((s, i) => {
        const product: RenewalProduct = s.kind;
        const status = displayRenewalStatus(s.renewalStatus, s.renewalDueDate);
        const live = s.status === "published" && s.citySlug && s.slug;
        const path = live ? sitePath({ kind: s.kind, citySlug: s.citySlug!, slug: s.slug! }) : null;
        const area = areaName(s.address?.areaId);
        return (
          <section key={String(s._id)} className={card} aria-labelledby={`site-${s._id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id={`site-${s._id}`} className="font-display text-xl font-semibold text-ink">
                  {s.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {s.kind === "hospital" ? "Hospital" : "Clinic"}
                  {area ? ` · ${area}` : ""}
                </p>
              </div>
              <UidBadge uid={uids[i]!} />
            </div>
            {path ? (
              <p className="break-all text-body">
                <a href={path} target="_blank" rel="noopener" className="font-semibold text-ink underline">
                  {absUrl(path).replace(/^https?:\/\//, "")}
                </a>
                {s.subdomain && <span className="block text-sm text-muted-foreground">Also at {subdomainUrl(s.subdomain).replace(/^https?:\/\//, "")}</span>}
              </p>
            ) : (
              <p className="text-body">This site isn&apos;t live yet. We&apos;ll send you the link as soon as it is. You can already update everything on it.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/account/site/${s._id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-700">
                <PencilLine className="size-4" strokeWidth={1.9} /> Update website
              </Link>
              {path && (
                <a href={path} target="_blank" rel="noopener" className={btn}>
                  <ExternalLink className="size-4" strokeWidth={1.75} /> View site
                </a>
              )}
              {path && status !== "lapsed" && (
                <a href={`${path}/card`} target="_blank" rel="noopener" className={btn}>
                  <IdCard className="size-4" strokeWidth={1.75} /> Visiting card
                </a>
              )}
            </div>
            <RenewalLine due={s.renewalDueDate} status={status} price={s.renewalPrice ?? listRenewalPrice(product, Boolean(s.founding), prices)} />
          </section>
        );
      })}
    </>
  );
}
