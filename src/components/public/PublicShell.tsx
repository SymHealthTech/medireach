import { LogoWordmark } from "@/components/brand/Logo";
import { absUrl } from "@/lib/site";

/**
 * Slim chrome for doctor profiles and hub pages. All links are absolute apex
 * URLs so the page is identical when served on a doctor's subdomain.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
        <a href={absUrl("/")} aria-label="MediReach home">
          <LogoWordmark />
        </a>
        <a href={absUrl("/")} className="text-sm font-medium text-muted hover:text-ink">
          For doctors
        </a>
      </div>
    </header>
  );
}

export function PublicFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="mt-16 bg-ink text-paper">
      <div className="mx-auto max-w-content space-y-4 px-4 py-10 text-sm sm:px-6">
        {children}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <LogoWordmark tone="light" />
            <p className="text-paper/70">A Sym HealthTech product, Pune</p>
          </div>
          <p className="text-paper/70">© {new Date().getFullYear()} MediReach</p>
        </div>
      </div>
    </footer>
  );
}
