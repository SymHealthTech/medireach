import { Check, Star } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ, PRICING, WHATSAPP_TEXT } from "@/content/marketing";
import { gstNote, rupees, whatsappHref, type PublicSiteData } from "@/lib/public/site-data";
import { cn } from "@/lib/cn";
import { WhatsAppLink } from "./WhatsAppLink";

/** Shared marketing building blocks (homepage + /pricing). */

export function SectionTitle({ children, id, light, className }: { children: React.ReactNode; id?: string; light?: boolean; className?: string }) {
  return (
    <h2 id={id} className={cn("font-display text-[28px] font-semibold leading-[1.15] lg:text-[40px]", light ? "text-paper" : "text-ink", className)}>
      {children}
    </h2>
  );
}

/** "First 100 doctors get free hosting forever. 63 spots left" with a slim progress bar. */
export function FoundingBanner({ site }: { site: PublicSiteData }) {
  const used = site.foundingTotal - site.foundingLeft;
  const pct = site.foundingTotal ? Math.round((used / site.foundingTotal) * 100) : 0;
  return (
    <div className="rounded-xl bg-marigold p-5 text-[#0e3b3c] sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <Star className="size-5 shrink-0 fill-current" strokeWidth={1.75} />
          Founding Doctor · {PRICING.founding.replace("{total}", String(site.foundingTotal))}
        </p>
        <p className="font-display text-2xl font-semibold">{PRICING.foundingLeft.replace("{n}", String(site.foundingLeft))}</p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#0e3b3c]/15"
        role="progressbar"
        aria-label="Founding Doctor spots taken"
        aria-valuemin={0}
        aria-valuemax={site.foundingTotal}
        aria-valuenow={used}
      >
        <div className="h-full rounded-full bg-[#0e3b3c]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PricingCards({ site }: { site: PublicSiteData }) {
  const href = whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.pricing);
  return (
    <div className="space-y-5">
      <FoundingBanner site={site} />
      <div className="grid gap-5 md:grid-cols-2">
        {PRICING.plans.map((plan, i) => (
          <article key={plan.key} className={cn("flex flex-col rounded-xl border bg-surface p-6 shadow-soft sm:p-8", i === 1 ? "border-ink" : "border-line")}>
            <h3 className="font-display text-2xl font-semibold text-ink">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
            <p className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold text-ink">{rupees(site.prices[plan.key])}</span>
              <span className="text-sm text-muted-foreground">one time</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-3 text-body">
                  <Check className="mt-0.5 size-5 shrink-0 text-leaf" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
            <WhatsAppLink
              href={href}
              placement={`pricing_${plan.key}`}
              className={cn(
                "mt-8 inline-flex min-h-12 items-center justify-center rounded-[10px] px-5 font-semibold active:scale-[.98]",
                i === 1 ? "bg-ink text-paper hover:bg-ink-700" : "border border-ink text-ink hover:bg-sage",
              )}
            >
              {PRICING.cta}
            </WhatsAppLink>
          </article>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {PRICING.notes.replace("{update}", rupees(site.prices.update)).replace("{gst}", gstNote(site.gstMode))}
      </p>
    </div>
  );
}

/** FAQ accordion — native <details name> so only one is open at a time, no JS. */
export function FaqList({ items = FAQ.items }: { items?: { q: string; a: string }[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <div className="divide-y divide-line rounded-xl border border-line bg-surface">
        {items.map((f, i) => (
          <details key={f.q} name="faq" open={i === 0} className="group px-5 py-1 sm:px-6">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-2xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-5 text-body">{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
