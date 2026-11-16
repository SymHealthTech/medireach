import { Download, ExternalLink } from "lucide-react";
import { AccountEditor } from "@/components/account/AccountEditor";
import { ChangeRequestForm } from "@/components/account/ChangeRequestForm";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { ALL_DAYS } from "@/lib/doctors/form";
import type { AccountForm } from "@/lib/doctors/account";
import { getSettings } from "@/lib/settings";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { Area } from "@/models/Area";
import { UpdateRequest } from "@/models/UpdateRequest";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { new: "Received", in_progress: "In progress", done: "Done" } as const;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function AccountPage() {
  const me = await requireDoctorPage();
  const d = me.doctor;
  const [areas, requests, settings] = await Promise.all([
    Area.find({ _id: { $in: d.clinics.map((c) => c.areaId) } }).select({ name: 1 }).lean(),
    UpdateRequest.find({ doctorId: d._id }).sort({ createdAt: -1 }).limit(5).lean(),
    getSettings(),
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
  const v = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
  const priceLabel = d.freeUpdateUsed ? `₹${settings.prices.update.toLocaleString("en-IN")} per change` : "your first change is free";
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Hello, {me.name}</h1>
        <p className="mt-2 text-body">Keep your timings, phone numbers, address, fees and Beyond medicine story up to date. Changes show on your page straight away.</p>
      </div>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-6">
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
              <a href={`${pagePath}/card/print.pdf?v=${v}&download=1`} className={btn}>
                <Download className="size-4" strokeWidth={1.75} /> Card for printing (PDF)
              </a>
              <a href={`${pagePath}/card/phone.png?v=${v}&download=1`} className={btn}>
                <Download className="size-4" strokeWidth={1.75} /> Card for phone (image)
              </a>
            </div>
          </>
        ) : (
          <p className="text-body">
            {d.status === "suspended"
              ? "Your page is paused at the moment. Message us to turn it back on."
              : "Your page isn't live yet. We'll send you the link as soon as it is. You can already update your details below."}
          </p>
        )}
      </section>

      {initial.clinics.length > 0 ? (
        <AccountEditor initial={initial} />
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-body">Your clinics haven&apos;t been added yet. Use “Request a change” below and we&apos;ll add them.</p>
      )}

      <section className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Request a change</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">For anything else, like your photo, services, qualifications, a new clinic or your page design, our team makes the change for you.</p>
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
    </main>
  );
}
