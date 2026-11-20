"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Loader2, Monitor, Save, Send, ShieldCheck, Smartphone, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { scanText } from "@/lib/compliance/scan";
import { APPROVAL_CHANNELS } from "@/lib/constants";
import type { StepKey } from "@/lib/doctors/form";
import { cn } from "@/lib/cn";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
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
  /** Saves every unsaved change; true when all of it saved. */
  onSaveAll: () => Promise<boolean>;
  saving: boolean;
  stepForField: (path: string) => StepKey;
}

const APPROVAL_LABEL: Record<(typeof APPROVAL_CHANNELS)[number], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  in_person: "In person",
};

/** Field text with each banned phrase underlined in clay (wavy). */
export function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const matches = scanText(text, phrases);
  const parts: React.ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={i} className="bg-clay/10 text-clay-text underline decoration-clay decoration-wavy underline-offset-4">
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
    interestsPhoto: "Beyond medicine photo",
    interestsStory: "Beyond medicine story",
    gallery: "Photo caption",
  };
  return `${names[head!] ?? head}${n}${leaf && head !== "gallery" ? ` (${leaf.replace(/([A-Z])/g, " $1").toLowerCase()})` : ""}`;
}

export function ReviewStep({ form: f, set, err, readOnly, review: r }: StepProps & { review: ReviewProps }) {
  const issueFields = [...new Set(r.issues.map((i) => i.field))];
  const canGoLive = r.blockers.length === 0 && r.issues.length === 0;
  const reasons = [...r.blockers.map((b) => b.message), ...(r.issues.length ? [`${r.issues.length} compliance issue(s)`] : [])];
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [size, setSize] = useState<"desktop" | "phone">("desktop");
  // The address the site will have: the doctor's own subdomain, else the MediReach page.
  const siteAddress = f.subdomain ? subdomainUrl(f.subdomain) : f.slug && f.citySlug ? absUrl(paths.doctor(f.citySlug, f.slug)) : absUrl("/");

  return (
    <div className="space-y-5">
      <Group title="NMC compliance" description="Superlatives, guarantees, success rates and patient counts are not allowed.">
        {issueFields.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
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
          <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
            <CheckCircle2 className="size-5" /> Everything required is filled in.
          </p>
        ) : (
          <ul className="space-y-2">
            {r.blockers.map((b) => (
              <li key={b.message} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-clay-text" /> {b.message}
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
              <option value="" />
              {APPROVAL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {APPROVAL_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Group>

      <Group title="Save and preview" description="Save everything first, then check the website and the visiting card exactly as the doctor will see them.">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={readOnly || r.saving || saving}
            onClick={async () => {
              setSaving(true);
              try {
                if (await r.onSaveAll()) setVersion((v) => v + 1);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save everything
          </Button>
          {f.id && (
            <Button asChild variant="outline">
              <a href={`/admin/preview/${f.id}`} target="_blank" rel="noopener">
                <Eye /> Open full preview
              </a>
            </Button>
          )}
        </div>
        {f.id ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
              <div className="flex items-center gap-3 border-b border-line bg-muted px-3 py-2">
                <span aria-hidden className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                </span>
                <span className="min-w-0 flex-1 truncate rounded-md bg-card px-3 py-1 text-xs text-muted-foreground">{siteAddress.replace(/^https?:\/\//, "")}</span>
                <div role="tablist" aria-label="Preview size" className="flex gap-1">
                  {(["desktop", "phone"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={size === k}
                      aria-label={k === "desktop" ? "Computer" : "Phone"}
                      onClick={() => setSize(k)}
                      className={cn("rounded-md p-1.5", size === k ? "bg-card text-ink shadow-soft" : "text-muted-foreground hover:text-ink")}
                    >
                      {k === "desktop" ? <Monitor className="size-4" /> : <Smartphone className="size-4" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center bg-muted/40">
                <iframe
                  key={`${version}-${size}`}
                  src={`/admin/preview/${f.id}?v=${version}`}
                  title="Website preview"
                  className={cn("h-[680px] bg-white", size === "phone" ? "w-[390px] border-x border-line" : "w-full")}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Digital visiting card</p>
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- the card as rendered for printing */}
                <img src={`/admin/cards/${f.id}/print.png?v=${f.updatedAt ?? ""}-${version}`} alt="Visiting card (print)" className="w-full max-w-md rounded-lg border border-line shadow-soft" />
                {/* eslint-disable-next-line @next/next/no-img-element -- the card as shared on WhatsApp */}
                <img src={`/admin/cards/${f.id}/phone.png?v=${f.updatedAt ?? ""}-${version}`} alt="Visiting card (phone)" className="w-44 rounded-xl border border-line shadow-soft" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Downloads and the QR code are on{" "}
                <a href={`/admin/cards?doctor=${f.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">
                  Visiting cards
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Enter the doctor&apos;s name (Basics) to create the draft first.</p>
        )}
      </Group>

      <Group title="Publish">
        <div className="flex flex-wrap gap-2">
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
