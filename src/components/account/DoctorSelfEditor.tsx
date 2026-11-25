"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { saveMyDoctorSectionAction, signAccountUploadAction } from "@/app/account/actions";
import { UploadSignerProvider } from "@/components/admin/form/upload-signer";
import type { StepProps } from "@/components/admin/doctor-editor/shared";
import { AboutStep } from "@/components/admin/doctor-editor/steps/AboutStep";
import { BasicsStep } from "@/components/admin/doctor-editor/steps/BasicsStep";
import { ClinicsStep } from "@/components/admin/doctor-editor/steps/ClinicsStep";
import { ContactStep } from "@/components/admin/doctor-editor/steps/ContactStep";
import { PracticeStep } from "@/components/admin/doctor-editor/steps/PracticeStep";
import { RegistrationStep } from "@/components/admin/doctor-editor/steps/RegistrationStep";
import { TemplatesStep } from "@/components/admin/doctor-editor/steps/TemplatesStep";
import { cn } from "@/lib/cn";
import { scanFields } from "@/lib/compliance/scan";
import { complianceTextFields, sectionPayload, stepForField, type DoctorForm, type StepKey } from "@/lib/doctors/form";
import type { EditorOptions } from "@/lib/doctors/options";
import type { DoctorSelfStep } from "@/lib/self-edit";

const DOCTOR_SELF_TABS = [
  { key: "basics", title: "Personal details", Step: BasicsStep },
  { key: "registration", title: "Registration and education", Step: RegistrationStep },
  { key: "practice", title: "Specialty and services", Step: PracticeStep },
  { key: "clinics", title: "Clinics and timings", Step: ClinicsStep },
  { key: "contact", title: "Phone and links", Step: ContactStep },
  { key: "about", title: "About, awards and photos", Step: AboutStep },
  { key: "templates", title: "Website design", Step: TemplatesStep },
] as const satisfies readonly { key: StepKey; title: string; Step: (p: StepProps) => React.ReactNode }[];

export type DoctorSelfTab = DoctorSelfStep;

/**
 * The doctor's full self-editor: the same sections as the team's editor
 * (everything except the page address, business details and publishing),
 * as tabs. Changes are kept across tabs and saved together; the server
 * checks each section exactly as for the team. `demo` keeps changes on screen.
 */
export function DoctorSelfEditor({ initial, options, initialTab = "basics", demo }: { initial: DoctorForm; options: EditorOptions; initialTab?: DoctorSelfTab; demo?: boolean }) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<DoctorSelfTab>(initialTab);
  const [dirty, setDirty] = useState<Set<DoctorSelfTab>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const set: StepProps["set"] = (patch, opts) => {
    setForm((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));
    const target = (opts?.step ?? tab) as DoctorSelfTab;
    setDirty((d) => new Set(d).add(target));
    setMessage(null);
  };
  // Live NMC check on free text, like the team's editor.
  const issues = scanFields(complianceTextFields(form), options.bannedPhrases);
  const err = (path: string) => errors[path] ?? (issues.find((i) => i.field === path) ? `Not allowed under NMC guidelines: "${issues.find((i) => i.field === path)!.phrase}"` : undefined);

  const save = () =>
    start(async () => {
      if (demo) {
        setDirty(new Set());
        setMessage({ ok: true, text: "Demo: on a real account your website updates straight away." });
        return;
      }
      const order = DOCTOR_SELF_TABS.map((t) => t.key).filter((k) => dirty.has(k));
      let latest = form;
      for (const step of order) {
        const res = await saveMyDoctorSectionAction({ step, data: sectionPayload(step, latest) });
        if (!res.ok) {
          setErrors(res.fieldErrors ?? {});
          setTab(step);
          setMessage({ ok: false, text: res.error });
          top.current?.scrollIntoView({ behavior: "smooth" });
          return;
        }
        // New clinics get their ids; keep the rest of what's on screen.
        latest = { ...latest, ...(step === "clinics" ? { clinics: latest.clinics.map((c, i) => ({ ...c, key: res.data.form.clinics[i]?.key ?? c.key })) } : {}) };
        setDirty((d) => {
          const n = new Set(d);
          n.delete(step);
          return n;
        });
      }
      setForm(latest);
      setErrors({});
      setMessage({ ok: true, text: "Saved. Your website is updated." });
    });

  const current = DOCTOR_SELF_TABS.find((t) => t.key === tab)!;
  const stepProps: StepProps = { form, set, err, options, readOnly: false, role: "admin", doctorId: form.id, audience: "owner" };
  const tabIssues = (key: StepKey) => issues.some((i) => stepForField(i.field) === key) || Object.keys(errors).some((f) => stepForField(f) === key);

  return (
    <UploadSignerProvider value={demo ? undefined : signAccountUploadAction}>
      <div ref={top} className="scroll-mt-24 space-y-5">
        <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
            {DOCTOR_SELF_TABS.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 transition",
                    tab === t.key ? "bg-ink text-paper ring-ink" : "bg-surface text-ink ring-line hover:ring-ink/30",
                  )}
                >
                  {t.title}
                  {dirty.has(t.key) && <span aria-label="unsaved" className="size-2 rounded-full bg-marigold" />}
                  {tabIssues(t.key) && <span aria-label="needs attention" className="size-2 rounded-full bg-clay" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <current.Step {...stepProps} />
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-mist px-4 py-3 text-sm text-body">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" />
          Your page address and your website UID stay fixed. To change them, or for anything you would like us to do for you, message our team.
        </p>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={save}
              disabled={pending || dirty.size === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98] disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Save changes
            </button>
            {message ? (
              <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
                {message.ok && <CheckCircle2 className="size-4" />} {message.text}
              </p>
            ) : dirty.size > 0 ? (
              <p className="text-sm text-muted-foreground">
                Unsaved changes in {DOCTOR_SELF_TABS.filter((t) => dirty.has(t.key)).map((t) => t.title.toLowerCase()).join(", ")}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Editing: {current.title.toLowerCase()}.</p>
            )}
          </div>
        </div>
      </div>
    </UploadSignerProvider>
  );
}
