import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  DEFAULT_PRICES,
  DEFAULT_RENEWAL_GRACE_DAYS,
  FOUNDING_TOTAL_DEFAULT,
  GST_MODES,
  PRICE_KEYS,
  type PriceKey,
} from "@/lib/constants";

/**
 * Site-wide settings singleton (one document, `key: "global"`). Pricing shown
 * on the homepage is read from here, never hard-coded.
 */
export const SETTINGS_KEY = "global";

export const DEFAULT_WHATSAPP_SHARE_TEMPLATE =
  "Hello, here are my clinic details, timings and directions: {link}";

export interface SettingDoc {
  _id: Types.ObjectId;
  key: typeof SETTINGS_KEY;
  /** All prices (₹). Older documents may still hold v1 gp/consultant/update until migrate:v2 --drop-legacy. */
  prices: Record<PriceKey, number>;
  foundingTotal: number;
  /** Days after the renewal due date before a site lapses. */
  renewalGraceDays: number;
  contactPhone?: string;
  whatsappNumber?: string;
  gstMode: (typeof GST_MODES)[number];
  whatsappShareTemplate: string;
  /** Replaces DEFAULT_BANNED_PHRASES when set; unset = use the defaults. */
  bannedPhrases?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<SettingDoc>(
  {
    key: { type: String, required: true, unique: true, default: SETTINGS_KEY },
    prices: Object.fromEntries(PRICE_KEYS.map((k) => [k, { type: Number, default: DEFAULT_PRICES[k], min: 0 }])),
    foundingTotal: { type: Number, default: FOUNDING_TOTAL_DEFAULT, min: 0 },
    renewalGraceDays: { type: Number, default: DEFAULT_RENEWAL_GRACE_DAYS, min: 0, max: 365 },
    contactPhone: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    gstMode: { type: String, enum: GST_MODES, default: "inclusive" },
    whatsappShareTemplate: { type: String, default: DEFAULT_WHATSAPP_SHARE_TEMPLATE },
    bannedPhrases: { type: [String], default: undefined },
  },
  { timestamps: true },
);

export const Setting: Model<SettingDoc> =
  (mongoose.models.Setting as Model<SettingDoc>) ||
  mongoose.model<SettingDoc>("Setting", settingSchema);
