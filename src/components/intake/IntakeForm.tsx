"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Lock, Send } from "lucide-react";
import { endIntakeSessionAction, saveIntakeAction, signIntakeUploadAction, type VerifyIntakeResult } from "@/app/(marketing)/get-started/actions";
import { saveIntakeAdminAction } from "@/app/admin/(dash)/intakes/actions";
import { signUploadAction } from "@/app/admin/(dash)/upload-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { UploadSigner } from "@/lib/client/upload-image";
import { INTAKE_EDITABLE_STATUSES, type IntakeKind, type IntakeStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import {
  INTAKE_KIND_LABEL,
  INTAKE_PHOTOS,
  INTAKE_SECTIONS,
  emptyIntakeData,
  emptyIntakePhotos,
  fieldId,
  intakeContactName,
  mergeIntake,
  mergePhotos,
  missingForSubmit,
  requiredProgress,
  type IntakeData,
  type IntakePhotos,
} from "@/lib/intake/form";
import type { IntakeView } from "@/lib/intake/server";
import { IntakeCodeForm } from "./IntakeCodeForm";
import { IntakeSection, SectionCard, inputClass } from "./IntakeFields";
import { IntakePhotosSection } from "./IntakePhotos";

const INTRO: Record<IntakeKind, string> = {
  doctor: "Tell us about yourself and your practice. We use this to write and design your website and visiting card.",
  clinic: "Tell us about your clinic. We use this to write and design your clinic website and visiting card.",
  hospital: "Tell us about your hospital. We use this to write and design your hospital website and visiting card.",
};

const AUTOSAVE_MS = 4000;

const adminSign: UploadSigner = () => signUploadAction({ purpose: "intake" });
const publicSign: UploadSigner = () => signIntakeUploadAction();

const timeOf = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * The self-fill website form (/get-started/{kind}), also used by the admin
 * to fill gaps (`mode="admin"`). Busy applicants save half a form and come
 * back later with the same email (one-time code). After the first save the
 * form autosaves; "Send for review" needs the required fields.
 */
export function IntakeForm({
  kind,
  initial,
  sessionEmail,
  waNumber,
  mode = "public",
}: {
  kind: IntakeKind;
  initial: IntakeView | null;
  sessionEmail: string | null;
  /** MediReach WhatsApp number (digits). */
  waNumber: string;
  mode?: "public" | "admin";
}) {
  const admin = mode === "admin";
  const sections = INTAKE_SECTIONS[kind];
  const photoCfg = INTAKE_PHOTOS[kind];

  const [id, setId] = useState(initial?.id);
  const [email, setEmail] = useState(initial?.email ?? sessionEmail ?? "");
  const [data, setData] = useState<IntakeData>(initial?.data ?? emptyIntakeData(kind));
  const [photos, setPhotos] = useState<IntakePhotos>(initial?.photos ?? emptyIntakePhotos());
  const [status, setStatus] = useState<IntakeStatus>(initial?.status ?? "draft");
  const [ref, setRef] = useState(initial?.ref);
  const [submittedAt, setSubmittedAt] = useState(initial?.submittedAt);
  const [savedAt, setSavedAt] = useState(initial?.lastSavedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [saving, setSaving] = useState<"save" | "submit" | "auto" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const editable = admin || INTAKE_EDITABLE_STATUSES.includes(status);

  // Latest values for async saves, and a change counter so a save never marks newer edits as saved.
  const latest = useRef({ id, email, data, photos });
  latest.current = { id, email, data, photos };
  const version = useRef(0);
  const busy = useRef(false);

  const touch = () => {
    version.current++;
    setDirty(true);
  };
  const changeData = (next: IntakeData) => {
    setData(next);
    touch();
  };
  const changePhotos = (next: IntakePhotos) => {
    setPhotos(next);
    latest.current = { ...latest.current, photos: next };
    touch();
  };

  const apply = (v: IntakeView) => {
    setId(v.id);
    setRef(v.ref);
    setStatus(v.status);
    setSubmittedAt(v.submittedAt);
    setSavedAt(v.lastSavedAt);
    setEmail(v.email);
  };

  const save = useCallback(
    async (how: "save" | "submit" | "auto"): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setSaving(how);
      if (how !== "auto") setBanner(null);
      const startVersion = version.current;
      const cur = latest.current;
      try {
        if (admin) {
          const r = await saveIntakeAdminAction({ id: cur.id!, email: cur.email, data: cur.data, photos: cur.photos });
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            setBanner({ tone: "error", text: r.error });
            return false;
          }
          apply(r.data);
        } else {
          const r = await saveIntakeAction({ id: cur.id, kind, email: cur.email, data: cur.data, photos: cur.photos, submit: how === "submit" });
          if (!r.ok) {
            if (r.needsCode && r.email) {
              setCodeFor(r.email);
              return false;
            }
            setErrors(r.fieldErrors ?? {});
            if (how !== "auto" || !r.fieldErrors) setBanner({ tone: "error", text: r.error });
            if (how !== "auto" && r.fieldErrors) {
              const first = Object.keys(r.fieldErrors)[0];
              if (first) requestAnimationFrame(() => focusField(first));
            }
            return false;
          }
          apply(r.intake);
          if (how === "submit") {
            setJustSent(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
        setErrors({});
        if (version.current === startVersion) setDirty(false);
        if (how === "save") setBanner({ tone: "ok", text: admin ? "Changes saved." : "Saved. You can close this page and finish later with the same email." });
        return true;
      } catch {
        setBanner({ tone: "error", text: "Could not save. Check your internet connection and try again." });
        return false;
      } finally {
        busy.current = false;
        setSaving(null);
      }
    },
    [admin, kind],
  );

  // Autosave once the form exists.
  useEffect(() => {
    if (!dirty || !id || !editable) return;
    const t = setTimeout(() => void save("auto"), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, id, editable, data, photos, email, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Photos need a saved form (the upload is tied to it). */
  const ensureSaved = useCallback(async () => {
    if (latest.current.id) return true;
    if (!latest.current.email.trim()) {
      setErrors((e) => ({ ...e, email: "Enter your email first: photos are saved with your form." }));
      focusField("email");
      return false;
    }
    return save("save");
  }, [save]);

  function onVerified(r: Extract<VerifyIntakeResult, { ok: true }>) {
    setCodeFor(null);
    if (r.intake) {
      const merged = mergeIntake(kind, latest.current.data, r.intake.data);
      const mergedPhotos = mergePhotos(latest.current.photos, r.intake.photos, photoCfg.galleryMax);
      apply(r.intake);
      setData(merged);
      setPhotos(mergedPhotos);
      latest.current = { id: r.intake.id, email: r.intake.email, data: merged, photos: mergedPhotos };
    }
    touch();
    setBanner({ tone: "ok", text: r.intake ? "We opened your saved form and added what you just typed. Check it and keep going." : "Email confirmed. Your form is saved." });
    // Quiet save: keeps the message above.
    void save("auto");
  }

  const missing = missingForSubmit(kind, data);
  const progress = requiredProgress(kind, data);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const name = intakeContactName(kind, data);

  return (
    <div className={cn(!admin && "pb-32")}>
      {!admin && (
        <header className="mb-6 space-y-4">
          <Link href="/get-started" className="inline-flex items-center gap-1.5 text-sm font-medium text-lagoon hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> All options
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.015em] text-ink sm:text-4xl">{INTAKE_KIND_LABEL[kind]} form</h1>
            <p className="mt-2 max-w-2xl text-body/85">{INTRO[kind]}</p>
          </div>
          <div className="flex gap-3 rounded-2xl border border-lagoon/25 bg-lagoon/5 p-4 text-sm text-body">
            <Info className="mt-0.5 size-5 shrink-0 text-lagoon" aria-hidden />
            <p>
              <strong className="text-ink">Busy? You don&apos;t have to finish now.</strong> Fill what you can and press <strong>Save</strong>. Next time, open{" "}
              <strong>Get started → Continue with your email</strong> and log in with the <strong>same email</strong> to add or change anything. Photos can be uploaded here or sent on WhatsApp.
            </p>
          </div>
        </header>
      )}

      {justSent && !admin && (
        <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-leaf/30 bg-leaf/10 p-5 text-body">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-leaf" aria-hidden />
          <div>
            <p className="font-semibold text-ink">Thank you. Your details are with our team.</p>
            <p className="mt-1 text-sm">
              Form reference <strong className="whitespace-nowrap">{ref}</strong>. We&apos;ll check everything, add anything that&apos;s missing and design your website. We&apos;ll contact you on your mobile before it goes live. You can still change this form any time with the same email.
            </p>
          </div>
        </div>
      )}
      {!justSent && !admin && status !== "draft" && (
        <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-body">
          {editable ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden /> : <Lock className="mt-0.5 size-5 shrink-0 text-lagoon" aria-hidden />}
          <p>
            {editable
              ? `Sent for review on ${dateOf(submittedAt)}. You can still change anything; our team sees the update.`
              : "Our team has started your website from this form, so it can't be changed here. Message us on WhatsApp for any changes."}
          </p>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <fieldset disabled={!editable} className="space-y-5">
          <SectionCard id="section-email" title={admin ? "Applicant email" : "Your email"}>
            <div className="space-y-1.5">
              <label htmlFor={fieldId("email")} className="block text-sm font-medium text-body">
                Email <span className="text-clay-text">*</span>
              </label>
              <input
                id={fieldId("email")}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  touch();
                }}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={`${fieldId("email")}-help`}
                className={cn(inputClass, "h-11 sm:max-w-md")}
              />
              <p id={`${fieldId("email")}-help`} className={cn("text-sm", errors.email ? "text-clay-text" : "text-body/70")}>
                {errors.email ?? (admin ? "The applicant logs in with this email." : "Compulsory. Use this email next time to log in and complete or change the form.")}
              </p>
              {!admin && id && sessionEmail && (
                <p className="text-xs text-body/70">
                  Form ref <strong className="whitespace-nowrap">{ref}</strong>.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={async () => {
                      await endIntakeSessionAction();
                      window.location.assign(`/get-started/${kind}`);
                    }}
                  >
                    Not you? Start a new form
                  </button>
                </p>
              )}
            </div>
          </SectionCard>

          {sections.map((s) => (
            <IntakeSection key={s.key} section={s} data={data} onChange={changeData} errors={errors} />
          ))}

          <IntakePhotosSection
            config={photoCfg}
            photos={photos}
            onChange={changePhotos}
            ensureSaved={ensureSaved}
            sign={admin ? adminSign : publicSign}
            waNumber={waNumber}
            formRef={ref}
            email={email}
            name={name}
            disabled={!editable}
            error={errors.photos}
          />

          {!admin && editable && (
            <SectionCard id="section-send" title="Check and send">
              {missing.length ? (
                <>
                  <p className="text-sm text-body">
                    {missing.length === 1 ? "1 required item is" : `${missing.length} required items are`} still empty. You can save now and add them later, or fill them and send:
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {missing.map((m) => (
                      <li key={m.key}>
                        <button type="button" onClick={() => focusField(m.key)} className="rounded-full border border-marigold/40 bg-marigold/10 px-3 py-1 text-sm text-ink hover:bg-marigold/20">
                          {m.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-body">Everything required is filled. Send it to our team for review. You can still make changes after sending.</p>
              )}
            </SectionCard>
          )}
        </fieldset>
      </form>

      {banner && (
        <p role={banner.tone === "error" ? "alert" : "status"} className={cn("mt-4 rounded-xl p-3 text-sm", banner.tone === "error" ? "bg-clay/10 text-clay-text" : "bg-leaf/10 text-leaf-text")}>
          {banner.text}
        </p>
      )}

      {/* Action bar */}
      {editable && (
        <div className={cn(admin ? "sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-card/95 px-4 py-3 backdrop-blur" : "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 shadow-[0_-2px_8px_rgba(10,63,63,.06)] backdrop-blur")}>
          <div className={cn("mx-auto flex items-center gap-3", !admin && "max-w-3xl px-4 py-3")}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-xs text-body/80">
                <span>
                  Required: <strong className="text-ink">{progress.done}</strong>/{progress.total}
                </span>
                <span aria-live="polite" className="truncate">
                  {saving ? "Saving…" : dirty ? (id ? "Unsaved changes" : "Not saved yet") : savedAt && id ? `Saved ${timeOf(savedAt)}` : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-lagoon transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void save("save")}
              disabled={saving !== null}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-ink/20 bg-surface px-4 font-semibold text-ink hover:bg-paper disabled:opacity-60"
            >
              {saving === "save" && <Loader2 className="size-4 animate-spin" aria-hidden />} {admin ? "Save changes" : "Save"}
            </button>
            {!admin && (
              <button
                type="button"
                onClick={() => void save("submit")}
                disabled={saving !== null}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] bg-marigold px-4 font-semibold text-white hover:bg-marigold-700 disabled:opacity-60"
              >
                {saving === "submit" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                <span className="hidden sm:inline">{status === "draft" ? "Send for review" : "Send update"}</span>
                <span className="sm:hidden">Send</span>
              </button>
            )}
          </div>
        </div>
      )}

      <Dialog open={codeFor !== null} onOpenChange={(o) => !o && setCodeFor(null)}>
        <DialogContent className="rounded-2xl border-line bg-surface p-6 sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-2xl font-semibold text-ink">You already have a saved form</DialogTitle>
          </DialogHeader>
          {codeFor && <IntakeCodeForm email={codeFor} kind={kind} onVerified={onVerified} />}
          <p className="text-xs text-body/70">To keep your details private, we check it&apos;s you before opening a saved form. What you typed here is kept and added to it.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function focusField(key: string) {
  const el = document.getElementById(fieldId(key)) ?? document.getElementById(`section-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.focus({ preventScroll: true });
}
