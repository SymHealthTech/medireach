import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { LeadForm } from "@/components/marketing/LeadForm";
import { PageIntro } from "@/components/marketing/PageIntro";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { WHATSAPP_TEXT } from "@/content/marketing";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Contact – MediReach" },
  description: "Talk to MediReach on WhatsApp, by phone or email, or leave your number and we'll call you.",
  alternates: { canonical: absUrl("/contact") },
};

export default async function ContactPage() {
  const site = await getPublicSiteData();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@medireach.co.in";
  const row = "flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-body hover:border-ink/40";
  return (
    <main>
      <PageIntro eyebrow="Contact" title="Talk to us">
        <p>WhatsApp is quickest. We reply on working days, usually within a few hours.</p>
      </PageIntro>
      <section className="mx-auto grid max-w-content gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-3">
          <li>
            <WhatsAppLink href={whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.default)} placement="contact" className={row}>
              <WhatsAppIcon className="size-5 text-[#1f8f4e]" /> WhatsApp us
            </WhatsAppLink>
          </li>
          {site.contactPhone && (
            <li>
              <a href={`tel:+${site.contactPhone}`} className={row}>
                <Phone className="size-5 text-ink" strokeWidth={1.75} /> Call us
              </a>
            </li>
          )}
          <li>
            <a href={`mailto:${email}`} className={row}>
              <Mail className="size-5 text-ink" strokeWidth={1.75} /> {email}
            </a>
          </li>
          <li className={row}>
            <MapPin className="size-5 text-ink" strokeWidth={1.75} /> Sym HealthTech, Pune, Maharashtra
          </li>
        </ul>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <LeadForm source="homepage_form" title={<h2 className="mb-6 font-display text-2xl font-semibold text-ink">Leave your number</h2>} />
        </div>
      </section>
    </main>
  );
}
