import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Clinic site, slot 2 — “Bold Photo” (DESIGN_BRIEF.md §11). Placeholder: renders Classic until designed. */
export default function ClinicT2(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Bold Photo" />
      <ClassicSite {...props} />
    </>
  );
}
