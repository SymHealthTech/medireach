import Link from "next/link";
import { CalendarClock, ExternalLink, IdCard } from "lucide-react";
import { AccountEditor } from "@/components/account/AccountEditor";
import { ChangeRequestForm } from "@/components/account/ChangeRequestForm";
import { SiteAccountEditor } from "@/components/account/SiteAccountEditor";
import { requireAccountPage, type CurrentAccount } from "@/lib/auth/doctor";
import { ALL_DAYS } from "@/lib/doctors/form";
import type { AccountForm } from "@/lib/doctors/account";
import type { OwnerSiteForm } from "@/lib/establishments/owner";
import { displayRenewalStatus, listRenewalPrice, type RenewalProduct } from "@/lib/renewals";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { getSettings } from "@/lib/settings";
import { absUrl, paths, sitePath, subdomainUrl } from "@/lib/site";
import type { RenewalStatus } from "@/lib/constants";
import { Area } from "@/models/Area";
import { UpdateRequest } from "@/models/UpdateRequest";
import { Inquiry } from "@/models/Inquiry";
import { DoctorOverview } from "@/components/account/DoctorOverview";

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

export default async function AccountPage() {
  const me = await requireAccountPage();
  const [settings, site] = await Promise.all([getSettings(), getPublicSiteData()]);
  const what = [me.doctor ? "your page" : "", me.sites.length ? (me.sites.length === 1 ? "your site" : "your sites") : ""].filter(Boolean).join(" and ");

  return (
    <main className={me.doctor ? "max-w-3xl space-y-6 pb-24 pt-6 lg:pt-0" : "mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pt-12"}>
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Hello, {me.name}</h1>
        <p className="mt-2 text-body">Keep {what} up to date. Changes show straight away.</p>
      </div>

      {me.doctor && <DoctorSections me={me} prices={settings.prices} updatePrice={settings.prices.updatePrice} />}

      {me.sites.length > 0 && (
        <SiteSections me={me} prices={settings.prices} waHref={whatsappHref(site.whatsappNumber, "Hi, I'd like a change on my MediReach site.")} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Doctor portfolio (unchanged editor; renewal line added)
// ---------------------------------------------------------------------------

async function DoctorSections({ me, prices, updatePrice }: { me: CurrentAccount; prices: Parameters<typeof listRenewalPrice>[2]; updatePrice: number }) {
  const d = me.doctor!;
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const [areas, requests, newCount, monthCount, latest] = await Promise.all([
    Area.find({ _id: { $in: d.clinics.map((c) => c.areaId) } }).select({ name: 1 }).lean(),
    UpdateRequest.find({ doctorId: d._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Inquiry.countDocuments({ doctorId: d._id, status: "new" }),
    Inquiry.countDocuments({ doctorId: d._id, createdAt: { $gte: monthAgo } }),
    Inquiry.find({ doctorId: d._id }).sort({ createdAt: -1 }).limit(4).lean(),
  ]);
  const areaName = (id: unknown) => areas.find((a) => String(a._id) === String(id))?.name ?? "";

  const initial: AccountForm = {
    mobile: d.mobile ?? "",
    whatsapp: d.whatsapp ?? "",
    clinics: d.clinics.map((c) => ({
      key: String(c._id),
      name: c.name,
      area: areaName(c.areaId),
      addressLine1: c.addressLine1,
      addressLine2: c.addressLine2 ?? "",
      pincode: c.pincode,
      mapsUrl: c.mapsUrl ?? "",
      phone: c.phone ?? "",
      timings: ALL_DAYS.map((day) => ({
        day,
        slots: (c.timings.find((t) => t.day === day)?.slots ?? []).map((s) => ({ open: s.open, close: s.close })),
      })),
      appointmentNote: c.appointmentNote ?? "",
      fee: c.fee ?? undefined,
      showFee: Boolean(c.showFee),
    })),
    interestsStory: { title: d.interestsStory?.title ?? "", body: d.interestsStory?.body ?? "" },
    ...(d.interestsPhoto
      ? {
          interestsPhoto: {
            publicId: d.interestsPhoto.publicId,
            url: d.interestsPhoto.url,
            ...(d.interestsPhoto.alt ? { alt: d.interestsPhoto.alt } : {}),
            caption: d.interestsPhoto.caption ?? "",
          },
        }
      : {}),
  };

  const live = d.status === "published" && d.citySlug && d.slug;
  const pagePath = live ? paths.doctor(d.citySlug!, d.slug!) : null;
  const priceLabel = d.freeUpdateUsed ? `₹${updatePrice.toLocaleString("en-IN")} per change` : "your first change is free";
  const status = displayRenewalStatus(d.renewalStatus, d.renewalDueDate);
  const renewalPrice = d.renewalPrice ?? listRenewalPrice("doctor", Boolean(d.founding || d.foundingDoctor), prices);

  return (
    <>
      <DoctorOverview
        counts={{ new: newCount, month: monthCount, total: monthCount }}
        articles={(d.blogPosts ?? []).filter((p) => p.status === "published").length}
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
        <h2 className="font-display text-xl font-semibold text-ink">Your page</h2>
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
                <ExternalLink className="size-4" strokeWidth={1.75} /> View page
              </a>
              <Link href="/account/card" className={btn}>
                <IdCard className="size-4" strokeWidth={1.75} /> Visiting card: share, download, print
              </Link>
            </div>
          </>
        ) : (
          <p className="text-body">
            {d.status === "suspended"
              ? "Your page is paused at the moment. Message us to turn it back on."
              : "Your page isn't live yet. We'll send you the link as soon as it is. You can already update your details below."}
          </p>
        )}
        <RenewalLine due={d.renewalDueDate} status={status} price={renewalPrice} />
      </section>

      {initial.clinics.length > 0 ? (
        <AccountEditor initial={initial} />
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-body">Your clinics haven&apos;t been added yet. Use “Request a change” below and we&apos;ll add them.</p>
      )}

      <section className={card}>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Request a change</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">For your photo, name, qualifications, registration, a new clinic or your page design, our team makes the change for you. Your about text, services and articles you can edit yourself.</p>
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

async function SiteSections({ me, prices, waHref }: { me: CurrentAccount; prices: Parameters<typeof listRenewalPrice>[2]; waHref: string }) {
  const areas = await Area.find({ _id: { $in: me.sites.map((s) => s.address?.areaId).filter(Boolean) } }).select({ name: 1 }).lean();
  const areaName = (id: unknown) => areas.find((a) => String(a._id) === String(id))?.name ?? "";

  return (
    <>
      {me.doctor && <h2 className="pt-4 font-display text-2xl font-semibold text-ink">{me.sites.length === 1 ? "Your clinic site" : "Your clinic and hospital sites"}</h2>}
      {me.sites.map((s) => {
        const product: RenewalProduct = s.kind;
        const status = displayRenewalStatus(s.renewalStatus, s.renewalDueDate);
        const live = s.status === "published" && s.citySlug && s.slug;
        const path = live ? sitePath({ kind: s.kind, citySlug: s.citySlug!, slug: s.slug! }) : null;
        const initial: OwnerSiteForm = {
          id: String(s._id),
          kind: s.kind,
          name: s.name,
          area: areaName(s.address?.areaId),
          address: {
            line1: s.address?.line1 ?? "",
            line2: s.address?.line2 ?? "",
            pincode: s.address?.pincode ?? "",
            landmark: s.address?.landmark ?? "",
            parkingNote: s.address?.parkingNote ?? "",
          },
          mapsUrl: s.mapsUrl ?? "",
          phones: s.contact?.phones?.length ? [...s.contact.phones] : [""],
          whatsapp: s.contact?.whatsapp ?? "",
          emergencyPhone: s.contact?.emergencyPhone ?? "",
          is24x7: Boolean(s.is24x7),
          timings: ALL_DAYS.map((day) => ({
            day,
            slots: (s.timings.find((t) => t.day === day)?.slots ?? []).map((x) => ({ open: x.open, close: x.close })),
          })),
          appointmentNote: s.appointmentNote ?? "",
          visitingHours: s.visitingHours ?? "",
        };
        return (
          <section key={String(s._id)} className={card} aria-labelledby={`site-${s._id}`}>
            <div className="space-y-2">
              <h2 id={`site-${s._id}`} className="font-display text-xl font-semibold text-ink">
                {s.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {s.kind === "hospital" ? "Hospital" : "Clinic"}
                {initial.area ? ` · ${initial.area}` : ""}
              </p>
              {path ? (
                <>
                  <p className="break-all text-body">
                    <a href={path} target="_blank" rel="noopener" className="font-semibold text-ink underline">
                      {absUrl(path).replace(/^https?:\/\//, "")}
                    </a>
                    {s.subdomain && <span className="block text-sm text-muted-foreground">Also at {subdomainUrl(s.subdomain).replace(/^https?:\/\//, "")}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href={path} target="_blank" rel="noopener" className={btn}>
                      <ExternalLink className="size-4" strokeWidth={1.75} /> View site
                    </a>
                    {status !== "lapsed" && (
                      <a href={`${path}/card`} target="_blank" rel="noopener" className={btn}>
                        <IdCard className="size-4" strokeWidth={1.75} /> Visiting card
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-body">This site isn&apos;t live yet. We&apos;ll send you the link as soon as it is. You can already update the details below.</p>
              )}
              <RenewalLine due={s.renewalDueDate} status={status} price={s.renewalPrice ?? listRenewalPrice(product, Boolean(s.founding), prices)} />
            </div>
            <div className="border-t border-line pt-5">
              <SiteAccountEditor initial={initial} />
            </div>
            <p className="text-sm text-muted-foreground">
              Need another change?{" "}
              <a href={waHref} target="_blank" rel="noopener" className="font-semibold text-ink underline">
                Message us on WhatsApp
              </a>
              .
            </p>
          </section>
        );
      })}
    </>
  );
}
