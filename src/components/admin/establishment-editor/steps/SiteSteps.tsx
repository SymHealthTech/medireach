"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, CreditCard, ExternalLink, Eye, IdCard, Loader2, Send, ShieldCheck, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { Pill } from "@/components/admin/StatusBadge";
import { Group, grid2 } from "@/components/admin/doctor-editor/shared";
import { Highlighted } from "@/components/admin/doctor-editor/steps/ReviewStep";
import { checkEstablishmentUrlKeyAction, sendEstablishmentLoginEmailAction } from "@/app/admin/(dash)/establishments/actions";
import { RENEWAL_STATUS_LABEL, RENEWAL_STATUS_TONE } from "@/lib/admin/labels";
import { APPROVAL_CHANNELS, DOMAIN_STATUSES, ESTABLISHMENT_SOURCES } from "@/lib/constants";
import type { EstablishmentForm, StepKey } from "@/lib/establishments/form";
import { establishmentDescription, establishmentTitle } from "@/lib/seo/establishment";
import { absUrl, paths, ROOT_HOSTNAME } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";
import type { EStepProps } from "../shared";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

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

export function SeoStep({ form: f, set, err, options, readOnly }: EStepProps) {
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
  const suggestions = [base.replace(/-/g, ""), base].filter((x, i, a) => x.length >= 3 && x.length <= 40 && a.indexOf(x) === i);

  return (
    <div className="space-y-5">
      <Group title="Google preview" description="How the site should look in search results. Google may vary it.">
        <div className="rounded-xl border border-line bg-white p-4 font-[arial,sans-serif] text-[#202124]">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#f1f3f4] text-[10px] font-bold text-[#0a3f3f]">M</span>
            <span>
              <span className="block text-sm">MediReach</span>
              <span className="block text-[#4d5156]">{pageUrl.replace(/^https?:\/\//, "").replace(/\//g, " › ")}</span>
            </span>
          </div>
          <p className="mt-2 text-xl leading-snug text-[#1a0dab]">{title}</p>
          <p className="mt-1 text-sm leading-normal text-[#4d5156]">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Title {title.length}/60 · Description {description.length}/155
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

export function BusinessStep({ form: f, set, err, options, readOnly, role }: EStepProps) {
  const isAdmin = role !== "sales";
  const hospital = f.kind === "hospital";
  const listPrice = (founding: boolean) =>
    hospital
      ? founding
        ? options.prices.foundingRenewalHospital
        : options.prices.renewalHospital
      : founding
        ? options.prices.foundingRenewal
        : options.prices.renewalClinic;

  return (
    <div className="space-y-5">
      <Group title="Contact person and source" description="Internal. Never shown on the public site.">
        <div className={grid2}>
          <Field label="Contact person" htmlFor="contactPerson.name">
            <Input id="contactPerson.name" value={f.contactPerson.name} disabled={readOnly} onChange={(e) => set((p) => ({ contactPerson: { ...p.contactPerson, name: e.target.value } }))} />
          </Field>
          <Field label="Their phone" htmlFor="contactPerson.phone" error={err("contactPerson.phone")}>
            <Input id="contactPerson.phone" type="tel" inputMode="tel" value={f.contactPerson.phone} disabled={readOnly} onChange={(e) => set((p) => ({ contactPerson: { ...p.contactPerson, phone: e.target.value } }))} />
          </Field>
          <Field label="Their email" htmlFor="contactPerson.email" error={err("contactPerson.email")}>
            <Input id="contactPerson.email" type="email" value={f.contactPerson.email} disabled={readOnly} onChange={(e) => set((p) => ({ contactPerson: { ...p.contactPerson, email: e.target.value } }))} />
          </Field>
          <Field
            label="Owner login email"
            htmlFor="ownerEmail"
            error={err("ownerEmail")}
            help="Lets the owner log in at /login to update timings, phones and address. One email can own several sites."
          >
            <Input id="ownerEmail" type="email" value={f.ownerEmail} disabled={readOnly} onChange={(e) => set({ ownerEmail: e.target.value })} />
          </Field>
          <OwnerLoginEmailButton id={f.id} savedEmail={f.ownerEmail} />
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
          <Field label="Sales executive" htmlFor="salesExecutive">
            <Input id="salesExecutive" value={f.salesExecutive} disabled={readOnly} onChange={(e) => set({ salesExecutive: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Setup and renewal" description={isAdmin ? "Setup is paid once; the renewal is yearly from year 2." : "Only an admin can change these."}>
        <div className={grid2}>
          <Field label="Setup paid on" htmlFor="setupPaidAt" error={err("setupPaidAt")} help="Usually set by recording the setup payment.">
            <Input id="setupPaidAt" type="date" value={f.setupPaidAt} disabled={readOnly || !isAdmin} onChange={(e) => set({ setupPaidAt: e.target.value })} />
          </Field>
          <Field label="Renewal price per year (₹)" htmlFor="renewalPrice" help={`Leave empty for ${rupees(listPrice(f.founding))} from Settings.`}>
            <NumberInput id="renewalPrice" value={f.renewalPrice} disabled={readOnly || !isAdmin} onChange={(renewalPrice) => set({ renewalPrice })} />
          </Field>
          <Field label="Renewal due on" htmlFor="renewalDueDate" error={err("renewalDueDate")} help="Leave empty for one year after the setup date.">
            <Input id="renewalDueDate" type="date" value={f.renewalDueDate} disabled={readOnly || !isAdmin} onChange={(e) => set({ renewalDueDate: e.target.value })} />
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Renewal status</p>
            <div className="flex min-h-11 items-center">
              <Pill tone={RENEWAL_STATUS_TONE[f.renewalStatus]}>{RENEWAL_STATUS_LABEL[f.renewalStatus]}</Pill>
            </div>
            <p className="text-xs text-muted-foreground">Worked out from the due date when you save.</p>
          </div>
        </div>
      </Group>

      <Group title="Own domain (optional)" description="Charged at actual cost. This records the request.">
        <div className={grid2}>
          <Field label="Domain" htmlFor="ownDomain.name" error={err("ownDomain.name")}>
            <Input id="ownDomain.name" placeholder="shreeclinic.in" value={f.ownDomain.name} disabled={readOnly || !isAdmin} onChange={(e) => set((p) => ({ ownDomain: { ...p.ownDomain, name: e.target.value } }))} />
          </Field>
          <Field label="Status" htmlFor="ownDomain.status">
            <NativeSelect id="ownDomain.status" value={f.ownDomain.status} disabled={readOnly || !isAdmin} onChange={(e) => set((p) => ({ ownDomain: { ...p.ownDomain, status: e.target.value as typeof p.ownDomain.status } }))}>
              {DOMAIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0]!.toUpperCase() + s.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Cost (₹)" htmlFor="ownDomain.cost">
            <NumberInput id="ownDomain.cost" value={f.ownDomain.cost} disabled={readOnly || !isAdmin} onChange={(cost) => set((p) => ({ ownDomain: { ...p.ownDomain, cost } }))} />
          </Field>
          <Field label="Renewal date" htmlFor="ownDomain.renewalDate">
            <Input id="ownDomain.renewalDate" type="date" value={f.ownDomain.renewalDate} disabled={readOnly || !isAdmin} onChange={(e) => set((p) => ({ ownDomain: { ...p.ownDomain, renewalDate: e.target.value } }))} />
          </Field>
        </div>
      </Group>

      <Group title="Notes and payments">
        <Field label="Internal notes" htmlFor="internalNotes">
          <Textarea id="internalNotes" rows={3} value={f.internalNotes} disabled={readOnly} onChange={(e) => set({ internalNotes: e.target.value })} />
        </Field>
        {isAdmin && f.id && (
          <Button asChild variant="outline">
            <Link href={`/admin/payments?establishment=${f.id}`}>
              <CreditCard /> Payments for this {f.kind}
            </Link>
          </Button>
        )}
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
}

export function ReviewStep({ form: f, set, err, readOnly, review: r }: EStepProps & { review: EReviewProps }) {
  const issueFields = [...new Set(r.issues.map((i) => i.field))];
  const canGoLive = r.blockers.length === 0 && r.issues.length === 0;
  const reasons = [...r.blockers.map((b) => b.message), ...(r.issues.length ? [`${r.issues.length} compliance issue(s)`] : [])];

  return (
    <div className="space-y-5">
      <Group title="NMC compliance" description="Factual information only: no superlatives, guarantees, success rates, patient counts or comparisons.">
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

      <Group title="Owner's approval" description="Record when and how the owner approved the final site. Required to publish.">
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
      </Group>

      <Group title="Publish">
        <div className="flex flex-wrap gap-2">
          {f.id && (
            <Button asChild variant="outline">
              <a href={`/admin/preview/site/${f.id}`} target="_blank" rel="noopener">
                <Eye /> Preview
              </a>
            </Button>
          )}
          {r.liveUrl && (
            <Button asChild variant="outline">
              <a href={r.liveUrl} target="_blank" rel="noopener">
                <ExternalLink /> Open live site
              </a>
            </Button>
          )}
          {f.id && (
            <Button asChild variant="outline">
              <a href={`/admin/cards?type=${f.kind}&establishment=${f.id}`} target="_blank" rel="noopener">
                <IdCard /> Visiting card
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
        {!r.canPublish && <p className="text-sm text-muted-foreground">An admin will check and publish this site.</p>}
      </Group>
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
