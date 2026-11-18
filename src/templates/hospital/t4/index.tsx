import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Hospital site, slot 4 (DESIGN_BRIEF.md §11: reserved). Placeholder: renders Classic until designed. */
export default function HospitalT4(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Hospital Design 4" />
      <ClassicSite {...props} />
    </>
  );
}
