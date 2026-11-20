import Link from "next/link";
import { Building2, Hospital, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

export type ProductKind = "doctor" | "clinic" | "hospital";

const ICON = { doctor: UserRound, clinic: Building2, hospital: Hospital } as const;
export const PRODUCT_LABEL: Record<ProductKind, string> = { doctor: "Doctors", clinic: "Clinics", hospital: "Hospitals" };

/**
 * Doctors / Clinics / Hospitals switcher, the same split as the public
 * website (Get started, /designs, visiting cards). Each product has its own
 * forms, designs and card styles.
 */
export function KindTabs({
  label,
  active,
  hrefFor,
  kinds = ["doctor", "clinic", "hospital"],
  counts,
}: {
  label: string;
  active: ProductKind;
  hrefFor: (k: ProductKind) => string;
  kinds?: readonly ProductKind[];
  counts?: Partial<Record<ProductKind, number>>;
}) {
  return (
    <nav aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1 shadow-soft sm:inline-flex">
      {kinds.map((k) => {
        const Icon = ICON[k];
        const on = k === active;
        return (
          <Link
            key={k}
            href={hrefFor(k)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
              on ? "bg-ink text-on-ink" : "text-muted-foreground hover:bg-accent hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            {PRODUCT_LABEL[k]}
            {counts?.[k] !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs", on ? "bg-on-ink/15" : "bg-muted")}>{counts[k]}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
