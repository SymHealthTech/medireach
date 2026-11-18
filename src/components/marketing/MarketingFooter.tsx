import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { FOOTER } from "@/content/marketing";

/** Ink footer (DESIGN_BRIEF.md §4.15): logo + line, Products · Company · Legal columns, ©. */
export function MarketingFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-2">
          <LogoWordmark tone="light" />
          <p className="text-sm text-paper/70">{FOOTER.line}</p>
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
