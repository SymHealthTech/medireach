import "server-only";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { connectToDatabase } from "@/lib/db";
import { DEFAULT_UPDATE_PRICE, FOUNDING_TOTAL_DEFAULT } from "@/lib/constants";
import { DEFAULT_WHATSAPP_SHARE_TEMPLATE, Setting, SETTINGS_KEY } from "@/models/Setting";

/** Site settings as a plain object, with defaults filled in. */
export interface SiteSettings {
  prices: { gp: number; consultant: number; update: number };
  foundingTotal: number;
  contactPhone?: string;
  whatsappNumber?: string;
  gstMode: "inclusive" | "exclusive" | "none";
  whatsappShareTemplate: string;
  /** Active banned-phrase list (override if saved, else defaults). */
  bannedPhrases: string[];
  bannedPhrasesOverridden: boolean;
}

export async function getSettings(): Promise<SiteSettings> {
  await connectToDatabase();
  const s = await Setting.findOne({ key: SETTINGS_KEY }).lean();
  return {
    prices: {
      gp: s?.prices?.gp ?? 1999,
      consultant: s?.prices?.consultant ?? 2999,
      update: s?.prices?.update ?? DEFAULT_UPDATE_PRICE,
    },
    foundingTotal: s?.foundingTotal ?? FOUNDING_TOTAL_DEFAULT,
    ...(s?.contactPhone ? { contactPhone: s.contactPhone } : {}),
    ...(s?.whatsappNumber ? { whatsappNumber: s.whatsappNumber } : {}),
    gstMode: s?.gstMode ?? "inclusive",
    whatsappShareTemplate: s?.whatsappShareTemplate || DEFAULT_WHATSAPP_SHARE_TEMPLATE,
    bannedPhrases: s?.bannedPhrases?.length ? s.bannedPhrases : [...DEFAULT_BANNED_PHRASES],
    bannedPhrasesOverridden: Boolean(s?.bannedPhrases?.length),
  };
}
