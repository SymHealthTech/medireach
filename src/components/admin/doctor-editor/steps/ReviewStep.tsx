"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Loader2, Send, ShieldCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { scanText } from "@/lib/compliance/scan";
import { APPROVAL_CHANNELS } from "@/lib/constants";
import type { StepKey } from "@/lib/doctors/form";
import { Group, grid2, type StepProps } from "../shared";

export interface ReviewProps {
  textFields: Record<string, string>;
  issues: { field: string; phrase: string }[];
  blockers: { field: StepKey; message: string }[];
  recommended: string[];
  phrases: string[];
  canPublish: boolean;
  busy: boolean;
  liveUrl?: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onSubmitReview: () => void;
  onGoTo: (path: string, step: StepKey) => void;
  stepForField: (path: string) => StepKey;
}

const APPROVAL_LABEL: Record<(typeof APPROVAL_CHANNELS)[number], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  in_person: "In person",
};

/** Field text with each banned phrase underlined in clay (wavy). */
function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const matches = scanText(text, phrases);
  const parts: React.ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={i} className="bg-clay/10 text-clay underline decoration-clay decoration-wavy underline-offset-4">
        {text.slice(m.index, m.index + m.length)}
      </mark>,
    );
    last = m.index + m.length;
  });
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function fieldLabel(path: string): string {
  const [head, idx, leaf] = path.split(".");
  const n = idx !== undefined && /^\d+$/.test(idx) ? ` ${Number(idx) + 1}` : "";
  const names: Record<string, string> = {
    displayName: "Display name",
    shortBio: "Short bio",
    fullBio: "Full bio",
    seo: "SEO override",
    qualifications: "Qualification",
    services: "Service",
    conditionsTreated: "Condition",
    clinics: "Clinic",
    awards: "Award",
    memberships: "Membership",
    publications: "Publication",
    interests: "Interest",
    gallery: "Photo caption",
  };
  return `${names[head!] ?? head}${n}${leaf && head !== "gallery" ? ` (${leaf.replace(/([A-Z])/g, " $1").toLowerCase()})` : ""}`;
}

export function ReviewStep({ form: f, set, err, readOnly, review: r }: StepProps & { review: ReviewProps }) {
  const issueFields = [...new Set(r.issues.map((i) => i.field))];
  const canGoLive = r.blockers.length === 0 && r.issues.length === 0;
  const reasons = [...r.blockers.map((b) => b.message), ...(r.issues.length ? [`${r.issues.length} compliance issue(s)`] : [])];

  return (
    <div className="space-y-5">
      <Group title="NMC compliance" description="Superlatives, guarantees, success rates and patient counts are not allowed.">
        {issueFields.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-leaf">
            <ShieldCheck className="size-5" /> No banned phrases found.
          </p>
        ) : (
          <ul className="space-y-3">
            {issueFields.map((path) => (
              <li key={path} className="rounded-lg border border-clay/30 bg-clay/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{fieldLabel(path)}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => r.onGoTo(path, r.stepForField(path))}>
                    Fix
                  </Button>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-body">
                  <Highlighted text={r.textFields[path] ?? ""} phrases={r.phrases} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group title="Required to publish">
        {r.blockers.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-leaf">
            <CheckCircle2 className="size-5" /> Everything required is filled in.
          </p>
        ) : (
          <ul className="space-y-2">
            {r.blockers.map((b) => (
              <li key={b.message} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-clay" /> {b.message}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => r.onGoTo("", b.field)}>
                  Go
                </Button>
              </li>
            ))}
          </ul>
        )}
        {r.recommended.length > 0 && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Recommended (not required)</p>
            <p className="mt-1 text-muted-foreground">{r.recommended.join(" · ")}</p>
          </div>
        )}
      </Group>

      <Group title="Doctor's approval" description="Record when and how the doctor approved the final page. Required to publish.">
        <div className={grid2}>
          <Field label="Approved on" htmlFor="approval.doctorApprovedAt" error={err("approval.doctorApprovedAt")}>
            <Input
              id="approval.doctorApprovedAt"
              type="date"
              value={f.approval.doctorApprovedAt}
              disabled={readOnly}
              onChange={(e) => set((f) => ({ approval: { ...f.approval, doctorApprovedAt: e.target.value } }))}
            />
          </Field>
          <Field label="Approved via" htmlFor="approval.approvedVia">
            <NativeSelect
              id="approval.approvedVia"
              value={f.approval.approvedVia}
              disabled={readOnly}
              onChange={(e) => set((f) => ({ approval: { ...f.approval, approvedVia: e.target.value as typeof f.approval.approvedVia } }))}
            >
              <option value="">Choose…</option>
              {APPROVAL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {APPROVAL_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Group>

      <Group title="Publish">
        <div className="flex flex-wrap gap-2">
          {f.id && (
            <Button asChild variant="outline">
              <a href={`/admin/preview/${f.id}`} target="_blank" rel="noopener">
                <Eye /> Preview
              </a>
            </Button>
          )}
          {r.liveUrl && (
            <Button asChild variant="outline">
              <a href={r.liveUrl} target="_blank" rel="noopener">
                <ExternalLink /> Open live page
              </a>
            </Button>
          )}
          {r.canPublish ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={canGoLive ? -1 : 0}>
                    <Button type="button" disabled={!canGoLive || r.busy || !f.id} onClick={r.onPublish}>
                      {r.busy ? <Loader2 className="animate-spin" /> : <Send />}
                      {f.status === "published" ? "Republish" : "Publish"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canGoLive && <TooltipContent className="max-w-xs">Can&apos;t publish yet: {reasons.join("; ")}.</TooltipContent>}
              </Tooltip>
              {f.status === "published" && (
                <Button type="button" variant="outline" disabled={r.busy} onClick={r.onUnpublish}>
                  <Undo2 /> Unpublish
                </Button>
              )}
            </>
          ) : (
            f.status !== "published" && (
              <Button type="button" disabled={r.busy || !f.id || f.status === "review"} onClick={r.onSubmitReview}>
                <Send /> {f.status === "review" ? "Sent for review" : "Send for review"}
              </Button>
            )
          )}
        </div>
        {!r.canPublish && <p className="text-sm text-muted-foreground">An admin will check and publish this page.</p>}
      </Group>
    </div>
  );
}
