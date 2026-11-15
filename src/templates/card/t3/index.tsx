import ClassicCard from "@/templates/card/classic";
import type { CardTemplateProps } from "@/templates/types";

/** Card slot 3 — “Minimal” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function CardT3(props: CardTemplateProps) {
  return <ClassicCard {...props} devBanner="Minimal" />;
}
