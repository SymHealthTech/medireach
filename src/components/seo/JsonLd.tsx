import { jsonLdString } from "@/lib/seo/profile";

/** Server-rendered JSON-LD block. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
