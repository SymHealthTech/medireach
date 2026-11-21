"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Home, Info, Loader2, Lock, Pencil, Send } from "lucide-react";
import { WhatsAppIcon } from "@/components/marketing/WhatsAppLink";
import { saveIntakeAction, signIntakeUploadAction, type VerifyIntakeResult } from "@/app/(marketing)/get-started/actions";
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
  LATE_SECTIONS,
  emptyIntakeData,
  emptyIntakePhotos,
  fieldId,
  intakeContactName,
  mergeIntake,
  mergePhotos,
  missingForSubmit,
  photosWhatsappText,
  requiredProgress,
  type IntakeData,
  type IntakePhotos,
} from "@/lib/intake/form";
import type { IntakeView } from "@/lib/intake/server";
import { IntakeCodeForm } from "./IntakeCodeForm";
import { IntakeContextProvider, type CardFace } from "./IntakeContext";
import { IntakeSection, SectionCard, inputClass } from "./IntakeFields";
import { IntakePhotosSection, SectionPhoto } from "./IntakePhotos";

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
  waNumber,
  mode = "public",
  savedRef,
  cardFaces,
  prefill,
}: {
  kind: IntakeKind;
  initial: IntakeView | null;
  /** MediReach WhatsApp number (digits). */
  waNumber: string;
  mode?: "public" | "admin";
  /** A blank form, while this browser already has a saved form of this kind (its reference). */
  savedRef?: string;
  /** Sample visiting cards per style code (server-rendered), for the card picker. */
  cardFaces?: Record<string, CardFace>;
  /** A new form's answers picked before it opened (the designs chosen on a product page). */
  prefill?: Partial<Record<"websiteDesign" | "cardStyle", string>>;
}) {
  const admin = mode === "admin";
  const sections = INTAKE_SECTIONS[kind];
  const photoCfg = INTAKE_PHOTOS[kind];

  const [id, setId] = useState(initial?.id);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [data, setData] = useState<IntakeData>(initial?.data ?? { ...emptyIntakeData(kind), ...prefill });
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
            if (r.existing) {
              helpers.current.openSaved(r.existing);
              setBanner({ tone: "ok", text: `This email already has a ${INTAKE_KIND_LABEL[kind].toLowerCase()} form (${r.existing.ref}). We opened it and added what you just typed. Check it and keep going.` });
              setTimeout(() => void save("auto"), 0);
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
          if (!cur.id) helpers.current.rememberInUrl();
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

  /**
   * After the first save the URL becomes ?continue=1, so a refresh reopens
   * this form; a plain /get-started/{kind} always starts blank. (Same route:
   * replaceState keeps this page instance.)
   */
  function rememberInUrl() {
    if (admin) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?continue=1`);
  }

  /** Open a saved form, keeping what was just typed on top (fill-in-the-blanks). */
  function openSaved(saved: IntakeView) {
    const merged = mergeIntake(kind, latest.current.data, saved.data);
    const mergedPhotos = mergePhotos(latest.current.photos, saved.photos, photoCfg.galleryMax);
    apply(saved);
    setData(merged);
    setPhotos(mergedPhotos);
    latest.current = { id: saved.id, email: saved.email, data: merged, photos: mergedPhotos };
    rememberInUrl();
    touch();
  }

  // save() is memoised; it reaches these through a ref so it always gets the current ones.
  const helpers = useRef({ openSaved, rememberInUrl });
  helpers.current = { openSaved, rememberInUrl };

  function onVerified(r: Extract<VerifyIntakeResult, { ok: true }>) {
    setCodeFor(null);
    if (r.intake) openSaved(r.intake);
    touch();
    setBanner({ tone: "ok", text: r.intake ? "We opened your saved form and added what you just typed. Check it and keep going." : "Email confirmed. Your form is saved." });
    // Quiet save: keeps the message above.
    void save("auto");
  }

  const missing = missingForSubmit(kind, data);
  const progress = requiredProgress(kind, data);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const name = intakeContactName(kind, data);

  // After sending: a centred thank-you instead of the form, with Edit and Home.
  if (justSent && !admin) {
    const waHref = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(photosWhatsappText(ref, email, name))}`;
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center pb-16">
        <div role="status" className="w-full max-w-lg rounded-3xl bg-surface p-6 text-center shadow-lift ring-1 ring-ink/5 sm:p-10">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf/15">
            <CheckCircle2 className="size-9 text-leaf" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.015em] text-ink">Thank you{name ? `, ${name}` : ""}</h1>
          <p className="mt-2 text-body/85">Your details are with our team.</p>
          <p className="mx-auto mt-4 inline-block rounded-xl bg-paper px-4 py-2 text-sm text-body">
            Form reference <strong className="whitespace-nowrap font-display text-base text-ink">{ref}</strong>
          </p>
          <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-body">
            {[
              "We check your details and call you if anything is missing.",
              "We write and design your website and visiting card.",
              "You see it and approve it before it goes live.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon/10 text-xs font-bold text-lagoon">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          {photos.viaWhatsapp && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#1f8f4e] px-4 text-sm font-semibold text-white hover:bg-[#187a42]"
            >
              <WhatsAppIcon className="size-5" /> Send your photos on WhatsApp
            </a>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setJustSent(false);
                window.scrollTo({ top: 0 });
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-ink/20 bg-surface px-5 font-semibold text-ink hover:bg-paper"
            >
              <Pencil className="size-4" aria-hidden /> Edit my form
            </button>
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-marigold px-5 font-semibold text-white hover:bg-marigold-700">
              <Home className="size-4" aria-hidden /> Back to home
            </Link>
          </div>
          <p className="mt-5 text-xs text-body/70">
            We emailed these details to <span className="break-all">{email}</span>. To change anything later, use Get started → Continue with your email.
          </p>
        </div>
      </div>
    );
  }

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

      {!admin && !id && savedRef && (
        <p className="mb-6 rounded-2xl border border-line bg-surface p-4 text-sm text-body">
          This is a new, empty form. You also have a saved {INTAKE_KIND_LABEL[kind].toLowerCase()} form ({savedRef}).{" "}
          <a href={`/get-started/${kind}?continue=1`} className="font-semibold text-lagoon underline underline-offset-2">
            Continue that form
          </a>
        </p>
      )}
      {!admin && status !== "draft" && (
        <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-body">
          {editable ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden /> : <Lock className="mt-0.5 size-5 shrink-0 text-lagoon" aria-hidden />}
          <p>
            {editable
              ? `Sent for review on ${dateOf(submittedAt)}. You can still change anything; our team sees the update.`
              : "Our team has started your website from this form, so it can't be changed here. Message us on WhatsApp for any changes."}
          </p>
        </div>
      )}

      <IntakeContextProvider value={{ ensureSaved, sign: admin ? adminSign : publicSign, cardFaces, errors, kind, data }}>
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <fieldset disabled={!editable} className="min-w-0 space-y-5">
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
                {!admin && id && (
                  <p className="text-xs text-body/70">
                    Form ref <strong className="whitespace-nowrap">{ref}</strong>. Filling for someone else?{" "}
                    <a href={`/get-started/${kind}`} className="underline underline-offset-2">
                      Start a new form
                    </a>
                  </p>
                )}
              </div>
            </SectionCard>

            {sections
              .filter((s) => !(LATE_SECTIONS as readonly string[]).includes(s.key))
              .map((s) => (
                <IntakeSection
                  key={s.key}
                  section={s}
                  data={data}
                  onChange={changeData}
                  errors={errors}
                  extra={
                    kind === "doctor" && s.key === "beyond" ? (
                      <SectionPhoto
                        photoKey="beyond"
                        label="Photo for your story"
                        help="Optional. You running the marathon, on a trek, playing music or at a social-work camp. A wide (landscape) photo works best. No patient photos."
                        photos={photos}
                        onChange={changePhotos}
                        ensureSaved={ensureSaved}
                        sign={admin ? adminSign : publicSign}
                        disabled={!editable}
                      />
                    ) : undefined
                  }
                />
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

            {sections
              .filter((s) => (LATE_SECTIONS as readonly string[]).includes(s.key))
              .map((s) => (
                <IntakeSection key={s.key} section={s} data={data} onChange={changeData} errors={errors} />
              ))}

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
      </IntakeContextProvider>

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
