"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { saveMySiteSectionAction, signAccountUploadAction } from "@/app/account/actions";
import { UploadSignerProvider } from "@/components/admin/form/upload-signer";
import type { EStepProps } from "@/components/admin/establishment-editor/shared";
import { BasicsStep } from "@/components/admin/establishment-editor/steps/BasicsStep";
import { DesignStep } from "@/components/admin/establishment-editor/steps/DesignStep";
import { GalleryStep, LocationStep, ServicesStep, TimingsStep } from "@/components/admin/establishment-editor/steps/ContentSteps";
import { DoctorsStep, ExtrasStep } from "@/components/admin/establishment-editor/steps/PeopleSteps";
import { cn } from "@/lib/cn";
import { scanFields } from "@/lib/compliance/scan";
import { complianceTextFields, sectionPayload, stepForField, stepTitle, type EstablishmentForm, type StepKey } from "@/lib/establishments/form";
import type { EstablishmentEditorOptions } from "@/lib/establishments/options";

const TABS = [
  { key: "basics", title: "Name, logo and about", Step: BasicsStep },
  { key: "location", title: "Address and contact", Step: LocationStep },
  { key: "timings", title: "Timings", Step: TimingsStep },
  { key: "services", title: "Services and facilities", Step: ServicesStep },
  { key: "doctors", title: "Doctors", Step: DoctorsStep },
  { key: "extras", title: "", Step: ExtrasStep },
  { key: "gallery", title: "Photos", Step: GalleryStep },
  { key: "design", title: "Website design", Step: DesignStep },
] as const satisfies readonly { key: StepKey; title: string; Step: (p: EStepProps) => React.ReactNode }[];

type Tab = (typeof TABS)[number]["key"];

/**
 * A clinic or hospital owner's full self-editor: every section of the team's
 * editor except the page address, business details and publishing, as tabs.
 */
export function SiteSelfEditor({ initial, options }: { initial: EstablishmentForm; options: EstablishmentEditorOptions }) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<Tab>("basics");
  const [dirty, setDirty] = useState<Set<Tab>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const title = (key: Tab) => TABS.find((t) => t.key === key)!.title || stepTitle(key, form.kind);

  const set: EStepProps["set"] = (patch, opts) => {
    setForm((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));
    setDirty((d) => new Set(d).add((opts?.step ?? tab) as Tab));
    setMessage(null);
  };
  const issues = scanFields(complianceTextFields(form), options.bannedPhrases);
  const err = (path: string) => errors[path] ?? (issues.find((i) => i.field === path) ? `Not allowed under NMC guidelines: "${issues.find((i) => i.field === path)!.phrase}"` : undefined);

  const save = () =>
    start(async () => {
      for (const step of TABS.map((t) => t.key).filter((k) => dirty.has(k))) {
        const res = await saveMySiteSectionAction({ id: form.id, step, data: sectionPayload(step, form) });
        if (!res.ok) {
          setErrors(res.fieldErrors ?? {});
          setTab(step);
          setMessage({ ok: false, text: res.error });
          return;
        }
        setDirty((d) => {
          const n = new Set(d);
          n.delete(step);
          return n;
        });
      }
      setErrors({});
      setMessage({ ok: true, text: "Saved. Your website is updated." });
    });

  const current = TABS.find((t) => t.key === tab)!;
  const stepProps: EStepProps = { form, set, err, options, readOnly: false, role: "superadmin", audience: "owner" };

  return (
    <UploadSignerProvider value={signAccountUploadAction}>
      <div className="space-y-5">
        <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
            {TABS.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 transition",
                    tab === t.key ? "bg-ink text-paper ring-ink" : "bg-surface text-ink ring-line hover:ring-ink/30",
                  )}
                >
                  {title(t.key)}
                  {dirty.has(t.key) && <span aria-label="unsaved" className="size-2 rounded-full bg-marigold" />}
                  {(issues.some((i) => stepForField(i.field) === t.key) || Object.keys(errors).some((f) => stepForField(f) === t.key)) && (
                    <span aria-label="needs attention" className="size-2 rounded-full bg-clay" />
                  )}
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
            ) : (
              dirty.size > 0 && <p className="text-sm text-muted-foreground">Unsaved changes in {[...dirty].map((k) => title(k).toLowerCase()).join(", ")}.</p>
            )}
          </div>
        </div>
      </div>
    </UploadSignerProvider>
  );
}
