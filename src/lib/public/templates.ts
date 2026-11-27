import "server-only";
import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/public/tags";
import { TemplateSlot } from "@/models/TemplateSlot";
import type { ReadyTemplates } from "@/templates/registry";

/** Which design slots are ready (cached; revalidated when a slot changes). */
export const getReadyTemplates = unstable_cache(
  async (): Promise<ReadyTemplates> => {
    await connectToDatabase();
    const slots = await TemplateSlot.find({ status: "ready" }).select({ type: 1, key: 1 }).lean();
    return {
      portfolio: slots.filter((s) => s.type === "portfolio").map((s) => s.key),
      clinic: slots.filter((s) => s.type === "clinic").map((s) => s.key),
      hospital: slots.filter((s) => s.type === "hospital").map((s) => s.key),
    };
  },
  // v2: now also carries clinic/hospital slots.
  ["public-ready-templates-v2"],
  { tags: [CACHE_TAGS.templates], revalidate: 86400 },
);
