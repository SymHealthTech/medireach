"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Cloud, ExternalLink, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pill, StatusBadge } from "@/components/admin/StatusBadge";
import {
  publishEstablishmentAction,
  saveEstablishmentSectionAction,
  submitEstablishmentForReviewAction,
  unpublishEstablishmentAction,
} from "@/app/admin/(dash)/establishments/actions";
import { scanFields } from "@/lib/compliance/scan";
import type { AdminRole } from "@/lib/constants";
import {
  complianceTextFields,
  publishBlockers,
  recommendedMissing,
  sectionPayload,
  stepComplete,
  stepForField,
  stepTitle,
  STEPS,
  type EstablishmentForm,
  type StepKey,
} from "@/lib/establishments/form";
import type { EstablishmentEditorOptions } from "@/lib/establishments/options";
import type { SiteFormHints } from "@/lib/intake/hints";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { absUrl, paths } from "@/lib/site";
import { getTheme } from "@/themes/specialty";
import type { EStepProps } from "./shared";
import { BasicsStep } from "./steps/BasicsStep";
import { DesignStep } from "./steps/DesignStep";
import { GalleryStep, LocationStep, ServicesStep, TimingsStep } from "./steps/ContentSteps";
import { DoctorsStep, ExtrasStep } from "./steps/PeopleSteps";
import { BusinessStep, ReviewStep, SeoStep } from "./steps/SiteSteps";

const AUTOSAVE_MS = 1500;

type SaveState = { status: "idle" } | { status: "saving" } | { status: "saved"; at: string } | { status: "error"; message: string };

/**
 * The 10-step clinic / small-hospital editor (MEDIREACH_BUILD_PROMPT.md Phase 4,
 * "Clinic/hospital form"). Same behaviour as the doctor editor: autosaves the
 * current step as a draft, ticks complete steps, runs the NMC scanner live and
 * publishes from the last step. The server re-validates everything.
 */
export function EstablishmentEditor({
  initial,
  options,
  role,
  initialStep = "basics",
  hints,
}: {
  initial: EstablishmentForm;
  options: EstablishmentEditorOptions;
  role: AdminRole;
  initialStep?: StepKey;
  hints?: SiteFormHints;
}) {
  const [form, setForm] = useState<EstablishmentForm>(initial);
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

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  /** Save every dirty step, one request at a time. */
  const flush = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      // In step order, so Doctors saves before a department that lists a newly added doctor.
      for (const s of STEPS.map((x) => x.key).filter((k) => dirty.current.has(k))) {
        const current = formRef.current;
        if (!current.id && (s !== "basics" || current.name.trim().length < 2)) continue;
        dirty.current.delete(s);
        setSave({ status: "saving" });
        const res = await saveEstablishmentSectionAction({ id: current.id, kind: current.kind, step: s, data: sectionPayload(s, current) });
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
          renewalStatus: server.renewalStatus,
          ...(dirty.current.has("seo") ? {} : { slug: server.slug, shortSlug: server.shortSlug, subdomain: server.subdomain }),
          // A new type moves the design to that type's design on the server (unless one was picked by hand).
          ...(s === "basics" && !dirty.current.has("design") ? { themeKey: server.themeKey } : {}),
          ...(s === "business" && !dirty.current.has("business")
            ? { renewalDueDate: server.renewalDueDate, renewalPrice: server.renewalPrice }
            : {}),
        }));
        if (!current.id) {
          window.history.replaceState(window.history.state, "", `/admin/establishments/new?id=${server.id}&step=${stepRef.current}`);
          toast.success("Draft created");
        }
        setSave({ status: "saved", at: res.data.savedAt });
      }
    });
    return queue.current;
  }, []);

  const set: EStepProps["set"] = useCallback(
    (patch, opts) => {
      if (readOnly) return;
      setForm((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
      dirty.current.add(opts?.step ?? stepRef.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush, readOnly],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0 || save.status === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [save.status]);


  // Leaving through an in-app link (sidebar, "Payments"…) skips beforeunload: save what is pending on the way out.
  useEffect(
    () => () => {
      if (dirty.current.size > 0) void flush();
    },
    [flush],
  );

  /**
   * "Save everything" (Review step): saves every step, so the draft is a
   * complete listing (addresses, card and preview) before publishing.
   * True when all of it saved.
   */
  async function saveAll(): Promise<boolean> {
    if (!formRef.current.id && formRef.current.name.trim().length < 2) {
      toast.error("Enter the name (Basics) first.");
      return false;
    }
    for (const s of STEPS) dirty.current.add(s.key);
    await flush();
    // A brand-new draft is created by Basics first; the other steps save on the second pass.
    if (dirty.current.size > 0 && formRef.current.id) await flush();
    if (dirty.current.size > 0) {
      const failed = STEPS.filter((s) => dirty.current.has(s.key)).map((s) => stepTitle(s.key, formRef.current.kind));
      toast.error(`Not saved: ${failed.join(", ")}. Open the step to see what to fix.`);
      return false;
    }
    toast.success("Everything is saved");
    return true;
  }

  async function goTo(next: StepKey, focusPath?: string) {
    await flush();
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", next);
    window.history.replaceState(window.history.state, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (focusPath) setTimeout(() => document.getElementById(focusPath)?.focus(), 350);
  }

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

  async function runStatus(action: typeof publishEstablishmentAction, ok: string) {
    if (!form.id) return;
    setBusy(true);
    await flush();
    const res = await action({ id: form.id });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setForm((prev) => ({ ...prev, status: res.data.form.status, publishedAt: res.data.form.publishedAt, slug: res.data.form.slug, shortSlug: res.data.form.shortSlug, citySlug: res.data.form.citySlug }));
    toast.success(ok);
  }

  const stepProps: EStepProps = { form, set, err, options, readOnly, role, hints };
  const theme = getTheme(form.themeKey, form.kind);
  const kindLabel = form.kind === "hospital" ? "hospital" : "clinic";

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
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
                  {stepTitle(s.key, form.kind)}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span aria-hidden className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: theme.palette.primary }} />
          <h2 className="min-w-0 truncate font-display text-2xl font-semibold text-ink">{form.name.trim() || `New ${kindLabel}`}</h2>
          <StatusBadge status={form.status} />
          {form.uid && (
            <span title="Permanent website UID" className="rounded-md bg-mist px-2 py-0.5 font-mono text-xs font-semibold text-ink">
              UID {form.uid}
            </span>
          )}
          <Pill tone="muted">{form.kind === "hospital" ? "Hospital" : "Clinic"}</Pill>
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
            {save.status === "idle" && !form.id && "A draft is created once the name is entered"}
          </span>
        </div>

        <div className="space-y-2 lg:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">
              Step {stepIndex + 1} of {STEPS.length} · {stepTitle(step, form.kind)}
            </span>
            {stepComplete(step, form) && <CheckCircle2 className="size-4 text-leaf" />}
          </div>
          <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="h-1.5" />
        </div>

        {hints && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-sage/50 px-4 py-3 text-sm text-ink">
            <ClipboardList className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              Made from website form <strong>{hints.ref}</strong>. Go through each step to confirm or change its answers (shown with <em>Use</em> / <em>Add</em> buttons), then publish from the last step.
            </span>
            {hints.intakeId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/intakes/${hints.intakeId}`} target="_blank">
                  <ExternalLink /> Form details &amp; contact
                </Link>
              </Button>
            )}
          </div>
        )}

        {readOnly && (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-muted p-4 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>This site is live. Only an admin can edit published sites.</p>
          </div>
        )}

        <h3 className="hidden font-display text-xl font-semibold text-ink lg:block">{stepTitle(step, form.kind)}</h3>

        {step === "basics" && <BasicsStep {...stepProps} />}
        {step === "location" && <LocationStep {...stepProps} />}
        {step === "timings" && <TimingsStep {...stepProps} />}
        {step === "services" && <ServicesStep {...stepProps} />}
        {step === "doctors" && <DoctorsStep {...stepProps} />}
        {step === "extras" && <ExtrasStep {...stepProps} />}
        {step === "gallery" && <GalleryStep {...stepProps} />}
        {step === "seo" && <SeoStep {...stepProps} />}
        {step === "business" && <BusinessStep {...stepProps} />}
        {step === "design" && <DesignStep {...stepProps} />}
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
              onSaveAll: saveAll,
              saving: save.status === "saving",
              // A recorded payment moved the setup/renewal dates on the server: show them (not an unsaved change).
              onBusinessDates: (d) => setForm((prev) => ({ ...prev, ...d })),
              ...(form.status === "published" && form.slug && form.citySlug
                ? { liveUrl: absUrl(form.kind === "hospital" ? paths.hospital(form.citySlug, form.slug) : paths.clinic(form.citySlug, form.slug)) }
                : {}),
              stepForField,
              onGoTo: (path, s) => void goTo(s, path || undefined),
              onPublish: () => void runStatus(publishEstablishmentAction, "Published — the site is live"),
              onUnpublish: () => void runStatus(unpublishEstablishmentAction, "Unpublished"),
              onSubmitReview: () => void runStatus(submitEstablishmentForReviewAction, "Sent to an admin for review"),
            }}
          />
        )}

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
