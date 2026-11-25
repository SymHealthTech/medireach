import Link from "next/link";
import { ArrowRight, CalendarCheck, Inbox, MessageCircle, Newspaper, Phone, UserRound } from "lucide-react";
import { formatPhone } from "@/lib/phone";
import { INQUIRY_STATUS_LABEL, preferredLabel, type InquiryStatus, type InquiryTime } from "@/lib/inquiries";
import { timeAgo } from "@/lib/format";

export interface OverviewInquiry {
  id: string;
  name: string;
  phone: string;
  message?: string;
  status: InquiryStatus;
  createdAt: string;
  preferredDate?: string;
  preferredTime?: InquiryTime;
}

export const STATUS_TONE: Record<InquiryStatus, string> = {
  new: "bg-marigold/15 text-[#9a4d0c]",
  contacted: "bg-sky-100 text-sky-800",
  booked: "bg-leaf/12 text-leaf-text",
  closed: "bg-mist text-muted-foreground",
};

/**
 * Top of the doctor's account: request counts, the latest requests and quick
 * links. Server component; links go to the full pages.
 */
export function DoctorOverview({
  counts,
  latest,
  healthTipsOn,
  base = "/account",
}: {
  counts: { new: number; month: number };
  latest: OverviewInquiry[];
  healthTipsOn: boolean;
  /** Where the account pages live (the demo dashboard has its own). */
  base?: string;
}) {
  const tiles = [
    { label: "New requests", value: counts.new, href: `${base}/inquiries?status=new`, icon: Inbox, tone: "bg-marigold text-white" },
    { label: "Requests in the last 30 days", value: counts.month, href: `${base}/inquiries`, icon: CalendarCheck, tone: "bg-lagoon text-white" },
    { label: "Health tips section", value: healthTipsOn ? "On" : "Off", href: `${base}/health-tips`, icon: Newspaper, tone: "bg-ink text-paper" },
  ];
  return (
    <section aria-label="Overview" className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className={`flex size-12 items-center justify-center rounded-xl ${t.tone}`}>
                <t.icon aria-hidden className="size-5" strokeWidth={2} />
              </span>
              <span>
                <span className="block font-display text-3xl font-semibold leading-none text-ink">{t.value}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-line bg-surface shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-ink">Latest appointment requests</h2>
          <Link href={`${base}/inquiries`} className="inline-flex items-center gap-1 text-sm font-semibold text-lagoon hover:text-ink">
            See all <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
            No requests yet. When a patient sends the form on your website, it appears here and in your email.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist font-semibold text-ink">{q.name[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{q.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[q.status]}`}>{INQUIRY_STATUS_LABEL[q.status]}</span>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[preferredLabel(q.preferredDate, q.preferredTime), q.message].filter(Boolean).join(" · ") || formatPhone(`91${q.phone}`)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</span>
                <span className="flex gap-1.5">
                  <a href={`tel:+91${q.phone}`} aria-label={`Call ${q.name}`} className="flex size-9 items-center justify-center rounded-lg border border-line text-ink hover:border-ink/40">
                    <Phone aria-hidden className="size-4" />
                  </a>
                  <a
                    href={`https://wa.me/91${q.phone}`}
                    target="_blank"
                    rel="noopener"
                    aria-label={`WhatsApp ${q.name}`}
                    className="flex size-9 items-center justify-center rounded-lg border border-line text-leaf-text hover:border-leaf/50"
                  >
                    <MessageCircle aria-hidden className="size-4" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`${base}/profile`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm shadow-soft hover:border-ink/30">
          <UserRound aria-hidden className="size-5 text-lagoon" />
          <span>
            <span className="block font-semibold text-ink">Edit your profile</span>
            <span className="text-muted-foreground">About text, services, conditions, languages and links.</span>
          </span>
        </Link>
        <Link href={`${base}/health-tips`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm shadow-soft hover:border-ink/30">
          <Newspaper aria-hidden className="size-5 text-lagoon" />
          <span>
            <span className="block font-semibold text-ink">Health tips</span>
            <span className="text-muted-foreground">Choose the two general articles on your website, or hide them.</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
