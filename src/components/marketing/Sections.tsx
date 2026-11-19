import { ArrowRight, Building2, Check, Hospital, Plus, Stethoscope } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ, PRICING, WHATSAPP_TEXT } from "@/content/marketing";
import { rupees, whatsappHref, type PublicSiteData } from "@/lib/public/site-data";
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

/** Per-plan look: icon and accent (doctor teal, hospital amber; clinic is the featured dark card). */
const PLAN_STYLE = {
  doctor: { Icon: Stethoscope, strip: "from-lagoon to-[#3fa8a6]", icon: "bg-sage text-lagoon", panel: "bg-mist ring-sage" },
  clinic: { Icon: Building2, strip: "from-marigold to-[#f7b77c]", icon: "bg-white/10 text-marigold", panel: "bg-white/[.06] ring-white/10" },
  hospital: { Icon: Hospital, strip: "from-marigold to-[#f7b77c]", icon: "bg-[#fdeedf] text-[#c46a1f]", panel: "bg-[#fff8f1] ring-[#fbe3cc]" },
} as const;

export function PricingCards({ site }: { site: PublicSiteData }) {
  const href = whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.pricing);
  const notes = PRICING.notes.replace("{update}", rupees(site.prices.updatePrice)).split(" · ");
  return (
    <div className="space-y-8">
      <div className="grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
        {PRICING.plans.map((plan) => {
          const featured = "featured" in plan && plan.featured;
          const st = PLAN_STYLE[plan.key];
          return (
            <article
              key={plan.key}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl p-6 sm:p-7",
                featured
                  ? "mr-ink-bg text-[#f7f9fa] shadow-lift ring-1 ring-marigold/40 pt-10 sm:pt-10 lg:-my-3 lg:pb-9 lg:pt-11"
                  : "mr-lift border border-line bg-surface shadow-soft",
              )}
            >
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", st.strip)} />
              {"tag" in plan && (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-b-lg bg-marigold px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_6px_14px_-6px_rgba(242,153,74,.9)]">
                  {plan.tag}
                </span>
              )}

              <div className="flex items-center gap-3">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", st.icon)}>
                  <st.Icon aria-hidden className="size-[22px]" strokeWidth={1.75} />
                </span>
                <h3 className={cn("font-display text-[22px] font-semibold leading-tight", featured ? "text-[#f7f9fa]" : "text-ink")}>{plan.name}</h3>
              </div>
              <p className={cn("mt-2 text-sm", featured ? "text-[#f7f9fa]/75" : "text-muted-foreground")}>{plan.audience}</p>

              <div className={cn("mt-5 rounded-xl px-4 py-3.5 ring-1", st.panel)}>
                <p className="flex items-baseline gap-2">
                  <span className={cn("font-display text-[40px] font-semibold leading-none tracking-tight", featured ? "text-marigold" : "text-ink")}>
                    {rupees(site.prices[plan.setup])}
                  </span>
                  <span className={cn("text-sm", featured ? "text-[#f7f9fa]/70" : "text-muted-foreground")}>{PRICING.setupLabel}</span>
                </p>
                <p className={cn("mt-1.5 text-sm font-medium", featured ? "text-[#f7f9fa]/85" : "text-body/80")}>
                  {PRICING.renewalLine.replace("{renewal}", rupees(site.prices[plan.renewal]))}
                </p>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
                {plan.features.map((f) => (
                  <li key={f} className={cn("flex gap-2.5", featured ? "text-[#f7f9fa]/90" : "text-body")}>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        featured ? "bg-marigold text-white" : "bg-leaf/15 text-leaf-text",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <WhatsAppLink
                href={href}
                placement={`pricing_${plan.key}`}
                className={cn(
                  "group mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 font-semibold transition-colors active:scale-[.98]",
                  featured
                    ? "bg-marigold text-white shadow-[0_10px_24px_-10px_rgba(242,153,74,.9)] hover:bg-marigold-700"
                    : "bg-lagoon text-white hover:bg-lagoon-700",
                )}
              >
                {PRICING.cta}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </WhatsAppLink>
            </article>
          );
        })}
      </div>
      <ul className="flex flex-wrap justify-center gap-2.5 text-sm text-body/80">
        {notes.map((n) => (
          <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 shadow-soft ring-1 ring-line">
            <Plus aria-hidden className="size-3.5 text-lagoon" strokeWidth={2.5} />
            {n}
          </li>
        ))}
      </ul>
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
