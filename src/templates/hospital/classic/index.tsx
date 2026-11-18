import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Hospital site, slot 1 — Classic (DESIGN_BRIEF.md §8), skinned by the specialty theme. */
export default function HospitalClassic(props: SiteTemplateProps) {
  return <ClassicSite {...props} />;
}
