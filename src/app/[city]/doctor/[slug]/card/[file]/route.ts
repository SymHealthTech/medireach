import { CARD_FILES, cardFileResponse, type CardFile } from "@/lib/cards/render";
import { getLiveDoctor } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { SLUG_RE } from "@/lib/slug";

/**
 * Card downloads for published doctors: phone.png (1080 × 1920), print.png
 * (85 × 55 mm at 300 dpi) and print.pdf. Links carry ?v=<updatedAt>, so the
 * long CDN cache never serves an outdated card. ?download=1 saves as a file.
 */
export async function GET(req: Request, { params }: { params: Promise<{ city: string; slug: string; file: string }> }) {
  const { city, slug, file } = await params;
  if (!(file in CARD_FILES) || !SLUG_RE.test(city) || !SLUG_RE.test(slug)) return new Response("Not found", { status: 404 });
  const doctor = await getLiveDoctor(city, slug);
  if (!doctor) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return cardFileResponse(doctor, file as CardFile, {
    ready: await getReadyTemplates(),
    cacheControl: "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400",
    download,
  });
}
