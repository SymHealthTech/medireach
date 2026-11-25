import { z } from "zod";
import { HEALTH_TIPS } from "@/content/health-tips";
import { HEALTH_TIPS_SHOWN } from "@/lib/health-tips";

/**
 * The doctor's Health tips setting (/account/health-tips): show the section or
 * not, and which general articles it shows (content/health-tips.ts).
 */
export const healthTipsSchema = z.object({
  show: z.boolean(),
  /** Chosen tips; empty = automatic. Unknown slugs are dropped. */
  slugs: z
    .array(z.string().max(100))
    .max(HEALTH_TIPS_SHOWN)
    .transform((a) => a.filter((s) => HEALTH_TIPS.some((t) => t.slug === s))),
});
