import ClassicCard from "@/templates/card/classic";
import type { CardTemplateProps } from "@/templates/types";

/** Card slot 5 — “Photo Card” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function CardT5(props: CardTemplateProps) {
  return <ClassicCard {...props} devBanner="Photo Card" />;
}
