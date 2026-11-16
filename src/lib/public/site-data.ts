import "server-only";
import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/public/tags";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";

/**
 * What marketing pages show from the database: prices, GST note, contact
 * numbers and Founding Doctor spots left. Cached; refreshed when Settings are
 * saved or a doctor's Founding flag changes (and at least every 10 minutes).
 */
export interface PublicSiteData {
  prices: { gp: number; consultant: number; update: number };
  gstMode: "inclusive" | "exclusive" | "none";
  whatsappNumber: string;
  contactPhone?: string;
  foundingTotal: number;
  foundingLeft: number;
}

export const getPublicSiteData = unstable_cache(
  async (): Promise<PublicSiteData> => {
    await connectToDatabase();
    const [s, foundingUsed] = await Promise.all([getSettings(), DoctorProfile.countDocuments({ foundingDoctor: true })]);
    return {
      prices: s.prices,
      gstMode: s.gstMode,
      whatsappNumber: s.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919800000000",
      ...(s.contactPhone ? { contactPhone: s.contactPhone } : {}),
      foundingTotal: s.foundingTotal,
      foundingLeft: Math.max(0, s.foundingTotal - foundingUsed),
    };
  },
  ["public-site-data"],
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
