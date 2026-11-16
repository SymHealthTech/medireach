import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/PageIntro";
import { WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";

export const metadata: Metadata = { title: { absolute: "Doctor login – MediReach" }, robots: { index: false, follow: false } };

/** Placeholder until email-link login for doctors (Phase 7). */
export default async function LoginPage() {
  const site = await getPublicSiteData();
  return (
    <main className="pb-24">
      <PageIntro eyebrow="Doctors" title="Doctor login is coming soon">
        <p>
          Soon you&apos;ll be able to log in with your email to change timings, phone numbers and fees yourself. Until then, message us and
          we&apos;ll update your page.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <WhatsAppLink
          href={whatsappHref(site.whatsappNumber, "Hi, I'd like to update my MediReach page.")}
          placement="login"
          className="inline-flex min-h-12 items-center rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700"
        >
          Message us on WhatsApp
        </WhatsAppLink>
      </div>
    </main>
  );
}
