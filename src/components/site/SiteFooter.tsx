import { LogoWordmark } from "@/components/brand/Logo";
import { SUPPORT_EMAIL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/marketing";

/**
 * Placeholder public site footer. Rebuilt per DESIGN_BRIEF.md §3.12 in Phase 6.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-raised">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <LogoWordmark />
          <p className="text-sm text-ink-muted">A Sym HealthTech product, Pune</p>
        </div>
        <div className="space-y-2 text-sm">
          <a href={whatsappLink()} target="_blank" rel="noopener" className="block text-ink-muted hover:text-ink">
            WhatsApp: +{WHATSAPP_NUMBER}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-ink-muted hover:text-ink">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-ink-muted">© {new Date().getFullYear()} MediReach</p>
    </footer>
  );
}
