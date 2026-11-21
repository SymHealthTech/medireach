"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Eye, IdCard, Link2, Loader2, Mail, Monitor, Plus, Save, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect, NumberInput } from "@/components/admin/form/fields";
import { SelectOther } from "@/components/admin/form/Suggestions";
import { Pill } from "@/components/admin/StatusBadge";
import { Group, grid2 } from "@/components/admin/doctor-editor/shared";
import { PaymentDialog } from "@/app/admin/(dash)/payments/PaymentDialog";
import { createPreviewLinkAction, emailPreviewLinkAction, reviewPaymentsAction } from "@/app/admin/(dash)/review-actions";
import { PAYMENT_MODE_LABEL, PAYMENT_PURPOSE_LABEL, RENEWAL_STATUS_LABEL, RENEWAL_STATUS_TONE } from "@/lib/admin/labels";
import { DOMAIN_STATUSES, type PaymentPurpose, type RenewalStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

/**
 * The Review and publish step, shared by the doctor, clinic and hospital
 * editors. Part 1 (check): review, sales executive, save everything, preview,
 * send the preview link, then Close or Next. Part 2 (approve and publish):
 * approval, payment, setup and renewal, own domain, publish.
 */

export type ReviewTarget = { kind: "doctor" | "site"; id?: string; name: string };
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Numbered heading inside the Review step. */
export function StepGroup({ n, title, description, children }: { n: number; title: string; description?: string; children: ReactNode }) {
  return <Group title={`${n}. ${title}`} description={description}>{children}</Group>;
}

// ---------------------------------------------------------------- Sales executive
export function SalesExecutive({
  name,
  staffId,
  team,
  disabled,
  onChange,
}: {
  name: string;
  staffId: string;
  team: string[];
  disabled?: boolean;
  onChange: (patch: { salesExecutive?: string; salesExecutiveId?: string }) => void;
}) {
  return (
    <div className={grid2}>
      <Field label="Sales executive" htmlFor="salesExecutive" help="Who brought this in. Pick a team member, or Other to type a name.">
        <SelectOther id="salesExecutive" value={name} options={team} disabled={disabled} emptyLabel="Not set" otherPlaceholder="Name" onChange={(salesExecutive) => onChange({ salesExecutive })} />
      </Field>
      <Field label="Sales executive ID" htmlFor="salesExecutiveId" help="Their staff or employee ID.">
        <Input id="salesExecutiveId" value={staffId} maxLength={40} disabled={disabled} placeholder="e.g. MR-S-014" onChange={(e) => onChange({ salesExecutiveId: e.target.value })} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------- Save everything + preview
export function SaveAndPreview({
  target,
  readOnly,
  saving,
  onSaveAll,
  address,
  previewSrc,
  cardSrc,
  cardPageHref,
}: {
  target: ReviewTarget;
  readOnly: boolean;
  saving: boolean;
  onSaveAll: () => Promise<boolean>;
  /** The address the site will have (shown in the browser bar). */
  address: string;
  previewSrc: string;
  /** Card image base URL: `${cardSrc}/print.png`. */
  cardSrc: string;
  cardPageHref: string;
}) {
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [size, setSize] = useState<"desktop" | "phone">("desktop");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={readOnly || busy || saving}
          onClick={async () => {
            setBusy(true);
            try {
              if (await onSaveAll()) setVersion((v) => v + 1);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Save />} Save everything
        </Button>
        {version > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-text">
            <CheckCircle2 className="size-4" /> Saved. Check the website and the card below.
          </span>
        )}
      </div>
      {target.id ? (
        <>
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-center gap-3 border-b border-line bg-muted px-3 py-2">
              <span aria-hidden className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                <span className="size-2.5 rounded-full bg-[#febc2e]" />
                <span className="size-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="min-w-0 flex-1 truncate rounded-md bg-card px-3 py-1 text-xs text-muted-foreground">{address.replace(/^https?:\/\//, "")}</span>
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
              <iframe key={`${version}-${size}`} src={`${previewSrc}?v=${version}`} title="Website preview" className={cn("h-[680px] bg-white", size === "phone" ? "w-[390px] border-x border-line" : "w-full")} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Visiting card</p>
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- the card as rendered for printing */}
              <img src={`${cardSrc}/print.png?v=${version}`} alt="Visiting card (print)" className="w-full max-w-md rounded-lg border border-line shadow-soft" />
              {/* eslint-disable-next-line @next/next/no-img-element -- the card as shared on WhatsApp */}
              <img src={`${cardSrc}/phone.png?v=${version}`} alt="Visiting card (phone)" className="w-44 rounded-xl border border-line shadow-soft" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={previewSrc} target="_blank" rel="noopener">
                <Eye /> Website preview
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={cardPageHref} target="_blank" rel="noopener">
                <IdCard /> Visiting card preview
              </a>
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Enter the name (Basics) to create the draft first.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Send preview link
export function SendPreviewLink({ target, disabled }: { target: ReviewTarget; disabled?: boolean }) {
  const [link, setLink] = useState<{ url: string; phone: string; email: string; message: string; days: number } | null>(null);
  const [busy, setBusy] = useState<"make" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  if (!target.id) return <p className="text-sm text-muted-foreground">Save the draft first.</p>;
  const id = target.id;

  async function make() {
    setBusy("make");
    const res = await createPreviewLinkAction({ kind: target.kind, id });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    setLink(res.data);
    setEmail(res.data.email);
  }

  if (!link) {
    return (
      <Button type="button" variant="outline" disabled={disabled || busy !== null} onClick={() => void make()}>
        {busy ? <Loader2 className="animate-spin" /> : <Link2 />} Create preview link
      </Button>
    );
  }
  const wa = `https://wa.me/${link.phone ? `91${link.phone}` : ""}?text=${encodeURIComponent(link.message)}`;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input readOnly value={link.url} aria-label="Preview link" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Shows the website and the visiting card to {target.name}, without logging in. Works for {link.days} days; never shown on Google.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Button asChild className="bg-[#1f8f4e] text-white hover:bg-[#187a42]">
          <a href={wa} target="_blank" rel="noopener">
            Send on WhatsApp{link.phone ? ` (${link.phone})` : ""}
          </a>
        </Button>
        <div className="flex min-w-[16rem] flex-1 gap-2">
          <Input type="email" value={email} placeholder="Their email" aria-label="Email to send the preview to" onChange={(e) => setEmail(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null || !email.trim()}
            onClick={async () => {
              setBusy("email");
              const res = await emailPreviewLinkAction({ kind: target.kind, id, to: email });
              setBusy(null);
              if (res.ok) toast.success(`Preview link emailed to ${res.data.to}`);
              else toast.error(res.error);
            }}
          >
            {busy === "email" ? <Loader2 className="animate-spin" /> : <Mail />} Email
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Close / Next
export function PhaseNav({ onClose, onNext, closing }: { onClose: () => void; onNext: () => void; closing?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 shadow-soft">
      <p className="text-sm text-muted-foreground">Waiting for their approval? Close for now: everything is saved. Approved? Go on to approval, payment and publishing.</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={closing} onClick={onClose}>
          {closing ? <Loader2 className="animate-spin" /> : <X />} Close
        </Button>
        <Button type="button" onClick={onNext}>
          Next <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export function BackToCheck({ onBack }: { onBack: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onBack}>
      <ArrowLeft /> Back to review and preview
    </Button>
  );
}

/** Close: save everything, then go back to the dashboard home. */
export function useCloseToDashboard(onSaveAll: () => Promise<boolean>) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const close = useCallback(async () => {
    setClosing(true);
    try {
      if (await onSaveAll()) router.push("/admin");
    } finally {
      setClosing(false);
    }
  }, [onSaveAll, router]);
  return { close, closing };
}

// ---------------------------------------------------------------- Payment
export type BusinessDates = { setupPaidAt: string; renewalDueDate: string; renewalStatus: RenewalStatus; renewalPrice: number | undefined };

export function Payments({
  target,
  canRecord,
  setupAmount,
  gstIncluded,
  onDates,
}: {
  target: ReviewTarget;
  canRecord: boolean;
  /** Pre-filled for the first (setup) payment. */
  setupAmount: number;
  gstIncluded: boolean;
  /** Setup and renewal dates as the payment left them (no unsaved change is made). */
  onDates: (d: BusinessDates) => void;
}) {
  const [rows, setRows] = useState<{ id: string; amount: number; date: string; purpose: string; mode: string; invoiceNo: string }[] | null>(null);
  const id = target.id;
  // The editor passes a new function each render; keep the latest without reloading.
  const datesRef = useRef(onDates);
  datesRef.current = onDates;
  const load = useCallback(
    async (afterPayment: boolean) => {
      if (!id) return;
      const res = await reviewPaymentsAction({ kind: target.kind, id });
      if (!res.ok) return setRows([]);
      setRows(res.data.payments);
      // Only after a payment: the server moved the setup/renewal dates.
      if (afterPayment) datesRef.current(res.data.business);
    },
    [id, target.kind],
  );
  useEffect(() => {
    if (canRecord) void load(false);
  }, [canRecord, load]);

  if (!id) return <p className="text-sm text-muted-foreground">Save the draft first.</p>;
  if (!canRecord) return <p className="text-sm text-muted-foreground">Only an admin can record payments.</p>;
  const hasSetup = rows?.some((r) => r.purpose === "setup" || r.purpose === "doctor_addon");
  return (
    <div className="space-y-3">
      {rows === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading payments…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-background text-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <strong className="text-ink">{rupees(p.amount)}</strong>
              <span>{PAYMENT_PURPOSE_LABEL[p.purpose as PaymentPurpose] ?? p.purpose}</span>
              <span className="text-muted-foreground">
                {p.date} · {PAYMENT_MODE_LABEL[p.mode as keyof typeof PAYMENT_MODE_LABEL] ?? p.mode}
              </span>
              {p.invoiceNo && <span className="ml-auto font-mono text-xs text-muted-foreground">{p.invoiceNo}</span>}
            </li>
          ))}
        </ul>
      )}
      <PaymentDialog
        fixed={{ kind: target.kind === "doctor" ? "doctor" : "establishment", id, name: target.name }}
        defaults={hasSetup ? { purpose: "renewal" } : { purpose: "setup", amount: setupAmount }}
        gstIncludedDefault={gstIncluded}
        onRecorded={() => void load(true)}
        trigger={
          <Button type="button" variant={hasSetup ? "outline" : "default"}>
            <Plus /> Record payment
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">Saved to Payments straight away. A setup payment starts the renewal (due one year later); a renewal payment moves it on a year.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Setup and renewal
export function SetupRenewal({
  value,
  onChange,
  listPrice,
  isAdmin,
  readOnly,
  err,
  children,
}: {
  value: BusinessDates;
  onChange: (patch: Partial<Omit<BusinessDates, "renewalStatus">>) => void;
  listPrice: number;
  isAdmin: boolean;
  readOnly: boolean;
  err: (path: string) => string | undefined;
  children?: ReactNode;
}) {
  const locked = readOnly || !isAdmin;
  return (
    <div className="space-y-4">
      <div className={grid2}>
        <Field label="Setup paid on" htmlFor="setupPaidAt" error={err("setupPaidAt")} help="Filled in by recording the setup payment above.">
          <Input id="setupPaidAt" type="date" value={value.setupPaidAt} disabled={locked} onChange={(e) => onChange({ setupPaidAt: e.target.value })} />
        </Field>
        <Field label="Renewal price per year (₹)" htmlFor="renewalPrice" help={`Leave empty for ${rupees(listPrice)} from Settings.`}>
          <NumberInput id="renewalPrice" value={value.renewalPrice} disabled={locked} onChange={(renewalPrice) => onChange({ renewalPrice })} />
        </Field>
        <Field label="Renewal due on" htmlFor="renewalDueDate" error={err("renewalDueDate")} help="Leave empty for one year after the setup date.">
          <Input id="renewalDueDate" type="date" value={value.renewalDueDate} disabled={locked} onChange={(e) => onChange({ renewalDueDate: e.target.value })} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Renewal status</p>
          <div className="flex min-h-11 items-center">
            <Pill tone={RENEWAL_STATUS_TONE[value.renewalStatus]}>{RENEWAL_STATUS_LABEL[value.renewalStatus]}</Pill>
          </div>
          <p className="text-xs text-muted-foreground">Worked out from the due date when you save.</p>
        </div>
      </div>
      {!isAdmin && <p className="text-xs text-muted-foreground">Only an admin can change these.</p>}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Own domain
export type OwnDomainValue = { name: string; status: (typeof DOMAIN_STATUSES)[number]; cost: number | undefined; renewalDate: string };

export function OwnDomain({
  value,
  onChange,
  isAdmin,
  readOnly,
  err,
  placeholder,
}: {
  value: OwnDomainValue;
  onChange: (v: OwnDomainValue) => void;
  isAdmin: boolean;
  readOnly: boolean;
  err: (path: string) => string | undefined;
  placeholder: string;
}) {
  const locked = readOnly || !isAdmin;
  return (
    <div className={grid2}>
      <Field label="Domain" htmlFor="ownDomain.name" error={err("ownDomain.name")} help="Optional. Charged at actual cost; this records the request.">
        <Input id="ownDomain.name" placeholder={placeholder} value={value.name} disabled={locked} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </Field>
      <Field label="Status" htmlFor="ownDomain.status">
        <NativeSelect id="ownDomain.status" value={value.status} disabled={locked} onChange={(e) => onChange({ ...value, status: e.target.value as OwnDomainValue["status"] })}>
          {DOMAIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0]!.toUpperCase() + s.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Cost (₹)" htmlFor="ownDomain.cost">
        <NumberInput id="ownDomain.cost" value={value.cost} disabled={locked} onChange={(cost) => onChange({ ...value, cost })} />
      </Field>
      <Field label="Renewal date" htmlFor="ownDomain.renewalDate">
        <Input id="ownDomain.renewalDate" type="date" value={value.renewalDate} disabled={locked} onChange={(e) => onChange({ ...value, renewalDate: e.target.value })} />
      </Field>
    </div>
  );
}
