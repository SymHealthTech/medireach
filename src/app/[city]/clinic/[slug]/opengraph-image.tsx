import { OG_SIZE, renderSiteOgImage } from "@/lib/og/site-og";

/** Link preview image (WhatsApp, social). */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Clinic on MediReach";
export const revalidate = 86400;

export default async function OgImage({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  return renderSiteOgImage("clinic", city, slug);
}
