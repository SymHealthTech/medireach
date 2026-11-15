/**
 * The MediReach square mark — a bold geometric "M" on ink with a marigold dot
 * — as an ImageResponse element, shared by app/icon.tsx, app/apple-icon.tsx
 * and scripts/make-favicon.tsx. Drawn as an SVG path (not a font glyph) so the
 * strokes stay heavy and readable at 16 px.
 */
export function brandIconElement(size: number) {
  return (
    <div style={{ width: size, height: size, display: "flex" }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect width="100" height="100" rx="22" fill="#0E3B3C" />
        <path d="M20 76V24h14l16 24 16-24h14v52H67V47L50 71 33 47v29z" fill="#FBF8F3" />
        <circle cx="83" cy="83" r="8" fill="#E3A23B" />
      </svg>
    </div>
  );
}
