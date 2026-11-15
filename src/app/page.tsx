import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { whatsappLink } from "@/lib/marketing";

/**
 * Placeholder homepage. The real homepage (DESIGN_BRIEF.md §3) is built in
 * Phase 6; this keeps `/` rendering in the meantime.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-5 py-24">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          Your patients search your name. Make sure they find you.
        </h1>
        <p className="text-lg text-ink-muted">
          A professional one-page website and digital visiting card for doctors in Pune.
        </p>
        <a
          href={whatsappLink("Hi, I'd like a MediReach page.")}
          target="_blank"
          rel="noopener"
          className="w-fit rounded-xl bg-brand px-5 py-3 font-semibold text-brand-fg hover:opacity-90"
        >
          Get my page on WhatsApp
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
