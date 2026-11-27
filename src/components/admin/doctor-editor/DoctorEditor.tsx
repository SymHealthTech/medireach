"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Cloud, ExternalLink, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  publishDoctorAction,
  saveDoctorSectionAction,
  submitForReviewAction,
  unpublishDoctorAction,
} from "@/app/admin/(dash)/doctors/actions";
import { scanFields } from "@/lib/compliance/scan";
import {
  complianceTextFields,
  publishBlockers,
  recommendedMissing,
  sectionPayload,
  stepComplete,
  stepForField,
  STEPS,
  type DoctorForm,
  type StepKey,
} from "@/lib/doctors/form";
import type { EditorOptions } from "@/lib/doctors/options";
import type { DoctorFormHints } from "@/lib/intake/hints";
import type { AdminRole } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { absUrl, paths } from "@/lib/site";
import { cn } from "@/lib/cn";
import type { StepProps } from "./shared";
import { AboutStep } from "./steps/AboutStep";
import { BasicsStep } from "./steps/BasicsStep";
import { BusinessStep } from "./steps/BusinessStep";
import { ClinicsStep } from "./steps/ClinicsStep";
import { ContactStep } from "./steps/ContactStep";
import { PracticeStep } from "./steps/PracticeStep";
import { RegistrationStep } from "./steps/RegistrationStep";
import { ReviewStep } from "./steps/ReviewStep";
import { SeoStep } from "./steps/SeoStep";
import { TemplatesStep } from "./steps/TemplatesStep";

const AUTOSAVE_MS = 1500;

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: string }
  | { status: "error"; message: string };

/**
 * The 11-step doctor editor (MEDIREACH_BUILD_PROMPT.md Phase 4.2):
 * autosaves the current step as a draft, shows completion ticks, runs the NMC
 * scanner live, and publishes from the last step. The server re-validates
 * everything; this component only makes it pleasant.
 */
export function DoctorEditor({
  initial,
  options,
  role,
  initialStep = "basics",
  leadId,
  hints,
}: {
  initial: DoctorForm;
  options: EditorOptions;
  role: AdminRole;
  initialStep?: StepKey;
  leadId?: string;
  /** Answers from the website form this draft was made from. */
  hints?: DoctorFormHints;
}) {
  const [form, setForm] = useState<DoctorForm>(initial);
  const [step, setStep] = useState<StepKey>(initialStep);
  const [save, setSave] = useState<SaveState>(initial.id ? { status: "saved", at: initial.updatedAt ?? new Date().toISOString() } : { status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StepKey, Record<string, string>>>>({});
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const formRef = useRef(form);
  formRef.current = form;
  const stepRef = useRef(step);
  stepRef.current = step;
  const dirty = useRef(new Set<StepKey>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const canPublish = role === "superadmin" || role === "admin";
  const readOnly = form.status === "published" && !canPublish;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Re-render "Saved 5s ago" every few seconds.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  /** Save every dirty step, one request at a time. */
  const flush = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      for (const s of [...dirty.current]) {
        const current = formRef.current;
        if (!current.id && (s !== "basics" || !current.firstName.trim() || !current.lastName.trim())) continue;
        dirty.current.delete(s);
        setSave({ status: "saving" });
        const res = await saveDoctorSectionAction({ id: current.id, step: s, data: sectionPayload(s, current), leadId: current.id ? undefined : leadId });
        if (!res.ok) {
          dirty.current.add(s);
          setFieldErrors((e) => ({ ...e, [s]: res.fieldErrors ?? {} }));
          setSave({ status: "error", message: res.error });
          continue;
        }
        const server = res.data.form;
        setFieldErrors((e) => ({ ...e, [s]: {} }));
        setForm((prev) => ({
          ...prev,
          id: server.id,
          status: server.status,
          uid: server.uid,
          updatedAt: server.updatedAt,
          publishedAt: server.publishedAt,
          citySlug: server.citySlug,
          foundingNumber: server.foundingNumber,
          ...(dirty.current.has("seo") ? {} : { slug: server.slug, shortSlug: server.shortSlug, subdomain: server.subdomain }),
          // New clinics get their database ids (same order as sent).
          ...(s === "clinics" && prev.clinics.length === server.clinics.length
            ? { clinics: prev.clinics.map((c, i) => ({ ...c, key: server.clinics[i]!.key })) }
            : {}),
        }));
        if (!current.id) {
          // Stay on the same route (/new) so Next.js doesn't mount a second
          // editor for /[id]; ?id= lets a reload pick the draft back up.
          window.history.replaceState(window.history.state, "", `/admin/doctors/new?id=${server.id}&step=${stepRef.current}`);
          toast.success("Draft created");
        }
        setSave({ status: "saved", at: res.data.savedAt });
      }
    });
    return queue.current;
  }, [leadId]);

  const set: StepProps["set"] = useCallback(
    (patch, opts) => {
      if (readOnly) return;
      setForm((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
      dirty.current.add(opts?.step ?? stepRef.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush, readOnly],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0 || save.status === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [save.status]);

  async function goTo(next: StepKey, focusPath?: string) {
    await flush();
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", next);
    window.history.replaceState(window.history.state, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (focusPath) setTimeout(() => document.getElementById(focusPath)?.focus(), 350);
  }

  // Live NMC scan of every free-text field.
  const textFields = useMemo(() => complianceTextFields(form), [form]);
  const issues = useMemo(() => scanFields(textFields, options.bannedPhrases), [textFields, options.bannedPhrases]);
  const issueByField = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const i of issues) m.set(i.field, [...(m.get(i.field) ?? []), i.phrase]);
    return m;
  }, [issues]);

  const err = (path: string) => {
    const server = fieldErrors[step]?.[path];
    if (server) return server;
    const phrases = issueByField.get(path);
    return phrases ? `Not allowed (NMC): “${phrases.join("”, “")}”. Rephrase factually.` : undefined;
  };

  // Leaving through an in-app link (sidebar, "Payments"…) skips beforeunload: save what is pending on the way out.
  useEffect(
    () => () => {
      if (dirty.current.size > 0) void flush();
    },
    [flush],
  );

  /** The final "Save everything" (Review step): saves every unsaved change; true when all of it saved. */
  async function saveAll(): Promise<boolean> {
    dirty.current.add(stepRef.current);
    await flush();
    await queue.current;
    if (dirty.current.size > 0) {
      const failed = STEPS.filter((s) => dirty.current.has(s.key)).map((s) => s.title);
      toast.error(`Not saved: ${failed.join(", ")}. Open the step to see what to fix.`);
      return false;
    }
    toast.success("Everything is saved");
    return true;
  }

  async function runStatus(action: typeof publishDoctorAction, ok: string) {
    if (!form.id) return;
    setBusy(true);
    await flush();
    const res = await action({ id: form.id });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setForm((prev) => ({ ...prev, status: res.data.form.status, publishedAt: res.data.form.publishedAt, slug: res.data.form.slug, shortSlug: res.data.form.shortSlug, citySlug: res.data.form.citySlug }));
    toast.success(ok);
  }

  const stepProps: StepProps = { form, set, err, options, readOnly, role, doctorId: form.id, hints };
  const name = [form.title, form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const liveUrl = form.status === "published" && form.slug && form.citySlug ? absUrl(paths.doctor(form.citySlug, form.slug)) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* Desktop stepper */}
      <nav aria-label="Form steps" className="hidden lg:block">
        <ol className="sticky top-24 space-y-1">
          {STEPS.map((s, i) => {
            const done = stepComplete(s.key, form);
            const current = s.key === step;
            const hasIssue = issues.some((x) => stepForField(x.field) === s.key) || Object.keys(fieldErrors[s.key] ?? {}).length > 0;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => void goTo(s.key)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                    current ? "bg-card font-semibold text-ink shadow-soft" : "text-muted-foreground hover:bg-card hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      hasIssue ? "border-clay bg-clay text-white" : done ? "border-leaf bg-leaf text-white" : current ? "border-ink text-ink" : "border-line",
                    )}
                  >
                    {hasIssue ? "!" : done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-5">
        {/* Header: name, status, autosave indicator */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="min-w-0 truncate font-display text-2xl font-semibold text-ink">{name && name !== "Dr." ? name : "New doctor"}</h2>
          <StatusBadge status={form.status} />
          {form.uid && (
            <span title="Permanent website UID" className="rounded-md bg-mist px-2 py-0.5 font-mono text-xs font-semibold text-ink">
              UID {form.uid}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {save.status === "saving" && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </>
            )}
            {save.status === "saved" && (
              <>
                <Cloud className="size-3.5" /> {/* Relative time differs between server render and hydration. */}
                <span suppressHydrationWarning>Saved {timeAgo(save.at)}</span>
              </>
            )}
            {save.status === "error" && (
              <span className="inline-flex items-center gap-1 text-clay-text">
                <AlertCircle className="size-3.5" /> Not saved: {save.message}
              </span>
            )}
            {save.status === "idle" && !form.id && "Fills in as you type — a draft is created once the name is entered"}
          </span>
        </div>

        {/* Mobile progress */}
        <div className="space-y-2 lg:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">
              Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex]!.title}
            </span>
            {stepComplete(step, form) && <CheckCircle2 className="size-4 text-leaf" />}
          </div>
          <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="h-1.5" />
        </div>

        {hints && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-sage/50 px-4 py-3 text-sm text-ink">
            <ClipboardList className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              Made from website form <strong>{hints.ref}</strong>. Its answers are shown in each step with <em>Use</em> / <em>Fill</em> buttons.
            </span>
            {hints.intakeId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/intakes/${hints.intakeId}`} target="_blank">
                  <ExternalLink /> Open website form
                </Link>
              </Button>
            )}
          </div>
        )}

        {readOnly && (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-muted p-4 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>This page is live. Only an admin can edit published pages.</p>
          </div>
        )}

        <h3 className="hidden font-display text-xl font-semibold text-ink lg:block">{STEPS[stepIndex]!.title}</h3>

        {step === "basics" && <BasicsStep {...stepProps} />}
        {step === "registration" && <RegistrationStep {...stepProps} />}
        {step === "practice" && <PracticeStep {...stepProps} />}
        {step === "clinics" && <ClinicsStep {...stepProps} />}
        {step === "contact" && <ContactStep {...stepProps} />}
        {step === "about" && <AboutStep {...stepProps} />}
        {step === "seo" && <SeoStep {...stepProps} />}
        {step === "business" && <BusinessStep {...stepProps} />}
        {step === "templates" && <TemplatesStep {...stepProps} />}
        {(step === "review" || step === "publish") && (
          <ReviewStep
            {...stepProps}
            phase={step === "review" ? "check" : "publish"}
            review={{
              textFields,
              issues,
              blockers: publishBlockers(form),
              recommended: recommendedMissing(form),
              phrases: options.bannedPhrases,
              canPublish,
              busy,
              liveUrl,
              stepForField,
              onGoTo: (path, s) => void goTo(s, path || undefined),
              onSaveAll: saveAll,
              saving: save.status === "saving",
              // A recorded payment moved the setup/renewal dates on the server: show them (not an unsaved change).
              onBusinessDates: (d) => setForm((prev) => ({ ...prev, ...d })),
              onPublish: () => void runStatus(publishDoctorAction, "Published — the page is live"),
              onUnpublish: () => void runStatus(unpublishDoctorAction, "Unpublished"),
              onSubmitReview: () => void runStatus(submitForReviewAction, "Sent to an admin for review"),
            }}
          />
        )}

        {/* Sticky action bar (above the mobile tab bar) */}
        <div className="sticky bottom-16 z-20 -mx-4 border-t border-line bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={stepIndex === 0} onClick={() => void goTo(STEPS[stepIndex - 1]!.key)}>
              <ArrowLeft /> <span className="hidden sm:inline">Back</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto"
              disabled={readOnly || save.status === "saving"}
              onClick={async () => {
                dirty.current.add(step);
                await flush();
              }}
            >
              Save draft
            </Button>
            {stepIndex < STEPS.length - 1 && (
              <Button type="button" onClick={() => void goTo(STEPS[stepIndex + 1]!.key)}>
                Next <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
