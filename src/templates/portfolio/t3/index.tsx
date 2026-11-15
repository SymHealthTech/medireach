import ClassicPortfolio from "@/templates/portfolio/classic";
import { DevBanner } from "@/templates/DevBanner";
import type { PortfolioTemplateProps } from "@/templates/types";

/** Slot 3 — “Minimal Mono” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function PortfolioT3(props: PortfolioTemplateProps) {
  return (
    <>
      <DevBanner name="Minimal Mono" />
      <ClassicPortfolio {...props} />
    </>
  );
}
