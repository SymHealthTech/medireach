import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Doctor } from "@/models/Doctor";
import { ACCOUNT_STATUSES, TIERS } from "@/lib/constants";

/**
 * Admin doctor/clinic list (spec §6.1). Filterable by account status and by
 * subscription tier (Change 7), plus a document-review filter for the
 * verification queue. Admin is the sole role permitted to query across all
 * doctors (§6.7); this route deliberately does not use the tenant-scoped helpers.
 */
export const GET = route({ roles: Roles.adminOnly }, async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const tier = url.searchParams.get("tier");
  const docReview = url.searchParams.get("documents"); // "submitted" for the review queue

  const filter: Record<string, unknown> = {};
  if (status && (ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    filter.accountStatus = status;
  }
  if (tier && (TIERS as readonly string[]).includes(tier)) {
    filter.tier = tier;
  }
  if (docReview) filter["verificationDocument.reviewStatus"] = docReview;

  const doctors = await Doctor.find(filter)
    .select("name appId email mobile accountStatus tier tierChangePending onboardingStep verificationDocument createdAt cycleStartDate")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return jsonOk({
    doctors: doctors.map((d) => ({
      id: String(d._id),
      name: d.name,
      appId: d.appId ?? null,
      email: d.email,
      mobile: d.mobile,
      accountStatus: d.accountStatus,
      tier: d.tier ?? "starter",
      pendingTier: d.tierChangePending?.toTier ?? null,
      onboardingComplete: d.onboardingStep >= 7,
      documentStatus: d.verificationDocument?.reviewStatus ?? null,
      documentType: d.verificationDocument?.type ?? null,
      createdAt: d.createdAt,
    })),
  });
});
