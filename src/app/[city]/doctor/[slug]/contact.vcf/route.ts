import { getLiveDoctor } from "@/lib/public/data";
import { SLUG_RE } from "@/lib/slug";
import { doctorVcard } from "@/lib/vcard";

/** /[city]/doctor/[slug]/contact.vcf — "Save contact" download. */
export async function GET(_req: Request, { params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  const d = SLUG_RE.test(city) && SLUG_RE.test(slug) ? await getLiveDoctor(city, slug) : null;
  if (!d) return new Response("Not found", { status: 404 });

  return new Response(doctorVcard(d), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.vcf"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
