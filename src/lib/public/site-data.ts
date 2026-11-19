import "server-only";
import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/public/tags";
import { getSettings } from "@/lib/settings";
import type { PriceKey } from "@/lib/constants";
import { MEDIREACH_PHONE } from "@/lib/site";

/**
 * What marketing pages show from the database: prices, contact numbers and the
 * renewal grace period. Cached; refreshed when Settings are saved (and at
 * least every 10 minutes).
 */
export interface PublicSiteData {
  prices: Record<PriceKey, number>;
  whatsappNumber: string;
  contactPhone: string;
  renewalGraceDays: number;
}

export const getPublicSiteData = unstable_cache(
  async (): Promise<PublicSiteData> => {
    await connectToDatabase();
    const s = await getSettings();
    return {
      prices: s.prices,
      whatsappNumber: s.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || MEDIREACH_PHONE,
      contactPhone: s.contactPhone || MEDIREACH_PHONE,
      renewalGraceDays: s.renewalGraceDays,
    };
  },
  // Versioned key: the data cache can outlive a deploy, and v1 entries lack the v2 price keys.
  ["public-site-data-v4"],
  { tags: [CACHE_TAGS.settings], revalidate: 600 },
);

/** "₹1,999". */
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** WhatsApp click-to-chat link. */
export function whatsappHref(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

