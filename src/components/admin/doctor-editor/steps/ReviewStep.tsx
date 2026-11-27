"use client";

import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, NativeSelect, SwitchField } from "@/components/admin/form/fields";
import {
  OwnDomain,
  Payments,
  LiveSite,
  SalesExecutive,
  SaveAndPreview,
  SendPreviewLink,
  SetupRenewal,
  StepGroup,
  useCloseToDashboard,
  type BusinessDates,
} from "@/components/admin/review/ReviewParts";
import { scanText } from "@/lib/compliance/scan";
import { APPROVAL_CHANNELS } from "@/lib/constants";
import type { StepKey } from "@/lib/doctors/form";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { grid2, type StepProps } from "../shared";

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
  /** Setup/renewal dates after a payment was recorded (applied without an unsaved change). */
  onBusinessDates: (d: BusinessDates) => void;
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

/** Step 10 "Review" (phase "check") and step 11 "Publish" (phase "publish"). */
export function ReviewStep({ form: f, set, err, options, readOnly, role, review: r, phase }: StepProps & { review: ReviewProps; phase: "check" | "publish" }) {
  const { close, closing } = useCloseToDashboard(r.onSaveAll);
  const isAdmin = role !== "sales";
  const issueFields = [...new Set(r.issues.map((i) => i.field))];
  const canGoLive = r.blockers.length === 0 && r.issues.length === 0;
  const reasons = [...r.blockers.map((b) => b.message), ...(r.issues.length ? [`${r.issues.length} compliance issue(s)`] : [])];
  const name = f.displayName || [f.title || "Dr.", f.firstName, f.lastName].filter(Boolean).join(" ");
  const target = { kind: "doctor" as const, id: f.id, name: name.trim() || "the doctor" };
  // The address the site will have: the doctor's own subdomain, else the MediReach page.
  const address = f.subdomain ? subdomainUrl(f.subdomain) : f.slug && f.citySlug ? absUrl(paths.doctor(f.citySlug, f.slug)) : absUrl("/");
  const listPrice = f.founding ? options.prices.foundingRenewal : options.prices.renewalDoctor;
  const otherBlockers = r.blockers.filter((b) => b.field !== "publish");

  if (phase === "check") {
    return (
      <div className="space-y-5">
        <StepGroup n={1} title="Review" description="Superlatives, guarantees, success rates and patient counts are not allowed.">
          {issueFields.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
              <ShieldCheck className="size-5" /> NMC check: no banned phrases found.
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
          {otherBlockers.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
              <CheckCircle2 className="size-5" /> Everything required is filled in.
            </p>
          ) : (
            <ul className="space-y-2">
              {otherBlockers.map((b) => (
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
        </StepGroup>

        <StepGroup n={2} title="Sales executive" description="Internal. Never shown on the page.">
          <SalesExecutive name={f.salesExecutive} staffId={f.salesExecutiveId} team={options.team} disabled={readOnly || !isAdmin} onChange={(patch) => set(patch, { step: "business" })} />
        </StepGroup>

        <StepGroup n={3} title="Save everything and preview" description="Saves every change, then shows the website and the visiting card exactly as the doctor will see them.">
          <SaveAndPreview
            target={target}
            readOnly={readOnly}
            saving={r.saving}
            onSaveAll={r.onSaveAll}
            address={address}
            previewSrc={`/admin/preview/${f.id}`}
            cardSrc={`/admin/cards/${f.id}`}
            cardPageHref={`/admin/cards?doctor=${f.id}`}
          />
        </StepGroup>

        <StepGroup n={4} title="Send the preview for approval" description={`Send ${target.name} a private link to their website and visiting card.`}>
          <SendPreviewLink target={target} disabled={readOnly} />
        </StepGroup>

      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepGroup n={1} title="Doctor's approval" description="When and how the doctor approved the final page. Required to publish.">
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
        {!f.approval.doctorApprovedAt && (
          <Button type="button" size="sm" variant="ghost" disabled={readOnly} onClick={() => set((f) => ({ approval: { ...f.approval, doctorApprovedAt: new Date().toISOString().slice(0, 10) } }))}>
            Approved today
          </Button>
        )}
      </StepGroup>

      {/* Payments, setup/renewal and own domain: super admin only (sales executives never see payments). */}
      {isAdmin && (
      <>
      <StepGroup n={2} title="Payment" description="Record the payment here; it is saved to Payments at once.">
        <Payments
          target={target}
          canRecord={isAdmin}
          setupAmount={f.plan === "doctor_addon" ? options.prices.doctorAddon : options.prices.doctorSetup}
          gstIncluded={options.gstIncluded}
          onDates={r.onBusinessDates}
        />
      </StepGroup>

      <StepGroup n={3} title="Setup and renewal" description="Setup is paid once; the renewal is yearly from year 2.">
        <SetupRenewal
          value={{ setupPaidAt: f.setupPaidAt, renewalDueDate: f.renewalDueDate, renewalStatus: f.renewalStatus, renewalPrice: f.renewalPrice }}
          onChange={(patch) => set(patch, { step: "business" })}
          listPrice={listPrice}
          isAdmin={isAdmin}
          readOnly={readOnly}
          err={err}
        >
          <SwitchField
            label="Free update already used"
            description="The first done-for-you update is free."
            checked={f.freeUpdateUsed}
            disabled={readOnly}
            onCheckedChange={(freeUpdateUsed) => set({ freeUpdateUsed }, { step: "business" })}
          />
        </SetupRenewal>
      </StepGroup>

      <StepGroup n={4} title="Own domain (optional)">
        <OwnDomain value={f.ownDomain} onChange={(ownDomain) => set({ ownDomain }, { step: "business" })} isAdmin={isAdmin} readOnly={readOnly} err={err} placeholder="drshah.in" />
      </StepGroup>
      </>
      )}

      <StepGroup n={isAdmin ? 5 : 2} title={isAdmin ? "Publish" : "Send for review"}>
        {r.blockers.length > 0 && (
          <ul className="space-y-1 text-sm">
            {r.blockers.map((b) => (
              <li key={b.message} className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-clay-text" /> {b.message}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
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
          <Button type="button" variant="ghost" disabled={closing} onClick={() => void close()}>
            {closing ? <Loader2 className="animate-spin" /> : null} Close
          </Button>
        </div>
        {!r.canPublish && <p className="text-sm text-muted-foreground">The super admin checks it and publishes it once the payment is received.</p>}
      </StepGroup>

      <StepGroup n={isAdmin ? 6 : 3} title="Live site" description="After publishing: check the live site, then send its link to the doctor.">
        <LiveSite target={target} live={f.status === "published"} liveUrl={r.liveUrl} disabled={readOnly} />
      </StepGroup>
    </div>
  );
}
