import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { CARD_FILES, cardFileResponse, type CardFile } from "@/lib/cards/render";

/**
 * Sample card downloads (phone.png, print.png, print.pdf), rendered from
 * fixtures. The photo lives in public/, so it is passed to the image renderer
 * as an absolute URL on this site.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string; file: string }> }) {
  const { key, file } = await params;
  const sample = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!sample || !(file in CARD_FILES)) return new Response("Not found", { status: 404 });
  const doctor = sample.photo?.url.startsWith("/") ? { ...sample, photo: { ...sample.photo, url: new URL(sample.photo.url, req.url).href } } : sample;
  return cardFileResponse(doctor, file as CardFile, {
    cacheControl: "public, max-age=3600, s-maxage=86400",
    download: new URL(req.url).searchParams.get("download") === "1",
  });
}
