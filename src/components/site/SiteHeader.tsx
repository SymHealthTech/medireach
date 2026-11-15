import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { whatsappLink } from "@/lib/marketing";

/**
 * Placeholder public site header. Rebuilt per DESIGN_BRIEF.md §3.1 in Phase 6.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/">
          <LogoWordmark />
        </Link>
        <a
          href={whatsappLink("Hi, I'd like a MediReach page.")}
          target="_blank"
          rel="noopener"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:opacity-90"
        >
          Get my page
        </a>
      </div>
    </header>
  );
}
