import "server-only";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { connectToDatabase } from "@/lib/db";
import { DEFAULT_PRICES, DEFAULT_RENEWAL_GRACE_DAYS, PRICE_KEYS, type PriceKey } from "@/lib/constants";
import { DEFAULT_WHATSAPP_SHARE_TEMPLATE, Setting, SETTINGS_KEY } from "@/models/Setting";

/** Site settings as a plain object, with defaults filled in. */
export interface SiteSettings {
  prices: Record<PriceKey, number>;
  renewalGraceDays: number;
  contactPhone?: string;
  whatsappNumber?: string;
  gstMode: "inclusive" | "exclusive" | "none";
  whatsappShareTemplate: string;
  /** Active banned-phrase list (override if saved, else defaults). */
  bannedPhrases: string[];
  bannedPhrasesOverridden: boolean;
}

/** Before migrate:v2 runs, a saved v1 GP price / update price stand in for the v2 doctor setup / update price. */
const LEGACY_PRICE_KEY: Partial<Record<PriceKey, string>> = { doctorSetup: "gp", updatePrice: "update" };

export async function getSettings(): Promise<SiteSettings> {
  await connectToDatabase();
  const s = await Setting.findOne({ key: SETTINGS_KEY }).lean();
  const stored = (s?.prices ?? {}) as Partial<Record<string, number>>;
  const price = (k: PriceKey) => stored[k] ?? (LEGACY_PRICE_KEY[k] ? stored[LEGACY_PRICE_KEY[k]] : undefined) ?? DEFAULT_PRICES[k];
  return {
    prices: Object.fromEntries(PRICE_KEYS.map((k) => [k, price(k)])) as Record<PriceKey, number>,
    renewalGraceDays: s?.renewalGraceDays ?? DEFAULT_RENEWAL_GRACE_DAYS,
    ...(s?.contactPhone ? { contactPhone: s.contactPhone } : {}),
    ...(s?.whatsappNumber ? { whatsappNumber: s.whatsappNumber } : {}),
    gstMode: s?.gstMode ?? "inclusive",
    whatsappShareTemplate: s?.whatsappShareTemplate || DEFAULT_WHATSAPP_SHARE_TEMPLATE,
    bannedPhrases: s?.bannedPhrases?.length ? s.bannedPhrases : [...DEFAULT_BANNED_PHRASES],
    bannedPhrasesOverridden: Boolean(s?.bannedPhrases?.length),
  };
}
