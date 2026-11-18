import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Clinic site, slot 5 — “Multi-doctor Grid” (DESIGN_BRIEF.md §11). Placeholder: renders Classic until designed. */
export default function ClinicT5(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Multi-doctor Grid" />
      <ClassicSite {...props} />
    </>
  );
}
