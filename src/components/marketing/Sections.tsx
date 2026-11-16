import { Check, Star } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ, PRICING, WHATSAPP_TEXT } from "@/content/marketing";
import { gstNote, rupees, whatsappHref, type PublicSiteData } from "@/lib/public/site-data";
import { cn } from "@/lib/cn";
import { WhatsAppLink } from "./WhatsAppLink";

/** Shared marketing building blocks (homepage + /pricing). */

export function SectionTitle({ children, id, light, className }: { children: React.ReactNode; id?: string; light?: boolean; className?: string }) {
  return (
    <h2
      id={id}
      className={cn("font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] lg:text-[44px]", light ? "text-paper" : "text-ink", className)}
    >
      {children}
    </h2>
  );
}

/** Small uppercase label above a section title. */
export function Eyebrow({ children, light, className }: { children: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "mb-3 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]",
        light ? "text-marigold" : "text-lagoon",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-marigold" />
      {children}
    </p>
  );
}

/** "First 100 doctors get free hosting forever. 63 spots left" with a slim progress bar. */
export function FoundingBanner({ site }: { site: PublicSiteData }) {
  const used = site.foundingTotal - site.foundingLeft;
  const pct = site.foundingTotal ? Math.round((used / site.foundingTotal) * 100) : 0;
  return (
    <div className="mr-ink-bg relative overflow-hidden rounded-2xl p-5 text-[#fbf8f3] shadow-lift sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marigold text-[#0e3b3c] ring-4 ring-marigold/25">
            <Star className="size-6 fill-current" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-marigold">Founding Doctor</p>
            <p className="mt-0.5 font-medium text-[#fbf8f3]/90">{PRICING.founding.replace("{total}", String(site.foundingTotal))}</p>
          </div>
        </div>
        <p className="shrink-0 font-display text-3xl font-semibold text-marigold sm:text-right">
          {PRICING.foundingLeft.replace("{n}", String(site.foundingLeft))}
        </p>
      </div>
      <div
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#fbf8f3]/15"
        role="progressbar"
        aria-label="Founding Doctor spots taken"
        aria-valuemin={0}
        aria-valuemax={site.foundingTotal}
        aria-valuenow={used}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-[#f0c06a] to-marigold" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

export function PricingCards({ site }: { site: PublicSiteData }) {
  const href = whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.pricing);
  return (
    <div className="space-y-6">
      <FoundingBanner site={site} />
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        {PRICING.plans.map((plan) => {
          const featured = "tag" in plan;
          return (
            <article
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl p-7 sm:p-9",
                featured ? "mr-ink-bg text-[#fbf8f3] shadow-lift" : "border border-line bg-surface shadow-soft",
              )}
            >
              {featured && (
                <span className="absolute right-6 top-6 rounded-full bg-marigold px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0e3b3c]">
                  {plan.tag}
                </span>
              )}
              <h3 className={cn("font-display text-[26px] font-semibold", featured ? "text-[#fbf8f3]" : "text-ink")}>{plan.name}</h3>
              <p className={cn("mt-1 text-sm", featured ? "text-[#fbf8f3]/75" : "text-muted-foreground")}>{plan.audience}</p>
              <p className={cn("mt-6 flex items-baseline gap-2 border-b pb-6", featured ? "border-[#fbf8f3]/15" : "border-line")}>
                <span className={cn("font-display text-[52px] font-semibold leading-none tracking-tight", featured ? "text-marigold" : "text-ink")}>
                  {rupees(site.prices[plan.key])}
                </span>
                <span className={cn("text-sm", featured ? "text-[#fbf8f3]/70" : "text-muted-foreground")}>one time</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3.5">
                {plan.features.map((f) => (
                  <li key={f} className={cn("flex gap-3", featured ? "text-[#fbf8f3]/90" : "text-body")}>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        featured ? "bg-marigold text-[#0e3b3c]" : "bg-leaf/15 text-leaf",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <WhatsAppLink
                href={href}
                placement={`pricing_${plan.key}`}
                className={cn(
                  "mt-9 inline-flex min-h-12 items-center justify-center rounded-[10px] px-5 font-semibold transition-colors active:scale-[.98]",
                  featured ? "bg-marigold text-[#0e3b3c] hover:bg-[#ebb456]" : "bg-ink text-paper hover:bg-ink-700",
                )}
              >
                {PRICING.cta}
              </WhatsAppLink>
            </article>
          );
        })}
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
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-soft">
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
