import ClassicPortfolio from "@/templates/portfolio/classic";
import { DevBanner } from "@/templates/DevBanner";
import type { PortfolioTemplateProps } from "@/templates/types";

/** Slot 4 — “Warm Heritage” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function PortfolioT4(props: PortfolioTemplateProps) {
  return (
    <>
      <DevBanner name="Warm Heritage" />
      <ClassicPortfolio {...props} />
    </>
  );
}
