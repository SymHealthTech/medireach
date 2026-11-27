"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, auditCtx } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { revalidateMasters } from "@/lib/public/revalidate";

/** Refresh every public page (profiles, hubs, sitemaps) on next visit. */
export const revalidateAllAction = adminAction({ schema: z.object({}), roles: ["superadmin"] }, async (_input, admin) => {
  revalidateMasters(); // also revalidates the doctors tag
  revalidatePath("/", "layout");
  await audit(auditCtx(admin), "seo.revalidate_all");
  return { at: new Date().toISOString() };
});
