import "server-only";
import type { Model, Types } from "mongoose";
import { sendEmail } from "@/lib/integrations/email";
import { optionalEnv } from "@/lib/env";
import { MEDIREACH_PHONE } from "@/lib/site";
import { revalidateSiteRoute } from "@/lib/public/revalidate";
import {
  computeRenewalStatus,
  isPastGrace,
  istDay,
  listRenewalPrice,
  reminderToSend,
  type ReminderDay,
  type RenewalProduct,
} from "@/lib/renewals";
import { adminDigestEmail, ownerLapsedEmail, ownerReminderEmail, type DigestItem, type MediReachContact } from "@/lib/renewals-email";
import { getSettings } from "@/lib/settings";
import { absUrl, paths, sitePath } from "@/lib/site";
import type { RenewalStatus } from "@/lib/constants";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Daily renewals job (MEDIREACH_BUILD_PROMPT.md, Renewals). Run by the Vercel
 * cron (/api/cron/renewals) once a day, or by hand with `npm run renewals`.
 *
 * For every site with a renewal due date:
 *  1. Grace period over (Settings) → status `lapsed`: the page shows a short
 *     "temporarily unavailable" notice and is noindex. Nothing is deleted;
 *     recording a renewal payment restores it (lib/payments/apply.ts).
 *  2. Otherwise the stored status is kept in step with the due date
 *     (active / due / overdue).
 *  3. Reminder emails 30, 7 and 0 days before the due date, to the owner's
 *     email if set. Each reminder is claimed in the database before it is
 *     sent, so overlapping runs never send it twice; a failed send releases
 *     the claim and is retried the next day.
 *  4. One digest email to the MediReach team with everything above.
 *
 * `dryRun` reports what would happen without writing or sending anything.
 */

export interface RenewalJobItem {
  kind: RenewalProduct;
  id: string;
  name: string;
  due: string;
  days?: ReminderDay;
  ownerEmail?: string;
}

export interface RenewalJobResult {
  ranAt: string;
  dryRun: boolean;
  checked: number;
  statusUpdates: number;
  reminders: RenewalJobItem[];
  lapsed: RenewalJobItem[];
  failures: string[];
  digestSent: boolean;
}

interface Row {
  _id: Types.ObjectId;
  kind: RenewalProduct;
  name: string;
  citySlug?: string;
  slug?: string;
  ownerEmail?: string;
  founding: boolean;
  renewalPrice?: number;
  renewalDueDate: Date;
  renewalStatus: RenewalStatus;
  renewalRemindersSent: string[];
}

const RENEWAL_FIELDS = {
  citySlug: 1,
  slug: 1,
  ownerEmail: 1,
  founding: 1,
  renewalPrice: 1,
  renewalDueDate: 1,
  renewalStatus: 1,
  renewalRemindersSent: 1,
} as const;

async function loadRows(): Promise<Row[]> {
  const hasDue = { renewalDueDate: { $type: "date" } };
  const [doctors, sites] = await Promise.all([
    DoctorProfile.find(hasDue).select({ ...RENEWAL_FIELDS, title: 1, firstName: 1, lastName: 1, displayName: 1, foundingDoctor: 1 }).lean(),
    Establishment.find(hasDue).select({ ...RENEWAL_FIELDS, kind: 1, name: 1 }).lean(),
  ]);
  return [
    ...doctors.map(
      (d): Row => ({
        _id: d._id,
        kind: "doctor",
        name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
        citySlug: d.citySlug,
        slug: d.slug,
        ownerEmail: d.ownerEmail,
        founding: Boolean(d.founding || d.foundingDoctor),
        renewalPrice: d.renewalPrice,
        renewalDueDate: d.renewalDueDate!,
        renewalStatus: d.renewalStatus,
        renewalRemindersSent: d.renewalRemindersSent ?? [],
      }),
    ),
    ...sites.map(
      (e): Row => ({
        _id: e._id,
        kind: e.kind,
        name: e.name,
        citySlug: e.citySlug,
        slug: e.slug,
        ownerEmail: e.ownerEmail,
        founding: Boolean(e.founding),
        renewalPrice: e.renewalPrice,
        renewalDueDate: e.renewalDueDate!,
        renewalStatus: e.renewalStatus,
        renewalRemindersSent: e.renewalRemindersSent ?? [],
      }),
    ),
  ];
}

// One model per row type; the two collections share the renewal fields.
const modelOf = (r: Row) => (r.kind === "doctor" ? DoctorProfile : Establishment) as unknown as Model<{ renewalStatus: RenewalStatus; renewalRemindersSent: string[] }>;

function linkOf(r: Row): string | undefined {
  if (!r.citySlug || !r.slug) return undefined;
  return absUrl(r.kind === "doctor" ? paths.doctor(r.citySlug, r.slug) : sitePath({ kind: r.kind, citySlug: r.citySlug, slug: r.slug }));
}

/** Where the team's digest goes. */
export function renewalNotifyEmail(): string | undefined {
  return optionalEnv("RENEWAL_NOTIFY_EMAIL") || optionalEnv("LEAD_NOTIFY_EMAIL") || optionalEnv("ADMIN_EMAIL") || undefined;
}

export async function runRenewalJob(opts: { now?: Date; dryRun?: boolean } = {}): Promise<RenewalJobResult> {
  const now = opts.now ?? new Date();
  const dryRun = Boolean(opts.dryRun);
  const settings = await getSettings();
  const contact: MediReachContact = {
    whatsapp: settings.whatsappNumber || optionalEnv("NEXT_PUBLIC_WHATSAPP_NUMBER") || MEDIREACH_PHONE,
    phone: settings.contactPhone || MEDIREACH_PHONE,
    email: optionalEnv("NEXT_PUBLIC_SUPPORT_EMAIL") || "support@medireach.co.in",
  };

  const rows = await loadRows();
  const result: RenewalJobResult = { ranAt: now.toISOString(), dryRun, checked: rows.length, statusUpdates: 0, reminders: [], lapsed: [], failures: [], digestSent: false };
  const digest: { reminders: DigestItem[]; lapsed: DigestItem[] } = { reminders: [], lapsed: [] };

  for (const r of rows) {
    const Model = modelOf(r);
    const price = r.renewalPrice ?? listRenewalPrice(r.kind, r.founding, settings.prices);
    const site = { name: r.name, product: r.kind, due: r.renewalDueDate, price, ...(linkOf(r) ? { link: linkOf(r)! } : {}) };
    const item: RenewalJobItem = { kind: r.kind, id: String(r._id), name: r.name, due: r.renewalDueDate.toISOString(), ...(r.ownerEmail ? { ownerEmail: r.ownerEmail } : {}) };

    // Paused sites wait for a payment; nothing more to send.
    if (r.renewalStatus === "lapsed") continue;

    // 1. Grace period over → lapse.
    if (isPastGrace(r.renewalDueDate, settings.renewalGraceDays, now)) {
      result.lapsed.push(item);
      digest.lapsed.push({ ...site, ownerEmailed: Boolean(r.ownerEmail) });
      if (dryRun) continue;
      // Only lapse if it's still unpaid (a payment may have landed since we read it).
      const res = await Model.updateOne({ _id: r._id, renewalDueDate: r.renewalDueDate, renewalStatus: { $ne: "lapsed" } }, { $set: { renewalStatus: "lapsed" } });
      if (res.modifiedCount === 0) continue;
      try {
        revalidateSiteRoute({ kind: r.kind, citySlug: r.citySlug, slug: r.slug });
      } catch {
        // Outside Next (CLI run): cached pages refresh within a day on their own.
      }
      if (r.ownerEmail) {
        const sent = await sendEmail({ to: r.ownerEmail, ...ownerLapsedEmail(site, contact) });
        if (!sent.ok) result.failures.push(`Paused notice to ${r.ownerEmail} (${r.name})`);
      }
      continue;
    }

    // 2. Keep the stored status in step with the due date.
    const status = computeRenewalStatus(r.renewalDueDate, now);
    if (status !== r.renewalStatus) {
      result.statusUpdates++;
      if (!dryRun) await Model.updateOne({ _id: r._id, renewalStatus: { $ne: "lapsed" } }, { $set: { renewalStatus: status } });
    }

    // 3. Reminder.
    const reminder = reminderToSend(r.renewalDueDate, r.renewalRemindersSent, now);
    if (!reminder) continue;
    result.reminders.push({ ...item, days: reminder.days });
    digest.reminders.push({ ...site, days: reminder.days, ownerEmailed: Boolean(r.ownerEmail) });
    if (dryRun) continue;

    // Claim first: a second, overlapping run finds the key already there and skips.
    const claimed = await Model.updateOne(
      { _id: r._id, renewalRemindersSent: { $ne: reminder.key } },
      { $addToSet: { renewalRemindersSent: { $each: reminder.markSent } } },
    );
    if (claimed.modifiedCount === 0) {
      result.reminders.pop();
      digest.reminders.pop();
      continue;
    }
    if (r.ownerEmail) {
      const sent = await sendEmail({ to: r.ownerEmail, ...ownerReminderEmail(site, reminder.days, contact, now) });
      if (!sent.ok) {
        result.failures.push(`${reminder.days}-day reminder to ${r.ownerEmail} (${r.name})`);
        await Model.updateOne({ _id: r._id }, { $pull: { renewalRemindersSent: reminder.key } });
      }
    }
  }

  // Drop reminder keys from earlier due dates (a payment moved the date on) so the list stays short.
  if (!dryRun) {
    for (const r of rows) {
      const current = `${istDay(r.renewalDueDate)}:`;
      const old = r.renewalRemindersSent.filter((k) => !k.startsWith(current));
      if (old.length) await modelOf(r).updateOne({ _id: r._id }, { $pull: { renewalRemindersSent: { $in: old } } });
    }
  }

  // 4. Digest to the team (only when there's something to report).
  const to = renewalNotifyEmail();
  if (!dryRun && to && (digest.reminders.length || digest.lapsed.length || result.failures.length)) {
    const sent = await sendEmail({ to, ...adminDigestEmail({ ...digest, failures: result.failures, adminUrl: absUrl("/admin/payments/renewals") }) });
    result.digestSent = sent.ok;
  }
  return result;
}
