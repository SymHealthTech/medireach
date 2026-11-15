import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { absUrl } from "@/lib/site";

/** Friendly 404 — also shown for unknown or unpublished doctor subdomains. */
export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <p className="rounded-full bg-sage px-3 py-1 text-sm text-ink">Page not found</p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink">This page isn&apos;t available.</h1>
        <p className="text-body">
          The doctor page you&apos;re looking for may have moved or is no longer published.
        </p>
        <a href={absUrl("/")} className="mt-2 inline-flex min-h-[44px] items-center rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700">
          Go to medireach.co.in
        </a>
      </main>
      <PublicFooter />
    </>
  );
}
