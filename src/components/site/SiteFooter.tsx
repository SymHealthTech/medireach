import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/marketing";

/**
 * Public site footer (spec §4.8): Privacy Policy, Medical Disclaimer, contact
 * (WhatsApp + email), and an "Existing user? Log in" link.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-raised">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <LogoWordmark />
          <p className="text-sm text-ink-muted">
            Voice-first clinic management for solo GPs and small clinics in India.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Legal</p>
          <Link href="/privacy-policy" className="block text-ink-muted hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/medical-disclaimer" className="block text-ink-muted hover:text-ink">
            Medical Disclaimer
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Contact</p>
          <a href={whatsappLink()} target="_blank" rel="noopener" className="block text-ink-muted hover:text-ink">
            WhatsApp: +{WHATSAPP_NUMBER}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-ink-muted hover:text-ink">
            {SUPPORT_EMAIL}
          </a>
          <Link href="/login" className="block text-brand hover:underline">
            Existing user? Log in
          </Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} MediReach — a product by SymHealthTech.
      </p>
    </footer>
  );
}
