import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { whatsappLink } from "@/lib/marketing";

/**
 * Public site header (spec §4.1): logo + minimal nav (How it works / Pricing /
 * Login) and an always-visible WhatsApp button — the channel this audience
 * actually uses to reach out.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/">
          <LogoWordmark />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/how-it-works" className="hidden text-ink-muted hover:text-ink sm:inline">
            How it works
          </Link>
          <Link href="/pricing" className="hidden text-ink-muted hover:text-ink sm:inline">
            Pricing
          </Link>
          <Link href="/login" className="text-ink-muted hover:text-ink">
            Login
          </Link>
          <Link href="/signup" className="text-ink-muted hover:text-ink">
            Sign up
          </Link>
          <ThemeToggle />
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener"
            className="rounded-xl bg-[#25D366] px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            WhatsApp us
          </a>
        </nav>
      </div>
    </header>
  );
}
