import Link from "next/link";
import { cn } from "@/lib/cn";

/** Payments | Renewals switch (both live under the "Payments & renewals" menu item). */
export function PaymentsTabs({ active }: { active: "payments" | "renewals" }) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors",
        active === key ? "bg-ink text-on-ink" : "text-muted-foreground hover:bg-accent hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Payments sections" className="inline-flex gap-1 rounded-xl border border-line bg-card p-1 shadow-soft">
      {tab("payments", "/admin/payments", "Payments")}
      {tab("renewals", "/admin/payments/renewals", "Renewals")}
    </nav>
  );
}
