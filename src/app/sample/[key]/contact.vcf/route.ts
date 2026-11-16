import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { doctorVcard } from "@/lib/vcard";

/** /sample/[key]/contact.vcf — "Save contact" for the fictional sample doctors. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const d = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(doctorVcard(d), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample-${key}.vcf"`,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
