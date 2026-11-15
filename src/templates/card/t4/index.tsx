import ClassicCard from "@/templates/card/classic";
import type { CardTemplateProps } from "@/templates/types";

/** Card slot 4 — “Heritage” (DESIGN_BRIEF.md §7). Placeholder: renders Classic until designed. */
export default function CardT4(props: CardTemplateProps) {
  return <ClassicCard {...props} devBanner="Heritage" />;
}
