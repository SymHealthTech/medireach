import ClassicPortfolio from "@/templates/portfolio/classic";
import { DevBanner } from "@/templates/DevBanner";
import type { PortfolioTemplateProps } from "@/templates/types";

/** Slot 5 — “Specialist Pro” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function PortfolioT5(props: PortfolioTemplateProps) {
  return (
    <>
      <DevBanner name="Specialist Pro" />
      <ClassicPortfolio {...props} />
    </>
  );
}
