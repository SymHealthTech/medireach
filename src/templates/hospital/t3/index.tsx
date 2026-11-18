import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Hospital site, slot 3 (DESIGN_BRIEF.md §11: reserved). Placeholder: renders Classic until designed. */
export default function HospitalT3(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Hospital Design 3" />
      <ClassicSite {...props} />
    </>
  );
}
