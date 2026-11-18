import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Phone } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { WhatsAppIcon } from "@/components/marketing/WhatsAppLink";
import { displayPhone, getPublicSiteData, whatsappHref } from "@/lib/public/site-data";

/**
 * Shown instead of a site whose renewal wasn't paid after the grace period
 * (MEDIREACH_BUILD_PROMPT.md, Renewals). Deliberately says nothing about the
 * doctor or clinic; just that the page is unavailable and how to reach
 * MediReach. Nothing is deleted: recording the renewal restores the site.
 */

export const LAPSED_METADATA: Metadata = {
  title: { absolute: "Temporarily unavailable – MediReach" },
  robots: { index: false, follow: false },
};

export async function LapsedNotice() {
  const site = await getPublicSiteData();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex" aria-label="MediReach home">
          <LogoWordmark />
        </Link>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 shadow-soft">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sage">
            <Clock3 className="size-6 text-ink" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">This page is temporarily unavailable</h1>
          <p className="mt-3 text-body">Please check back soon. If you need help, contact MediReach.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={whatsappHref(site.whatsappNumber, "Hi, I'm asking about a MediReach page that shows as unavailable.")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700"
            >
              <WhatsAppIcon className="size-5" /> Message MediReach
            </a>
            {site.contactPhone && (
              <a
                href={`tel:+${site.contactPhone}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-line px-5 font-semibold text-ink hover:border-ink/40"
              >
                <Phone className="size-4" strokeWidth={2} /> {displayPhone(site.contactPhone)}
              </a>
            )}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Is this your site? Message us and we&apos;ll restore it as soon as the renewal is paid.</p>
        </div>
      </div>
    </main>
  );
}
