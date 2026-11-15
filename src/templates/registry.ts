import type { ComponentType } from "react";
import ClassicPortfolio from "@/templates/portfolio/classic";
import type { PortfolioTemplateProps } from "@/templates/types";
import { DEFAULT_TEMPLATE_KEY, type TemplateKey } from "@/lib/constants";

/**
 * Template registry. Phase 5 adds the t2–t5 portfolio slots and all card
 * templates; any key without a component (or whose slot isn't `ready`) falls
 * back to Classic.
 */
export const portfolioTemplates: Partial<Record<TemplateKey, ComponentType<PortfolioTemplateProps>>> = {
  classic: ClassicPortfolio,
};

export function resolvePortfolioTemplate(key: string): ComponentType<PortfolioTemplateProps> {
  return portfolioTemplates[key as TemplateKey] ?? portfolioTemplates[DEFAULT_TEMPLATE_KEY]!;
}
