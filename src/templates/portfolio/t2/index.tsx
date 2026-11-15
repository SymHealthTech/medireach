import ClassicPortfolio from "@/templates/portfolio/classic";
import { DevBanner } from "@/templates/DevBanner";
import type { PortfolioTemplateProps } from "@/templates/types";

/** Slot 2 — “Clinic Modern” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function PortfolioT2(props: PortfolioTemplateProps) {
  return (
    <>
      <DevBanner name="Clinic Modern" />
      <ClassicPortfolio {...props} />
    </>
  );
}
