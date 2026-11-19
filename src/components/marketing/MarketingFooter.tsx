import Link from "next/link";
import { Phone } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { FOOTER, WHATSAPP_TEXT } from "@/content/marketing";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";

/** Ink footer (DESIGN_BRIEF.md §4.15): logo + line + WhatsApp / call, Products · Company · Legal columns, ©. */
export async function MarketingFooter() {
  const site = await getPublicSiteData();
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-2">
          <LogoWordmark tone="light" />
          <p className="text-sm text-paper/70">{FOOTER.line}</p>
          <ul className="space-y-2 pt-3 text-sm">
            <li>
              <WhatsAppLink
                href={whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.default)}
                placement="footer"
                className="inline-flex items-center gap-2 text-paper/85 hover:text-paper hover:underline"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </WhatsAppLink>
            </li>
            <li>
              <a href={`tel:+${site.contactPhone}`} className="inline-flex items-center gap-2 text-paper/85 hover:text-paper hover:underline">
                <Phone aria-hidden className="size-4" strokeWidth={1.75} /> Call us
              </a>
            </li>
          </ul>
        </div>
        {FOOTER.columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-marigold">{col.title}</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-paper/85 hover:text-paper hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto max-w-content border-t border-paper/10 px-4 py-6 text-xs text-paper/60 sm:px-6">© {new Date().getFullYear()} MediReach</p>
    </footer>
  );
}
