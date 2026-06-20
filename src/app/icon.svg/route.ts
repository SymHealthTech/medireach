/**
 * App icon / favicon (spec §2): the brand badge as a standalone square SVG,
 * with colors hard-set (not theme variables) since it's consumed by the OS /
 * browser outside the app's CSS context.
 */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="0" y="0" width="48" height="48" rx="12" fill="#0E7C7B"/>
  <path d="M12 12h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-7 6v-6h-3a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" fill="#FFFFFF"/>
  <path d="M14 23h5l3-6 4 12 3-6h5" fill="none" stroke="#0E7C7B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="15" cy="38" r="2.6" fill="#F2994A"/>
</svg>`;

export function GET() {
  return new Response(ICON_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
