import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Clinic site, slot 4 — “Heritage” (DESIGN_BRIEF.md §11). Placeholder: renders Classic until designed. */
export default function ClinicT4(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Heritage" />
      <ClassicSite {...props} />
    </>
  );
}
