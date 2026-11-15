import ClassicCard from "@/templates/card/classic";
import type { CardTemplateProps } from "@/templates/types";

/** Card slot 2 — “Ink Bold” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function CardT2(props: CardTemplateProps) {
  return <ClassicCard {...props} devBanner="Ink Bold" />;
}
