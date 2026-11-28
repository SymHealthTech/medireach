import "server-only";
import type { Types } from "mongoose";
import type { WelcomeSite } from "@/lib/auth/login-email";
import type { IntakeKind } from "@/lib/constants";
import { websiteUrl } from "@/lib/site";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Intake } from "@/models/Intake";

/** Form statuses that move to "done" once their website is published. */
const OPEN = ["draft", "submitted", "in_review"] as const;

/**
 * Keep a website form's status in step with the site made from it: publishing
 * the site marks the form done ("Website live"); unpublishing it puts the form
 * back in review. Archived forms are left alone.
 */
export async function syncIntakeForSite(siteId: Types.ObjectId | string, published: boolean) {
  if (published) await Intake.updateMany({ "convertedTo.id": siteId, status: { $in: OPEN } }, { $set: { status: "done" } });
  else await Intake.updateMany({ "convertedTo.id": siteId, status: "done" }, { $set: { status: "in_review" } });
}

/**
 * Mark open forms whose website is already published as done (forms published
 * before the sync above existed, or published elsewhere). Cheap: only looks at
 * converted forms that are still open.
 */
export async function syncPublishedIntakes(kind?: IntakeKind) {
  const open = await Intake.find({ ...(kind ? { kind } : {}), status: { $in: OPEN }, convertedTo: { $exists: true } })
    .select({ convertedTo: 1 })
    .lean();
  if (open.length === 0) return;
  const doctorIds = open.filter((i) => i.convertedTo!.kind === "doctor").map((i) => i.convertedTo!.id);
  const siteIds = open.filter((i) => i.convertedTo!.kind !== "doctor").map((i) => i.convertedTo!.id);
  const [doctors, sites] = await Promise.all([
    doctorIds.length ? DoctorProfile.find({ _id: { $in: doctorIds }, status: "published" }).select({ _id: 1 }).lean() : [],
    siteIds.length ? Establishment.find({ _id: { $in: siteIds }, status: "published" }).select({ _id: 1 }).lean() : [],
  ]);
  const live = [...doctors, ...sites].map((d) => d._id);
  if (live.length) await Intake.updateMany({ "convertedTo.id": { $in: live }, status: { $in: OPEN } }, { $set: { status: "done" } });
}

export interface IntakeSiteInfo {
  href: string;
  status: string;
  photo?: string;
}

/** The website draft made from each form (editor link, its status and photo), for the forms list. */
export async function intakeSites(rows: { _id: Types.ObjectId; convertedTo?: { kind: IntakeKind; id: Types.ObjectId } }[]) {
  const doctorIds = rows.filter((r) => r.convertedTo?.kind === "doctor").map((r) => r.convertedTo!.id);
  const siteIds = rows.filter((r) => r.convertedTo && r.convertedTo.kind !== "doctor").map((r) => r.convertedTo!.id);
  const [doctors, sites] = await Promise.all([
    doctorIds.length ? DoctorProfile.find({ _id: { $in: doctorIds } }).select({ status: 1, photo: 1 }).lean() : [],
    siteIds.length ? Establishment.find({ _id: { $in: siteIds } }).select({ status: 1, logo: 1, coverPhoto: 1 }).lean() : [],
  ]);
  const out = new Map<string, IntakeSiteInfo>();
  for (const d of doctors) out.set(String(d._id), { href: `/admin/doctors/${d._id}`, status: d.status, photo: d.photo?.url });
  for (const s of sites) out.set(String(s._id), { href: `/admin/establishments/${s._id}`, status: s.status, photo: s.logo?.url ?? s.coverPhoto?.url });
  return new Map(rows.filter((r) => r.convertedTo && out.has(String(r.convertedTo.id))).map((r) => [String(r._id), out.get(String(r.convertedTo!.id))!]));
}

/**
 * What the welcome (login) email says about a website: its public link once
 * published, and the ref of the website form it was made from.
 */
export async function welcomeSiteFor(site: {
  _id: Types.ObjectId | string;
  kind: IntakeKind;
  status: string;
  citySlug?: string;
  slug?: string;
  subdomain?: string | null;
}): Promise<WelcomeSite> {
  const intake = await Intake.findOne({ "convertedTo.id": site._id }).sort({ updatedAt: -1 }).select({ ref: 1 }).lean();
  const live = site.status === "published" && site.citySlug && site.slug;
  return {
    ...(live ? { liveUrl: websiteUrl({ kind: site.kind, citySlug: site.citySlug!, slug: site.slug!, subdomain: site.subdomain }) } : {}),
    ...(intake?.ref ? { formRef: intake.ref } : {}),
  };
}
