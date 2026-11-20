import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { INTAKE_EDITABLE_STATUSES, INTAKE_KINDS, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { sendEmail } from "@/lib/integrations/email";
import { normalizeEmail } from "@/lib/auth/login-link";
import {
  INTAKE_KIND_LABEL,
  INTAKE_PHOTOS,
  allPhotos,
  intakeContactName,
  intakeDataSchema,
  intakeFieldErrors,
  intakeName,
  intakePhotosSchema,
  missingForSubmit,
  str,
  withDefaults,
  type IntakeData,
  type IntakePhotos,
} from "@/lib/intake/form";
import { intakeSavedEmail, intakeSubmittedEmail, intakeTeamEmail } from "@/lib/intake/emails";
import { Intake, type IntakeDoc } from "@/models/Intake";

/** Everything the form page needs about a saved form (serialisable). */
export interface IntakeView {
  id: string;
  kind: IntakeKind;
  email: string;
  ref: string;
  status: IntakeStatus;
  data: IntakeData;
  photos: IntakePhotos;
  missingCount: number;
  submittedAt?: string;
  lastSavedAt: string;
}

export function toView(doc: Pick<IntakeDoc, "_id" | "kind" | "email" | "ref" | "status" | "data" | "photos" | "missingCount" | "submittedAt" | "lastSavedAt">): IntakeView {
  const ph = doc.photos ?? { gallery: [], viaWhatsapp: false };
  const clean = (x?: { publicId: string; url: string; caption?: string }) => (x ? { publicId: x.publicId, url: x.url, ...(x.caption ? { caption: x.caption } : {}) } : undefined);
  return {
    id: String(doc._id),
    kind: doc.kind,
    email: doc.email,
    ref: doc.ref,
    status: doc.status,
    data: withDefaults(doc.kind, doc.data as IntakeData),
    photos: {
      ...(ph.profile ? { profile: clean(ph.profile) } : {}),
      ...(ph.logo ? { logo: clean(ph.logo) } : {}),
      ...(ph.cover ? { cover: clean(ph.cover) } : {}),
      gallery: (ph.gallery ?? []).map((g) => clean(g)!),
      viaWhatsapp: Boolean(ph.viaWhatsapp),
    },
    missingCount: doc.missingCount ?? 0,
    ...(doc.submittedAt ? { submittedAt: new Date(doc.submittedAt).toISOString() } : {}),
    lastSavedAt: new Date(doc.lastSavedAt ?? Date.now()).toISOString(),
  };
}

export const isEditable = (status: IntakeStatus) => INTAKE_EDITABLE_STATUSES.includes(status);

/** Forms this verified email may open, newest first. */
export async function intakesForEmail(email: string) {
  await connectToDatabase();
  return Intake.find({ email: normalizeEmail(email) }).sort({ lastSavedAt: -1 }).lean();
}

export async function intakeFor(email: string, kind: IntakeKind) {
  await connectToDatabase();
  return Intake.findOne({ email: normalizeEmail(email), kind }).lean();
}

// --- Refs and photos -----------------------------------------------------------

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
export function newRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)];
  return `MR-${s}`;
}

export const INTAKE_UPLOAD_FOLDER = "medireach-portfolio/intake/";

/**
 * Only images we signed: in our intake folder, on our Cloudinary cloud. Stops
 * anyone saving arbitrary URLs into a form the admin later publishes.
 */
export function isOurPhoto(p: { publicId: string; url: string }): boolean {
  if (!p.publicId.startsWith(INTAKE_UPLOAD_FOLDER) || p.publicId.includes("..")) return false;
  const cloud = optionalEnv("CLOUDINARY_CLOUD_NAME");
  const prefix = cloud ? `https://res.cloudinary.com/${cloud}/image/upload/` : "https://res.cloudinary.com/";
  return p.url.startsWith(prefix) && !/[\s"'<>]/.test(p.url);
}

// --- Saving --------------------------------------------------------------------

export const saveInputSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  kind: z.enum(INTAKE_KINDS),
  email: z.string().max(300),
  data: z.unknown(),
  photos: z.unknown(),
  submit: z.boolean().default(false),
});
export type SaveInput = z.input<typeof saveInputSchema>;

export type IntakeNotice = "saved" | "submitted" | "team_new" | "team_updated";

export type SaveOutcome =
  | {
      ok: true;
      intake: IntakeView;
      /** Set the applicant cookie for this email. */
      sessionEmail?: string;
      /** Emails to send after the response. */
      notify: IntakeNotice[];
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  /** This browser owns the email, but started a blank form: open the saved one instead (the page merges). */
  | { ok: false; existing: IntakeView; error: string }
  /** A form already exists for this email: prove it with a code first. */
  | { ok: false; needsCode: true; email: string; error: string };

const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

export const CLOSED_MESSAGE = "This form is closed because our team has already started your website. Message us on WhatsApp for any changes.";

/**
 * Save (and optionally send) a form.
 *
 * `sessionEmail` is the email this browser has proven, or null; `asAdmin`
 * skips ownership and status rules (the dashboard can always edit).
 *
 * Ownership: a browser may write a form only for its own session email. The
 * very first form for an email needs no proof (there is nothing to protect
 * yet) and starts the session. Any later write for an email that already has
 * a form, from a browser without that session, needs a one-time code.
 */
export async function saveIntake(raw: SaveInput, sessionEmail: string | null, opts: { asAdmin?: boolean } = {}): Promise<SaveOutcome> {
  const input = saveInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: "Something went wrong. Please reload the page." };
  const { id, kind, submit } = input.data;

  const emailParsed = emailSchema.safeParse(input.data.email);
  const dataParsed = intakeDataSchema(kind).safeParse(input.data.data ?? {});
  const photosParsed = intakePhotosSchema(kind).safeParse(input.data.photos ?? {});
  const fieldErrors: Record<string, string> = {};
  if (!emailParsed.success) fieldErrors.email = emailParsed.error.issues[0]?.message ?? "Enter a valid email address.";
  if (!dataParsed.success) Object.assign(fieldErrors, intakeFieldErrors(dataParsed.error));
  if (!photosParsed.success) fieldErrors.photos = photosParsed.error.issues[0]?.message ?? "Please check the photos.";
  if (photosParsed.success && !allPhotos(photosParsed.data).every(isOurPhoto)) fieldErrors.photos = "Please upload the photos again.";
  if (dataParsed.success && !allPhotos({ gallery: [], viaWhatsapp: false }, kind, dataParsed.data).every(isOurPhoto)) fieldErrors.photos = "Please upload the doctor photos again.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: fieldErrors.email && Object.keys(fieldErrors).length === 1 ? fieldErrors.email : "Please check the highlighted fields.", fieldErrors };
  }
  const email = normalizeEmail(emailParsed.data!);
  const data = dataParsed.data!;
  const photos = photosParsed.data! as IntakePhotos;
  const session = sessionEmail ? normalizeEmail(sessionEmail) : null;

  await connectToDatabase();

  // Find the form to write, and check this browser may write it.
  let doc = id ? await Intake.findById(id) : await Intake.findOne({ email, kind });
  if (id && !doc) return { ok: false, error: "This form was not found. Please reload the page." };
  if (doc && doc.kind !== kind) return { ok: false, error: "Something went wrong. Please reload the page." };
  let sessionOut: string | undefined;

  if (!opts.asAdmin) {
    if (doc) {
      if (session !== doc.email) {
        if (email === doc.email) return { ok: false, needsCode: true, email, error: "A form is already saved with this email. Enter the code we email you to open it." };
        return { ok: false, error: "Your session has ended. Use “Continue a saved form” to log in again." };
      }
      // A fresh (blank) form for an email that already has this kind of form: never overwrite it; the page merges and continues it.
      if (!id) return { ok: false, existing: toView(doc.toObject()), error: "This email already has a saved form." };
      if (email !== doc.email) {
        // Changing the form's email: only to an address with no forms yet (else it would grant access to them).
        if (await Intake.exists({ email })) return { ok: false, error: "That email already has a saved form. Use “Continue a saved form” with that email.", fieldErrors: { email: "Already used for another form." } };
        sessionOut = email;
      }
    } else if (session !== email && (await Intake.exists({ email }))) {
      return { ok: false, needsCode: true, email, error: "A form is already saved with this email. Enter the code we email you to open it." };
    } else if (session !== email) {
      sessionOut = email;
    }
    if (doc && !isEditable(doc.status)) return { ok: false, error: CLOSED_MESSAGE };
  } else if (doc && email !== doc.email && (await Intake.exists({ email, kind, _id: { $ne: doc._id } }))) {
    return { ok: false, error: "Another form of this kind already uses that email.", fieldErrors: { email: "Already used." } };
  }

  const missing = missingForSubmit(kind, data);
  if (submit && missing.length) {
    return {
      ok: false,
      error: `Please fill ${missing.length === 1 ? "1 required item" : `${missing.length} required items`} before sending. You can also save and finish later.`,
      fieldErrors: Object.fromEntries(missing.map((m) => [m.key, "Needed before sending."])),
    };
  }

  const isNew = !doc;
  const notify: IntakeNotice[] = [];
  const now = new Date();
  if (!doc) {
    doc = new Intake({ kind, email, ref: newRef(), status: "draft" });
    notify.push("saved");
  }
  const wasSent = doc.status !== "draft";
  doc.email = email;
  doc.data = data;
  doc.markModified("data");
  doc.photos = { ...photos, gallery: photos.gallery.slice(0, INTAKE_PHOTOS[kind].galleryMax) };
  doc.name = intakeName(kind, data) || undefined;
  doc.phone = str(data.mobile) || undefined;
  doc.missingCount = missing.length;
  doc.lastSavedAt = now;
  if (!opts.asAdmin) {
    if (submit && doc.status === "draft") {
      doc.status = "submitted";
      doc.submittedAt = now;
      notify.push("submitted", "team_new");
    } else if (wasSent) {
      doc.updatedAfterSubmitAt = now;
      if (submit) notify.push("team_updated");
    }
  }

  // A rare ref collision just retries with a new one.
  for (let attempt = 0; ; attempt++) {
    try {
      await doc.save();
      break;
    } catch (err) {
      const dup = err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === 11000;
      if (!dup) throw err;
      const keys = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
      if (keys.includes("ref") && attempt < 3) {
        doc.ref = newRef();
        continue;
      }
      // Two tabs creating the same form at once: the other one won.
      return isNew ? { ok: false, needsCode: true, email, error: "A form is already saved with this email. Enter the code we email you to open it." } : { ok: false, error: "That email is already used for another form." };
    }
  }

  return { ok: true, intake: toView(doc.toObject()), ...(sessionOut ? { sessionEmail: sessionOut } : {}), notify };
}

/** Send the emails a save asked for. Never throws. */
export async function sendIntakeNotifications(intake: IntakeView, notify: IntakeNotice[]): Promise<void> {
  const kindLabel = INTAKE_KIND_LABEL[intake.kind];
  const name = intakeContactName(intake.kind, intake.data);
  const team = optionalEnv("LEAD_NOTIFY_EMAIL") || optionalEnv("ADMIN_EMAIL");
  const jobs: Promise<unknown>[] = [];
  for (const n of notify) {
    if (n === "saved" && !notify.includes("submitted")) jobs.push(sendEmail({ to: intake.email, ...intakeSavedEmail({ name, email: intake.email, ref: intake.ref, kindLabel }) }));
    if (n === "submitted") jobs.push(sendEmail({ to: intake.email, ...intakeSubmittedEmail({ name, email: intake.email, ref: intake.ref, kindLabel }) }));
    if ((n === "team_new" || n === "team_updated") && team) {
      jobs.push(
        sendEmail({
          to: team,
          ...intakeTeamEmail({
            id: intake.id,
            ref: intake.ref,
            kindLabel,
            name: intakeName(intake.kind, intake.data),
            phone: str(intake.data.mobile),
            email: intake.email,
            missing: intake.missingCount,
            updated: n === "team_updated",
          }),
        }),
      );
    }
  }
  await Promise.allSettled(jobs).then((r) => r.forEach((x) => x.status === "rejected" && console.error("[intake] email failed", x.reason)));
}
