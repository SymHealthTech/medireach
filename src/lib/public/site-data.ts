import "server-only";
import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/public/tags";
import { getSettings } from "@/lib/settings";
import { countFoundingCustomers } from "@/lib/founding";
import type { PriceKey } from "@/lib/constants";

/**
 * What marketing pages show from the database: prices, GST note, contact
 * numbers, renewal grace period and Founding spots left (across all products).
 * Cached; refreshed when Settings are saved or a Founding flag changes (and at
 * least every 10 minutes).
 */
export interface PublicSiteData {
  prices: Record<PriceKey, number>;
  gstMode: "inclusive" | "exclusive" | "none";
  whatsappNumber: string;
  contactPhone?: string;
  foundingTotal: number;
  foundingLeft: number;
  renewalGraceDays: number;
}

export const getPublicSiteData = unstable_cache(
  async (): Promise<PublicSiteData> => {
    await connectToDatabase();
    const [s, foundingUsed] = await Promise.all([getSettings(), countFoundingCustomers()]);
    return {
      prices: s.prices,
      gstMode: s.gstMode,
      whatsappNumber: s.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919800000000",
      ...(s.contactPhone ? { contactPhone: s.contactPhone } : {}),
      foundingTotal: s.foundingTotal,
      foundingLeft: Math.max(0, s.foundingTotal - foundingUsed),
      renewalGraceDays: s.renewalGraceDays,
    };
  },
  // Versioned key: the data cache can outlive a deploy, and v1 entries lack the v2 price keys.
  ["public-site-data-v2"],
  { tags: [CACHE_TAGS.settings, CACHE_TAGS.founding], revalidate: 600 },
);

/** "₹1,999". */
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function gstNote(mode: PublicSiteData["gstMode"]): string {
  return mode === "inclusive" ? "Prices include GST" : mode === "exclusive" ? "Prices exclude GST" : "No GST applicable";
}

/** WhatsApp click-to-chat link. */
export function whatsappHref(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** "+91 98000 00001" from digits. */
export function displayPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  const m = /^91(\d{5})(\d{5})$/.exec(d);
  return m ? `+91 ${m[1]} ${m[2]}` : `+${d}`;
}
