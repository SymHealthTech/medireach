import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag, revalidatePath }));

type Sent = { to: string; subject: string; text?: string; html: string };
const sent: Sent[] = [];
let failFor: string | null = null;
vi.mock("@/lib/integrations/email", () => ({
  sendEmail: async (m: Sent) => {
    if (failFor && m.to === failFor) return { ok: false };
    sent.push(m);
    return { ok: true };
  },
}));

const { connectToDatabase } = await import("@/lib/db");
const { reminderToSend, daysUntilDue, istDay } = await import("@/lib/renewals");
const { ownerReminderEmail, ownerLapsedEmail, adminDigestEmail } = await import("@/lib/renewals-email");
const { runRenewalJob } = await import("@/lib/renewals-job");
const { applyPaymentToRenewal } = await import("@/lib/payments/apply");
const { PUBLISHED_LIVE } = await import("@/lib/public/data");
const { scanText } = await import("@/lib/compliance/scan");
const { DoctorProfile } = await import("@/models/DoctorProfile");
const { Establishment } = await import("@/models/Establishment");

const DAY = 86_400_000;
/** Noon IST on a calendar date. */
const ist = (date: string) => new Date(`${date}T12:00:00+05:30`);
const NOW = ist("2027-03-01");
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_renewals_job_test";
  process.env.RENEWAL_NOTIFY_EMAIL = "team@example.com";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("which reminder to send", () => {
  it("counts calendar days in India time", () => {
    // 23:30 IST on 28 Feb is still the day before a 1 March due date.
    expect(daysUntilDue(new Date("2027-03-01T00:30:00+05:30"), new Date("2027-02-28T23:30:00+05:30"))).toBe(1);
    expect(istDay(new Date("2027-02-28T20:00:00Z"))).toBe("2027-03-01");
  });

  it("sends 30, 7 and 0 day reminders once each", () => {
    const due = ist("2027-04-01");
    expect(reminderToSend(due, [], ist("2027-02-28"))).toBeNull(); // 32 days out
    const r30 = reminderToSend(due, [], ist("2027-03-02"))!;
    expect(r30).toMatchObject({ days: 30, key: "2027-04-01:30" });
    expect(reminderToSend(due, r30.markSent, ist("2027-03-10"))).toBeNull(); // 22 days out: 30 already sent
    const r7 = reminderToSend(due, r30.markSent, ist("2027-03-25"))!;
    expect(r7.days).toBe(7);
    const r0 = reminderToSend(due, [...r30.markSent, ...r7.markSent], ist("2027-04-01"))!;
    expect(r0.days).toBe(0);
    expect(reminderToSend(due, [...r30.markSent, ...r7.markSent, ...r0.markSent], ist("2027-04-05"))).toBeNull();
  });

  it("catches up with only the current reminder after missed days", () => {
    const due = ist("2027-04-01");
    const late = reminderToSend(due, [], ist("2027-03-29"))!; // 3 days out, nothing sent yet
    expect(late.days).toBe(7);
    expect(late.markSent).toEqual(["2027-04-01:30", "2027-04-01:7"]);
    expect(reminderToSend(due, [], ist("2027-04-04"))!.days).toBe(0); // past due, due-date reminder missed
  });

  it("ignores keys from an earlier due date", () => {
    expect(reminderToSend(ist("2028-04-01"), ["2027-04-01:30", "2027-04-01:7", "2027-04-01:0"], ist("2028-03-05"))!.days).toBe(30);
  });
});

describe("renewal emails", () => {
  const site = { name: "Dr. <Asha> Sample", product: "clinic" as const, due: ist("2027-04-01"), price: 999, link: "https://sample.example" };
  const contact = { whatsapp: "919800000000", phone: "919800000001", email: "support@example.com" };

  it("states the date, price and how to pay, without banned phrases", () => {
    const e = ownerReminderEmail(site, 30, contact, ist("2027-03-02"));
    expect(e.subject).toBe("Your MediReach renewal is due on 1 April 2027");
    expect(e.text).toContain("₹999");
    expect(e.text).toContain("+91 98000 00000");
    expect(ownerReminderEmail(site, 0, contact, ist("2027-04-03")).subject).toBe("Your MediReach renewal was due on 1 April 2027");
    for (const m of [e, ownerReminderEmail(site, 7, contact), ownerLapsedEmail(site, contact)]) {
      expect(scanText(m.text)).toEqual([]);
      expect(m.text).not.toContain("!");
    }
  });

  it("escapes names in HTML", () => {
    expect(ownerReminderEmail(site, 7, contact).html).toContain("Dr. &lt;Asha&gt; Sample");
    const digest = adminDigestEmail({ reminders: [{ ...site, days: 7, ownerEmailed: false }], lapsed: [], failures: [], adminUrl: "https://x/admin" });
    expect(digest.html).toContain("&lt;Asha&gt;");
    expect(digest.text).toContain("no owner email: send the WhatsApp reminder");
  });
});

describe("daily renewals job", () => {
  const ids: Record<string, mongoose.Types.ObjectId> = {};

  beforeEach(() => {
    sent.length = 0;
    failFor = null;
    revalidateTag.mockClear();
    revalidatePath.mockClear();
  });

  it("plans without writing or sending in a dry run", async () => {
    const doctors = mongoose.connection.collection("doctorprofiles");
    const sites = mongoose.connection.collection("establishments");
    const base = { status: "published", renewalRemindersSent: [], createdAt: NOW, updatedAt: NOW };
    ids.dueSoon = (await doctors.insertOne({ ...base, title: "Dr.", firstName: "Asha", lastName: "Sample", citySlug: "pune", slug: "dr-asha", ownerEmail: "asha@example.com", renewalPrice: 499, renewalDueDate: inDays(30), renewalStatus: "active" })).insertedId;
    ids.farOff = (await doctors.insertOne({ ...base, title: "Dr.", firstName: "Far", lastName: "Off", renewalDueDate: inDays(200), renewalStatus: "due" })).insertedId;
    ids.week = (await sites.insertOne({ ...base, kind: "clinic", name: "Sample Week Clinic", citySlug: "pune", slug: "week-clinic", renewalDueDate: inDays(7), renewalStatus: "due", renewalRemindersSent: [`${istDay(inDays(7))}:30`] })).insertedId;
    ids.graceOver = (await sites.insertOne({ ...base, kind: "hospital", plan: "hospital", name: "Sample Late Hospital", citySlug: "pune", slug: "late-hospital", ownerEmail: "late@example.com", founding: true, renewalDueDate: inDays(-31), renewalStatus: "overdue" })).insertedId;
    ids.inGrace = (await sites.insertOne({ ...base, kind: "clinic", name: "Sample Grace Clinic", citySlug: "pune", slug: "grace-clinic", ownerEmail: "grace@example.com", renewalDueDate: inDays(-10), renewalStatus: "overdue", renewalRemindersSent: [`${istDay(inDays(-10))}:30`, `${istDay(inDays(-10))}:7`, `${istDay(inDays(-10))}:0`] })).insertedId;
    ids.alreadyLapsed = (await sites.insertOne({ ...base, kind: "clinic", name: "Sample Old Clinic", renewalDueDate: inDays(-90), renewalStatus: "lapsed" })).insertedId;

    const r = await runRenewalJob({ now: NOW, dryRun: true });
    expect(r.checked).toBe(6);
    expect(r.reminders.map((x) => [x.name, x.days])).toEqual([
      ["Dr. Asha Sample", 30],
      ["Sample Week Clinic", 7],
    ]);
    expect(r.lapsed.map((x) => x.name)).toEqual(["Sample Late Hospital"]);
    expect(sent).toEqual([]);
    expect((await Establishment.findById(ids.graceOver).lean())!.renewalStatus).toBe("overdue");
    expect((await DoctorProfile.findById(ids.dueSoon).lean())!.renewalRemindersSent).toEqual([]);
  });

  it("lapses, updates statuses, reminds owners and sends one digest", async () => {
    const r = await runRenewalJob({ now: NOW });
    expect(r.failures).toEqual([]);
    expect(r.digestSent).toBe(true);

    expect((await Establishment.findById(ids.graceOver).lean())!.renewalStatus).toBe("lapsed");
    expect((await DoctorProfile.findById(ids.farOff).lean())!.renewalStatus).toBe("active");
    expect((await DoctorProfile.findById(ids.dueSoon).lean())!.renewalRemindersSent).toEqual([`${istDay(inDays(30))}:30`]);
    expect((await Establishment.findById(ids.week).lean())!.renewalRemindersSent).toEqual(expect.arrayContaining([`${istDay(inDays(7))}:7`]));

    const to = sent.map((m) => m.to).sort();
    // Owner reminder (doctor), paused notice (hospital owner), team digest. The 7-day clinic has no owner email.
    expect(to).toEqual(["asha@example.com", "late@example.com", "team@example.com"]);
    expect(sent.find((m) => m.to === "asha@example.com")!.text).toContain("₹499");
    expect(sent.find((m) => m.to === "late@example.com")!.subject).toContain("paused");
    expect(sent.find((m) => m.to === "late@example.com")!.text).toContain("₹999"); // founding hospital renewal from Settings
    const digest = sent.find((m) => m.to === "team@example.com")!;
    expect(digest.subject).toBe("MediReach renewals: 2 reminders, 1 site paused");
    expect(digest.text).toContain("Sample Week Clinic");

    // The lapsed hospital's cached pages are refreshed.
    expect(revalidateTag).toHaveBeenCalledWith("establishments");
    expect(revalidatePath).toHaveBeenCalledWith("/pune/hospital/late-hospital");
  });

  it("sends nothing new when run again the same day", async () => {
    const r = await runRenewalJob({ now: NOW });
    expect(r.reminders).toEqual([]);
    expect(r.lapsed).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("releases a reminder whose email failed, so tomorrow retries it", async () => {
    await DoctorProfile.updateOne({ _id: ids.dueSoon }, { $set: { renewalRemindersSent: [] } });
    failFor = "asha@example.com";
    const r = await runRenewalJob({ now: NOW });
    expect(r.failures).toEqual(["30-day reminder to asha@example.com (Dr. Asha Sample)"]);
    expect((await DoctorProfile.findById(ids.dueSoon).lean())!.renewalRemindersSent).toEqual([]);
    expect(sent.map((m) => m.to)).toEqual(["team@example.com"]); // the digest reports the failure
    failFor = null;
    expect((await runRenewalJob({ now: inDays(1) })).reminders.map((x) => x.name)).toContain("Dr. Asha Sample");
  });

  it("is restored by a renewal payment and listed again", async () => {
    const live = () => Establishment.countDocuments({ _id: ids.graceOver, ...PUBLISHED_LIVE });
    expect(await live()).toBe(0);
    const change = await applyPaymentToRenewal({ establishmentId: ids.graceOver, purpose: "renewal", date: NOW });
    expect(change).toMatchObject({ restored: true, route: { kind: "hospital", citySlug: "pune", slug: "late-hospital" } });
    expect((await Establishment.findById(ids.graceOver).lean())!.renewalStatus).not.toBe("lapsed");
    expect(await live()).toBe(1);
  });
});
