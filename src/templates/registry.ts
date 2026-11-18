import type { ComponentType } from "react";
import CardClassic from "@/templates/card/classic";
import CardT2 from "@/templates/card/t2";
import CardT3 from "@/templates/card/t3";
import CardT4 from "@/templates/card/t4";
import CardT5 from "@/templates/card/t5";
import ClassicPortfolio from "@/templates/portfolio/classic";
import PortfolioT2 from "@/templates/portfolio/t2";
import PortfolioT3 from "@/templates/portfolio/t3";
import PortfolioT4 from "@/templates/portfolio/t4";
import PortfolioT5 from "@/templates/portfolio/t5";
import ClinicClassic from "@/templates/clinic/classic";
import ClinicT2 from "@/templates/clinic/t2";
import ClinicT3 from "@/templates/clinic/t3";
import ClinicT4 from "@/templates/clinic/t4";
import ClinicT5 from "@/templates/clinic/t5";
import HospitalClassic from "@/templates/hospital/classic";
import HospitalT2 from "@/templates/hospital/t2";
import HospitalT3 from "@/templates/hospital/t3";
import HospitalT4 from "@/templates/hospital/t4";
import HospitalT5 from "@/templates/hospital/t5";
import type { CardTemplateProps, PortfolioTemplateProps, SiteTemplateProps } from "@/templates/types";
import { DEFAULT_TEMPLATE_KEY, type TemplateKey } from "@/lib/constants";

/**
 * Template registry: one component per design slot. To ship a new design,
 * replace the slot's component (e.g. templates/portfolio/t2/index.tsx) and set
 * the slot to "Ready" in Dashboard → Design templates. Until then any slot
 * that isn't ready renders Classic, so data never needs to change.
 */
export const registry: {
  portfolio: Record<TemplateKey, ComponentType<PortfolioTemplateProps>>;
  card: Record<TemplateKey, ComponentType<CardTemplateProps>>;
  clinic: Record<TemplateKey, ComponentType<SiteTemplateProps>>;
  hospital: Record<TemplateKey, ComponentType<SiteTemplateProps>>;
} = {
  portfolio: { classic: ClassicPortfolio, t2: PortfolioT2, t3: PortfolioT3, t4: PortfolioT4, t5: PortfolioT5 },
  clinic: { classic: ClinicClassic, t2: ClinicT2, t3: ClinicT3, t4: ClinicT4, t5: ClinicT5 },
  hospital: { classic: HospitalClassic, t2: HospitalT2, t3: HospitalT3, t4: HospitalT4, t5: HospitalT5 },
  card: { classic: CardClassic, t2: CardT2, t3: CardT3, t4: CardT4, t5: CardT5 },
};

/** Back-compat alias used by the dashboard's template page. */
export const portfolioTemplates = registry.portfolio;

/** Keys whose slot status is "ready", per type (see lib/public/templates.ts). */
export interface ReadyTemplates {
  portfolio: readonly string[];
  card: readonly string[];
  clinic?: readonly string[];
  hospital?: readonly string[];
}

function resolve<T>(map: Record<TemplateKey, T>, key: string, ready: readonly string[] | undefined): T {
  const k = key as TemplateKey;
  if (map[k] && (k === DEFAULT_TEMPLATE_KEY || !ready || ready.includes(k))) return map[k];
  return map[DEFAULT_TEMPLATE_KEY];
}

/** Slot → component; a slot that isn't ready falls back to Classic. */
export function resolvePortfolioTemplate(key: string, ready?: ReadyTemplates): ComponentType<PortfolioTemplateProps> {
  return resolve(registry.portfolio, key, ready?.portfolio);
}

/** Clinic / hospital site slot → component (Classic unless the slot is ready). */
export function resolveSiteTemplate(kind: "clinic" | "hospital", key: string, ready?: ReadyTemplates): ComponentType<SiteTemplateProps> {
  return resolve(registry[kind], key, ready ? (ready[kind] ?? []) : undefined);
}

export function resolveCardTemplate(key: string, ready?: ReadyTemplates): ComponentType<CardTemplateProps> {
  return resolve(registry.card, key, ready?.card);
}
