import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ReceiptIndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { FoundingBadge, Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { oneOf, pageOf, PAGE_SIZE, param, type SearchParams } from "@/lib/admin/list";
import { RENEWAL_STATUS_LABEL, RENEWAL_STATUS_TONE } from "@/lib/admin/labels";
import type { RenewalStatus } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { whatsappHref } from "@/lib/public/site-data";
import { displayRenewalStatus, listRenewalPrice, renewalReminderText, type RenewalProduct } from "@/lib/renewals";
import { getSettings } from "@/lib/settings";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { PaymentDialog } from "../PaymentDialog";
import { PaymentsTabs } from "../PaymentsTabs";
import { ReminderButtons } from "./RenewalActions";

export const metadata: Metadata = { title: "Renewals" };

/**
 * Every site with a renewal: published sites and anything with a setup or due
 * date. Status is worked out live from the due date (a lapsed site stays
 * lapsed until paid), so the list is right even before the daily job runs.
 */

const PRODUCT_LABEL: Record<RenewalProduct | "addon", string> = {
  doctor: "Doctor portfolio",
  addon: "Doctor (add-on)",
  clinic: "Clinic",
  hospital: "Hospital",
};
const SHOWN_STATUSES = ["due", "overdue", "lapsed", "active"] as const satisfies readonly RenewalStatus[];
const HAS_RENEWAL = {
  $or: [{ status: "published" }, { renewalDueDate: { $type: "date" } }, { setupPaidAt: { $type: "date" } }],
};

/** WhatsApp needs country code; Indian numbers are stored as 10 digits or 91XXXXXXXXXX. */
const waNumber = (n?: string) => {
  const d = (n ?? "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d.length >= 11 ? d : undefined;
};

interface Row {
  key: string;
  target: { kind: "doctor" | "establishment"; id: string; name: string };
  product: RenewalProduct;
  productLabel: string;
  founding: boolean;
  foundingNumber?: number;
  price: number;
  due?: Date;
  status: RenewalStatus;
  greeting: string;
  phone?: string;
  link?: string;
  editHref?: string;
}

export default async function RenewalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/payments"));
  await connectToDatabase();
  const sp = await searchParams;
  const statusFilter = oneOf(param(sp, "status"), SHOWN_STATUSES);
  const productFilter = oneOf(param(sp, "product"), ["doctor", "clinic", "hospital"] as const);
  const page = pageOf(sp);
  const now = new Date();

  const [settings, doctors, establishments] = await Promise.all([
    getSettings(),
    DoctorProfile.find(HAS_RENEWAL)
      .select({
        title: 1,
        firstName: 1,
        lastName: 1,
        displayName: 1,
        plan: 1,
        founding: 1,
        foundingDoctor: 1,
        foundingNumber: 1,
        renewalPrice: 1,
        renewalDueDate: 1,
        renewalStatus: 1,
        mobile: 1,
        whatsapp: 1,
        status: 1,
        citySlug: 1,
        slug: 1,
        subdomain: 1,
      })
      .limit(5000)
      .lean(),
    Establishment.find(HAS_RENEWAL)
      .select({
        name: 1,
        kind: 1,
        founding: 1,
        foundingNumber: 1,
        renewalPrice: 1,
        renewalDueDate: 1,
        renewalStatus: 1,
        contact: 1,
        contactPerson: 1,
      })
      .limit(5000)
      .lean(),
  ]);

  const rows: Row[] = [
    ...doctors.map((d): Row => {
      const name = d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`;
      const founding = Boolean(d.founding || d.foundingDoctor);
      const live = d.status === "published" && d.citySlug && d.slug;
      return {
        key: `d-${d._id}`,
        target: { kind: "doctor", id: String(d._id), name },
        product: "doctor",
        productLabel: d.plan === "doctor_addon" || d.plan === "hospital" ? PRODUCT_LABEL.addon : PRODUCT_LABEL.doctor,
        founding,
        ...(d.foundingNumber ? { foundingNumber: d.foundingNumber } : {}),
        price: d.renewalPrice ?? listRenewalPrice("doctor", founding, settings.prices),
        ...(d.renewalDueDate ? { due: d.renewalDueDate } : {}),
        status: displayRenewalStatus(d.renewalStatus, d.renewalDueDate, now),
        greeting: name,
        ...(waNumber(d.whatsapp || d.mobile) ? { phone: waNumber(d.whatsapp || d.mobile) } : {}),
        ...(live
          ? {
              link: d.subdomain ? subdomainUrl(d.subdomain) : absUrl(paths.doctor(d.citySlug!, d.slug!)),
            }
          : {}),
        editHref: `/admin/doctors/${d._id}?step=business`,
      };
    }),
    ...establishments.map((e): Row => {
      const founding = Boolean(e.founding);
      const phone = waNumber(e.contact?.whatsapp || e.contactPerson?.phone || e.contact?.phones?.[0]);
      return {
        key: `e-${e._id}`,
        target: { kind: "establishment", id: String(e._id), name: e.name },
        product: e.kind,
        productLabel: PRODUCT_LABEL[e.kind],
        founding,
        ...(e.foundingNumber ? { foundingNumber: e.foundingNumber } : {}),
        price: e.renewalPrice ?? listRenewalPrice(e.kind, founding, settings.prices),
        ...(e.renewalDueDate ? { due: e.renewalDueDate } : {}),
        status: displayRenewalStatus(e.renewalStatus, e.renewalDueDate, now),
        greeting: e.contactPerson?.name || e.name,
        ...(phone ? { phone } : {}),
        editHref: `/admin/establishments/${e._id}?step=business`,
        // Public clinic/hospital links arrive with their pages (step 8).
      };
    }),
  ];

  const counts = {
    due: rows.filter((r) => r.status === "due").length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    lapsed: rows.filter((r) => r.status === "lapsed").length,
    noDate: rows.filter((r) => !r.due).length,
  };
  const filtered = rows
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => !productFilter || r.product === productFilter)
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity) || a.target.name.localeCompare(b.target.name));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = [
    {
      label: "Due in 30 days",
      n: counts.due,
      href: "?status=due",
      tone: "text-ink",
    },
    {
      label: "Overdue",
      n: counts.overdue,
      href: "?status=overdue",
      tone: "text-clay-text",
    },
    {
      label: "Lapsed",
      n: counts.lapsed,
      href: "?status=lapsed",
      tone: "text-muted-foreground",
    },
    {
      label: "No renewal date yet",
      n: counts.noDate,
      href: undefined,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      <PaymentsTabs active="renewals" />
      <p className="max-w-2xl text-muted-foreground">
        Renewals are due one year after setup, then yearly. After the due date a site stays live for {settings.renewalGraceDays} days, then
        it lapses (shown as “temporarily unavailable”, never deleted). Recording a renewal payment moves the date on by a year.
      </p>

      <section aria-label="Renewal summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => {
          const body = (
            <>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`font-display text-2xl font-semibold ${s.tone}`}>{s.n}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-card p-3 shadow-soft hover:border-ink/30">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="rounded-xl border border-line bg-card p-3 shadow-soft">
              {body}
            </div>
          );
        })}
      </section>

      <ListToolbar
        search={false}
        filters={[
          {
            name: "status",
            label: "Status",
            options: SHOWN_STATUSES.map((s) => ({
              value: s,
              label: RENEWAL_STATUS_LABEL[s],
            })),
          },
          {
            name: "product",
            label: "Product",
            options: (["doctor", "clinic", "hospital"] as const).map((p) => ({
              value: p,
              label: PRODUCT_LABEL[p],
            })),
          },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No renewals here"
          description="Sites appear here once they're published or a setup payment is recorded."
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
          {shown.map((r) => {
            // Reminders only once a renewal is coming up (or missed).
            const reminder =
              r.due && r.status !== "active"
                ? renewalReminderText({
                    name: r.greeting,
                    product: r.product,
                    due: r.due,
                    price: r.price,
                    ...(r.link ? { link: r.link } : {}),
                    now,
                  })
                : undefined;
            return (
              <li key={r.key} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    {r.editHref ? (
                      <Link href={r.editHref} className="truncate font-semibold text-ink hover:underline">
                        {r.target.name}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-ink">{r.target.name}</span>
                    )}
                    {r.founding && <FoundingBadge number={r.foundingNumber} />}
                    <Pill tone={RENEWAL_STATUS_TONE[r.status]}>{RENEWAL_STATUS_LABEL[r.status]}</Pill>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      r.productLabel,
                      r.due ? `Due ${formatDate(r.due)}` : "No due date yet",
                      `${formatINR(r.price)}/year${r.founding ? " (founding)" : ""}`,
                    ].join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reminder && <ReminderButtons text={reminder} {...(r.phone ? { whatsappHref: whatsappHref(r.phone, reminder) } : {})} />}
                  <PaymentDialog
                    fixed={r.target}
                    defaults={{
                      purpose: r.due ? "renewal" : "setup",
                      amount: r.due ? r.price : undefined,
                    }}
                    gstIncludedDefault={settings.gstMode !== "exclusive"}
                    trigger={
                      <Button size="sm">
                        <ReceiptIndianRupee /> {r.due ? "Record renewal" : "Record setup"}
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} />
    </div>
  );
}
