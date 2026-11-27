"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, CreditCard, ExternalLink, Loader2, Send, ShieldCheck, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, NativeSelect, SwitchField } from "@/components/admin/form/fields";
import { Group, grid2 } from "@/components/admin/doctor-editor/shared";
import { Highlighted } from "@/components/admin/doctor-editor/steps/ReviewStep";
import { checkEstablishmentUrlKeyAction, sendEstablishmentLoginEmailAction } from "@/app/admin/(dash)/establishments/actions";
import { APPROVAL_CHANNELS, ESTABLISHMENT_SOURCES } from "@/lib/constants";
import type { EstablishmentForm, StepKey } from "@/lib/establishments/form";
import { establishmentDescription, establishmentTitle } from "@/lib/seo/establishment";
import { absUrl, paths, ROOT_HOSTNAME, subdomainUrl } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";
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
import type { EStepProps } from "../shared";


// ---------------------------------------------------------------- SEO
type KeyKind = "slug" | "shortSlug" | "subdomain";

function useAvailability(kind: KeyKind, value: string, id: string | undefined, citySlug: string) {
  const [state, setState] = useState<{ status: "idle" | "checking" | "ok" | "bad"; message?: string }>({ status: "idle" });
  useEffect(() => {
    if (!value) return setState({ status: "idle" });
    setState({ status: "checking" });
    const t = setTimeout(async () => {
      const res = await checkEstablishmentUrlKeyAction({ id, kind, value, citySlug: citySlug || undefined });
      if (!res.ok) return setState({ status: "bad", message: res.error });
      setState({ status: res.data.available ? "ok" : "bad", message: res.data.message });
    }, 400);
    return () => clearTimeout(t);
  }, [kind, value, id, citySlug]);
  return state;
}

function Availability({ state }: { state: ReturnType<typeof useAvailability> }) {
  if (state.status === "idle") return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", state.status === "ok" ? "text-leaf-text" : state.status === "bad" ? "text-clay-text" : "text-muted-foreground")}>
      {state.status === "checking" ? <Loader2 className="size-3.5 animate-spin" /> : state.status === "ok" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {state.status === "checking" ? "Checking…" : state.message}
    </span>
  );
}

/** Title/description inputs for the snippet preview, from the form as it is now. */
export function seoInput(f: EstablishmentForm, o: EStepProps["options"]) {
  const area = o.areas.find((a) => a.id === f.address.areaId)?.name;
  const city = o.cities.find((c) => c.id === f.address.cityId)?.name;
  const categoryName = o.categories.find((c) => c.id === f.categoryId)?.name;
  return {
    kind: f.kind,
    name: f.name || (f.kind === "hospital" ? "Hospital name" : "Clinic name"),
    ...(categoryName ? { categoryName } : {}),
    ...(area ? { area } : {}),
    ...(city ? { city } : {}),
    ...(f.shortDescription ? { shortDescription: f.shortDescription } : {}),
    seo: { titleOverride: f.seo.titleOverride || undefined, descriptionOverride: f.seo.descriptionOverride || undefined },
  };
}

export function SeoStep({ form: f, set, err, options, readOnly, hints }: EStepProps) {
  const citySlug = f.citySlug || options.cities.find((c) => c.id === f.address.cityId)?.slug || "";
  const slugState = useAvailability("slug", f.slug, f.id, citySlug);
  const shortState = useAvailability("shortSlug", f.shortSlug, f.id, citySlug);
  const subState = useAvailability("subdomain", f.subdomain, f.id, citySlug);
  const input = seoInput(f, options);
  const title = establishmentTitle(input);
  const description = establishmentDescription(input);
  const folder = f.kind === "hospital" ? paths.hospital : paths.clinic;
  const pageUrl = absUrl(folder(citySlug || "city", f.slug || "…"));
  const base = slugify(f.name).replace(/^dr-/, "");
  // What they asked for on the website form first, then from the name.
  const asked = hints?.websiteName ? slugify(hints.websiteName.replace(/\.medireach.*$/i, "")).replace(/-/g, "") : "";
  const suggestions = [asked, base.replace(/-/g, ""), base].filter((x, i, a) => x.length >= 3 && x.length <= 40 && a.indexOf(x) === i);
  // Show the result as the site's own website (subdomain) or as the MediReach page, as in the doctor editor.
  const [view, setView] = useState<"subdomain" | "page">("subdomain");
  const shownUrl = view === "subdomain" ? subdomainUrl(f.subdomain || suggestions[0] || "name") : pageUrl;
  const logoUrl = f.logo?.url ? f.logo.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_pad,b_white,w_56,h_56/") : undefined;
  const coverUrl = f.coverPhoto?.url ? f.coverPhoto.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,w_184,h_184/") : undefined;

  return (
    <div className="space-y-5">
      <Group title="Google preview" description="How the site should look in search results. Google may vary it.">
        <div role="tablist" aria-label="Show as" className="inline-flex gap-1 rounded-lg border border-line bg-card p-1">
          {(
            [
              ["subdomain", "Own website (subdomain)"],
              ["page", "MediReach page"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={cn("min-h-9 rounded-md px-3 text-sm font-semibold", view === k ? "bg-ink text-on-ink" : "text-muted-foreground hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-white p-4 font-[arial,sans-serif] text-[#202124]">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                {view === "subdomain" && logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small preview of the site's logo
                  <img src={logoUrl} alt="" className="size-7 shrink-0 rounded-full border border-[#dadce0] object-contain" />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[10px] font-bold text-[#0a3f3f]">
                    {view === "subdomain" ? (f.name.trim()[0]?.toUpperCase() ?? "C") : "M"}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{view === "subdomain" ? f.name || input.name : "MediReach"}</span>
                  <span className="block truncate text-[#4d5156]">{shownUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\//g, " › ")}</span>
                </span>
              </div>
              <p className="mt-2 text-xl leading-snug text-[#1a0dab]">{title}</p>
              <p className="mt-1 text-sm leading-normal text-[#4d5156]">{description}</p>
            </div>
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- the result thumbnail Google may show
              <img src={coverUrl} alt="" className="mt-6 size-[92px] shrink-0 rounded-lg object-cover" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Title {title.length}/60 · Description {description.length}/155
          {!logoUrl && " · Add a logo (Basics) to show it in results."}
          {view === "subdomain" && !f.subdomain && " · Set the website address below to see the real address."}
        </p>
      </Group>

      <Group title="Addresses" description="Filled in automatically once the name, city and area are set. Changing them after publishing breaks old links.">
        <Field label="Page address" htmlFor="slug" help={<>{absUrl(folder(citySlug || "pune", ""))}<strong>{f.slug || "…"}</strong></>} error={err("slug")}>
          <div className="flex items-center gap-3">
            <Input id="slug" value={f.slug} disabled={readOnly} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} />
            <Availability state={slugState} />
          </div>
        </Field>
        <Field label="Short name" htmlFor="shortSlug" help="Used for short links and the visiting card." error={err("shortSlug")}>
          <div className="flex items-center gap-3">
            <Input id="shortSlug" value={f.shortSlug} disabled={readOnly} onChange={(e) => set({ shortSlug: e.target.value.toLowerCase() })} />
            <Availability state={shortState} />
          </div>
        </Field>
        <Field
          label="Website address (subdomain)"
          htmlFor="subdomain"
          help={<><strong>{f.subdomain || "name"}</strong>.{ROOT_HOSTNAME}, shared with doctor addresses, so each name is used once.</>}
          error={err("subdomain")}
        >
          <div className="flex items-center gap-3">
            <Input id="subdomain" value={f.subdomain} disabled={readOnly} placeholder="e.g. shreeskin" onChange={(e) => set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
            <Availability state={subState} />
          </div>
          {!f.subdomain && suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" disabled={readOnly} onClick={() => set({ subdomain: s })} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs hover:border-ink/40">
                  Use {s}
                  {s === asked && ` (asked for in form ${hints?.ref})`}
                </button>
              ))}
            </div>
          )}
        </Field>
      </Group>

      <Group title="Overrides (optional)" description="Leave empty to use the automatic title and description.">
        <Field label="Title override" htmlFor="seo.titleOverride" help={`${f.seo.titleOverride.length}/70`} error={err("seo.titleOverride")}>
          <Input id="seo.titleOverride" maxLength={70} value={f.seo.titleOverride} disabled={readOnly} onChange={(e) => set((p) => ({ seo: { ...p.seo, titleOverride: e.target.value } }))} />
        </Field>
        <Field label="Description override" htmlFor="seo.descriptionOverride" help={`${f.seo.descriptionOverride.length}/160`} error={err("seo.descriptionOverride")}>
          <Textarea id="seo.descriptionOverride" rows={2} maxLength={160} value={f.seo.descriptionOverride} disabled={readOnly} onChange={(e) => set((p) => ({ seo: { ...p.seo, descriptionOverride: e.target.value } }))} />
        </Field>
        <SwitchField
          label="Hide from Google (noindex)"
          description="The site stays reachable by link but won't appear in search or the sitemap."
          checked={f.seo.noindex}
          disabled={readOnly}
          onCheckedChange={(noindex) => set((p) => ({ seo: { ...p.seo, noindex } }))}
        />
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Business
const SOURCE_LABEL: Record<(typeof ESTABLISHMENT_SOURCES)[number], string> = {
  field: "Field visit",
  referral: "Referral",
  hospital: "Hospital",
  inbound: "Inbound (website / WhatsApp)",
};

/**
 * Business: contact person and source (hospitals), owner login, notes. Sales
 * executive is on Review; payments, setup/renewal and own domain are on Publish.
 */
export function BusinessStep({ form: f, set, err, readOnly, role }: EStepProps) {
  const isAdmin = role !== "sales";
  const hospital = f.kind === "hospital";
  // The owner usually logs in with the email given earlier (contact person, or the site's email in Location and contact).
  const earlierEmail = (f.contactPerson.email || f.email).trim();
  useEffect(() => {
    if (!readOnly && !f.ownerEmail.trim() && earlierEmail) set({ ownerEmail: earlierEmail });
    // Only when the step opens: clearing the box afterwards keeps it empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {hospital && (
        <Group title="Contact person and source" description="Internal. Never shown on the public site.">
          <div className={grid2}>
            <Field label="Contact person" htmlFor="contactPerson.name">
              <Input id="contactPerson.name" value={f.contactPerson.name} disabled={readOnly} onChange={(e) => set((p) => ({ contactPerson: { ...p.contactPerson, name: e.target.value } }))} />
            </Field>
            <Field label="Their phone" htmlFor="contactPerson.phone" error={err("contactPerson.phone")}>
              <Input id="contactPerson.phone" type="tel" inputMode="tel" value={f.contactPerson.phone} disabled={readOnly} onChange={(e) => set((p) => ({ contactPerson: { ...p.contactPerson, phone: e.target.value } }))} />
            </Field>
            <Field label="Their email" htmlFor="contactPerson.email" error={err("contactPerson.email")}>
              <Input
                id="contactPerson.email"
                type="email"
                value={f.contactPerson.email}
                disabled={readOnly}
                onChange={(e) => {
                  const email = e.target.value;
                  set((p) => ({
                    contactPerson: { ...p.contactPerson, email },
                    // The owner login email follows it until it is changed by hand.
                    ...(!p.ownerEmail.trim() || p.ownerEmail.trim() === p.contactPerson.email.trim() ? { ownerEmail: email.trim() } : {}),
                  }));
                }}
              />
            </Field>
            <Field label="Source" htmlFor="source">
              <NativeSelect id="source" value={f.source} disabled={readOnly} onChange={(e) => set({ source: e.target.value as typeof f.source })}>
                <option value="" />
                {ESTABLISHMENT_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </Group>
      )}

      <Group title="Owner login" description="Lets the owner log in at /login and update everything on their site (full update access). One email can own several sites. The welcome email (site link and login) goes out by itself when the site is first published.">
        <div className={grid2}>
          <Field
            label="Owner login email"
            htmlFor="ownerEmail"
            error={err("ownerEmail")}
            help={earlierEmail && f.ownerEmail.trim().toLowerCase() === earlierEmail.toLowerCase() ? "Filled in from the email added earlier. Change it if the owner logs in with another email." : undefined}
          >
            <Input id="ownerEmail" type="email" value={f.ownerEmail} disabled={readOnly} onChange={(e) => set({ ownerEmail: e.target.value })} />
          </Field>
          <OwnerLoginEmailButton id={f.id} savedEmail={f.ownerEmail} />
        </div>
      </Group>

      <Group title={isAdmin ? "Notes and payments" : "Notes"}>
        <Field label="Internal notes" htmlFor="internalNotes">
          <Textarea id="internalNotes" rows={3} value={f.internalNotes} disabled={readOnly} onChange={(e) => set({ internalNotes: e.target.value })} />
        </Field>
        {isAdmin && f.id && (
          <Button asChild variant="outline">
            {/* A new tab, so nothing typed here is lost. */}
            <Link href={`/admin/payments?establishment=${f.id}`} target="_blank" rel="noopener">
              <CreditCard /> All payments for this {f.kind} <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        )}
        {isAdmin && <p className="text-xs text-muted-foreground">The sales executive is on the Review step; payment, setup and renewal, and own domain are on the last step, Publish.</p>}
      </Group>
    </div>
  );
}

// ---------------------------------------------------------------- Review
const APPROVAL_LABEL: Record<(typeof APPROVAL_CHANNELS)[number], string> = { whatsapp: "WhatsApp", email: "Email", in_person: "In person" };

const FIELD_NAMES: Record<string, string> = {
  tagline: "Tagline",
  shortDescription: "Short description",
  about: "About",
  appointmentNote: "Appointment note",
  visitingHours: "Visiting hours",
  address: "Parking note",
  seo: "SEO override",
  services: "Service",
  facilities: "Facility",
  equipment: "Equipment",
  doctors: "Doctor role",
  departments: "Department",
  gallery: "Photo caption",
};
function fieldLabel(path: string): string {
  const [head, idx] = path.split(".");
  const n = idx !== undefined && /^\d+$/.test(idx) ? ` ${Number(idx) + 1}` : "";
  return `${FIELD_NAMES[head!] ?? head}${n}`;
}

export interface EReviewProps {
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
  /** Saves every step; true when all of it saved. */
  onSaveAll: () => Promise<boolean>;
  saving: boolean;
  /** Setup/renewal dates after a payment was recorded (applied without an unsaved change). */
  onBusinessDates: (d: BusinessDates) => void;
}

/** Step 11 "Review" (phase "check") and step 12 "Publish" (phase "publish"). */
export function ReviewStep({ form: f, set, err, options, readOnly, role, review: r, phase }: EStepProps & { review: EReviewProps; phase: "check" | "publish" }) {
  const { close, closing } = useCloseToDashboard(r.onSaveAll);
  const isAdmin = role !== "sales";
  const hospital = f.kind === "hospital";
  const what = hospital ? "hospital" : "clinic";
  const issueFields = [...new Set(r.issues.map((i) => i.field))];
  const canGoLive = r.blockers.length === 0 && r.issues.length === 0;
  const reasons = [...r.blockers.map((b) => b.message), ...(r.issues.length ? [`${r.issues.length} compliance issue(s)`] : [])];
  const target = { kind: "site" as const, id: f.id, name: f.name || `the ${what}` };
  const listPrice = hospital
    ? f.founding
      ? options.prices.foundingRenewalHospital
      : options.prices.renewalHospital
    : f.founding
      ? options.prices.foundingRenewal
      : options.prices.renewalClinic;
  const address = f.subdomain ? subdomainUrl(f.subdomain) : absUrl((hospital ? paths.hospital : paths.clinic)(f.citySlug || "city", f.slug || "…"));

  if (phase === "check") {
    return (
      <div className="space-y-5">
        <StepGroup n={1} title="Review" description="Factual information only: no superlatives, guarantees, success rates, patient counts or comparisons.">
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
          {r.blockers.filter((b) => b.field !== "publish").length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
              <CheckCircle2 className="size-5" /> Everything required is filled in.
            </p>
          ) : (
            <ul className="space-y-2">
              {r.blockers
                .filter((b) => b.field !== "publish")
                .map((b) => (
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

        <StepGroup n={2} title="Sales executive" description="Internal. Never shown on the site.">
          <SalesExecutive name={f.salesExecutive} staffId={f.salesExecutiveId} team={options.team} disabled={readOnly || !isAdmin} onChange={(patch) => set(patch, { step: "business" })} />
        </StepGroup>

        <StepGroup n={3} title="Save everything and preview" description={`Saves every step, so the ${what} is a complete listing (page address, website and visiting card). Then check both.`}>
          <SaveAndPreview
            target={target}
            readOnly={readOnly}
            saving={r.saving}
            onSaveAll={r.onSaveAll}
            address={address}
            previewSrc={`/admin/preview/site/${f.id}`}
            cardSrc={`/admin/cards/site/${f.id}`}
            cardPageHref={`/admin/cards?type=${f.kind}&establishment=${f.id}`}
          />
        </StepGroup>

        <StepGroup n={4} title="Send the preview for approval" description={`Send ${f.name || `the ${what}`} a private link to their website and visiting card.`}>
          <SendPreviewLink target={target} disabled={readOnly} />
        </StepGroup>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepGroup n={1} title="Owner's approval" description="When and how the owner approved the final site. Required to publish.">
        <div className={grid2}>
          <Field label="Approved on" htmlFor="approval.ownerApprovedAt" error={err("approval.ownerApprovedAt")}>
            <Input id="approval.ownerApprovedAt" type="date" value={f.approval.ownerApprovedAt} disabled={readOnly} onChange={(e) => set((p) => ({ approval: { ...p.approval, ownerApprovedAt: e.target.value } }))} />
          </Field>
          <Field label="Approved via" htmlFor="approval.approvedVia">
            <NativeSelect id="approval.approvedVia" value={f.approval.approvedVia} disabled={readOnly} onChange={(e) => set((p) => ({ approval: { ...p.approval, approvedVia: e.target.value as typeof p.approval.approvedVia } }))}>
              <option value="" />
              {APPROVAL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {APPROVAL_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {!f.approval.ownerApprovedAt && (
          <Button type="button" size="sm" variant="ghost" disabled={readOnly} onClick={() => set((p) => ({ approval: { ...p.approval, ownerApprovedAt: new Date().toISOString().slice(0, 10) } }))}>
            Approved today
          </Button>
        )}
      </StepGroup>

      {/* Payments, setup/renewal and own domain: super admin only (sales executives never see payments). */}
      {isAdmin && (
      <>
      <StepGroup n={2} title="Payment" description="Record the payment here; it is saved to Payments at once.">
        <Payments target={target} canRecord={isAdmin} setupAmount={hospital ? options.prices.hospitalSetup : options.prices.clinicSetup} gstIncluded={options.gstIncluded} onDates={r.onBusinessDates} />
      </StepGroup>

      <StepGroup n={3} title="Setup and renewal" description="Setup is paid once; the renewal is yearly from year 2.">
        <SetupRenewal
          value={{ setupPaidAt: f.setupPaidAt, renewalDueDate: f.renewalDueDate, renewalStatus: f.renewalStatus, renewalPrice: f.renewalPrice }}
          onChange={(patch) => set(patch, { step: "business" })}
          listPrice={listPrice}
          isAdmin={isAdmin}
          readOnly={readOnly}
          err={err}
        />
      </StepGroup>

      <StepGroup n={4} title="Own domain (optional)">
        <OwnDomain value={f.ownDomain} onChange={(ownDomain) => set({ ownDomain }, { step: "business" })} isAdmin={isAdmin} readOnly={readOnly} err={err} placeholder="shreeclinic.in" />
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

      <StepGroup n={isAdmin ? 6 : 3} title="Live site" description="After publishing: check the live site, then send its link to the owner.">
        <LiveSite target={target} live={f.status === "published"} liveUrl={r.liveUrl} disabled={readOnly} />
      </StepGroup>
    </div>
  );
}

/** "Send login email" for the site owner (welcome wording). Needs the site and owner email saved. */
function OwnerLoginEmailButton({ id, savedEmail }: { id?: string; savedEmail: string }) {
  const [sending, start] = useTransition();
  if (!id) return null;
  return (
    <div className="flex items-end sm:pb-0.5">
      <Button
        type="button"
        variant="outline"
        disabled={sending || !savedEmail.trim()}
        onClick={() =>
          start(async () => {
            const res = await sendEstablishmentLoginEmailAction({ id });
            if (res.ok) toast.success(`Login email sent to ${res.data.to}`);
            else toast.error(res.error);
          })
        }
      >
        {sending ? <Loader2 className="animate-spin" /> : <Send />} Send login email
      </Button>
    </div>
  );
}
