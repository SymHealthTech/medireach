import { THEME_ICONS } from "@/themes/icons";
import type { SpecialtyTheme } from "@/themes/specialty";

/** Tiny page mock in a theme's colours: header band, soft hero, accent button. */
export function ThemeMiniPreview({ theme, name }: { theme: SpecialtyTheme; name?: string }) {
  const Icon = THEME_ICONS[theme.icon];
  const { primary, accent, soft } = theme.palette;
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-line bg-white text-[8px] leading-tight">
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ background: primary, color: "#fff" }}>
        <Icon className="size-2.5" strokeWidth={2} />
        <span className="truncate font-semibold">{name || theme.name}</span>
      </div>
      <div className="space-y-1 px-2 py-2" style={{ background: soft, color: primary }}>
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: primary, opacity: 0.85 }} />
        <div className="h-1 w-1/2 rounded-full" style={{ background: primary, opacity: 0.35 }} />
        <div className="mt-1 h-2.5 w-10 rounded" style={{ background: accent }} />
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 rounded" style={{ background: soft }} />
        ))}
      </div>
    </div>
  );
}
