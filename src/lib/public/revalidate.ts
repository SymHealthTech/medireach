import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/public/tags";
import { paths } from "@/lib/site";

/**
 * On-demand revalidation. Call after publishing, editing, unpublishing or
 * suspending a doctor (pass the old route too if the slug changed) and after
 * any master-list edit. Hubs, sitemaps and the "other doctors" blocks all
 * depend on the `doctors` tag, so one call refreshes everything affected.
 */
export function revalidateDoctorPages(...routes: { citySlug?: string; slug?: string }[]): void {
  revalidateTag(CACHE_TAGS.doctors);
  for (const r of routes) {
    if (r.citySlug && r.slug) revalidatePath(paths.doctor(r.citySlug, r.slug));
  }
}

export function revalidateMasters(): void {
  revalidateTag(CACHE_TAGS.masters);
  revalidateTag(CACHE_TAGS.doctors);
}
