import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Crumb, QuickFact } from "@/lib/seo/profile";

/**
 * Building blocks of the MediReach listing pages (the folder URLs, e.g.
 * /pune/doctor/dr-amit-shah-general-physician). A listing is MediReach's own
 * page about a doctor, clinic or hospital, in MediReach's look, pointing to
 * their own website on the subdomain. Google indexes both: the listing for
 * MediReach and the website for the doctor.
 */

export const listingCard = "rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6";

const btnBase = "inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition";
export const listingBtn = {
  primary: cn(btnBase, "bg-ink text-paper hover:bg-ink-700"),
  outline: cn(btnBase, "border border-line bg-paper text-ink hover:border-ink/40"),
};

export function ListingSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("space-y-3", className)}>
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

/** The big "their own website" panel: the link Google and patients should follow. */
export function WebsiteCallout({ name, url }: { name: string; url: string }) {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <aside className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="text-sm text-paper/75">Official website of {name}</p>
        <p className="break-all font-display text-xl font-semibold">{host}</p>
      </div>
      <a href={url} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-paper px-4 text-sm font-semibold text-ink hover:bg-mist">
        <Globe aria-hidden className="size-4" strokeWidth={1.9} /> Visit website
      </a>
    </aside>
  );
}

export function ChipList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((x) => (
        <li key={x} className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-body">
          {x}
        </li>
      ))}
    </ul>
  );
}

export function QuickFactList({ facts }: { facts: QuickFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {facts.map((f) => (
        <div key={f.question} className={listingCard}>
          <dt className="font-semibold text-ink">{f.question}</dt>
          <dd className="mt-1.5 text-body">{f.answer}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "More … in {area}" links back up the hierarchy (every crumb but Home and the page itself). */
export function MoreLinks({ crumbs }: { crumbs: Crumb[] }) {
  const links = crumbs.slice(1, -1).reverse();
  if (links.length === 0) return null;
  return (
    <ListingSection title="Find more on MediReach">
      <ul className="flex flex-wrap gap-2">
        {links.map((c, i) => (
          <li key={c.url}>
            <a href={c.url} className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40">
              {i === links.length - 1 ? `All of ${c.name}` : c.name}
            </a>
          </li>
        ))}
      </ul>
    </ListingSection>
  );
}
