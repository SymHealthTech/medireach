import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { FOOTER } from "@/content/marketing";

/** Ink footer (DESIGN_BRIEF.md §3.12). */
export function MarketingFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <LogoWordmark tone="light" />
          <p className="text-sm text-paper/70">{FOOTER.line}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:flex sm:gap-6">
            {FOOTER.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-paper/85 hover:text-paper hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-content px-4 pb-8 text-xs text-paper/60 sm:px-6">© {new Date().getFullYear()} MediReach</p>
    </footer>
  );
}
