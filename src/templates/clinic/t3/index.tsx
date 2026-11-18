import { DevBanner } from "@/templates/DevBanner";
import { ClassicSite } from "@/templates/site/ClassicSite";
import type { SiteTemplateProps } from "@/templates/types";

/** Clinic site, slot 3 — “Calm Minimal” (DESIGN_BRIEF.md §11). Placeholder: renders Classic until designed. */
export default function ClinicT3(props: SiteTemplateProps) {
  return (
    <>
      <DevBanner name="Calm Minimal" />
      <ClassicSite {...props} />
    </>
  );
}
