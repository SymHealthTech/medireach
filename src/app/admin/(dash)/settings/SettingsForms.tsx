"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { FormDialog } from "@/components/admin/FormDialog";
import { Pill } from "@/components/admin/StatusBadge";
import { ADMIN_ROLES, GST_MODES, type AdminRole, type PriceKey } from "@/lib/constants";
import {
  createAdminUserAction,
  resetAdminPasswordAction,
  saveBannedPhrasesAction,
  saveSettingsAction,
  updateAdminUserAction,
} from "./actions";

const GST_LABEL = { inclusive: "Prices include GST", exclusive: "Prices exclude GST (GST added)", none: "No GST" } as const;
const ROLE_LABEL: Record<AdminRole, string> = { superadmin: "Super admin", admin: "Admin", sales: "Sales" };

/** Price fields, grouped as on the pricing page. Every key in PRICE_KEYS appears once. */
const PRICE_GROUPS: { title: string; help?: string; fields: { key: PriceKey; label: string }[] }[] = [
  {
    title: "Setup (one time)",
    fields: [
      { key: "doctorSetup", label: "Doctor portfolio" },
      { key: "clinicSetup", label: "Clinic website" },
      { key: "hospitalSetup", label: "Small hospital website" },
      { key: "doctorAddon", label: "Add-on: each clinic/hospital doctor" },
    ],
  },
  {
    title: "Yearly renewal (from year 2)",
    fields: [
      { key: "renewalDoctor", label: "Doctor portfolio (incl. add-ons)" },
      { key: "renewalClinic", label: "Clinic website" },
      { key: "renewalHospital", label: "Small hospital website" },
    ],
  },
  {
    title: "Founding offer (lifetime renewal)",
    help: "Applied when a site is marked Founding. Changing it here doesn't change sites already marked.",
    fields: [
      { key: "foundingRenewal", label: "Doctors and clinics" },
      { key: "foundingRenewalHospital", label: "Hospitals" },
    ],
  },
  { title: "Other", fields: [{ key: "updatePrice", label: "Done-for-you update" }] },
];

export interface GeneralSettings {
  prices: Record<PriceKey, number>;
  foundingTotal: number;
  renewalGraceDays: number;
  contactPhone: string;
  whatsappNumber: string;
  gstMode: (typeof GST_MODES)[number];
  whatsappShareTemplate: string;
}

export function GeneralSettingsForm({ initial, foundingUsed }: { initial: GeneralSettings; foundingUsed: number }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const setPrice = (k: keyof GeneralSettings["prices"], n: number | undefined) => setV((x) => ({ ...x, prices: { ...x.prices, [k]: n ?? 0 } }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSettingsAction(v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            return void toast.error(res.error);
          }
          setErrors({});
          toast.success("Settings saved");
          router.refresh();
        });
      }}
    >
      {PRICE_GROUPS.map((g) => (
        <fieldset key={g.title} className="space-y-3">
          <legend className="text-sm font-semibold text-ink">{g.title}</legend>
          {g.help && <p className="text-xs text-muted-foreground">{g.help}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.fields.map((f) => (
              <Field key={f.key} label={`${f.label} (₹)`} htmlFor={`s-${f.key}`} error={errors[`prices.${f.key}`]}>
                <NumberInput id={`s-${f.key}`} value={v.prices[f.key]} onChange={(n) => setPrice(f.key, n)} />
              </Field>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Founding spots"
          htmlFor="s-founding"
          help={`Across doctors, clinics and hospitals: ${foundingUsed} taken · ${Math.max(0, v.foundingTotal - foundingUsed)} left`}
          error={errors.foundingTotal}
        >
          <NumberInput id="s-founding" value={v.foundingTotal} onChange={(n) => setV((x) => ({ ...x, foundingTotal: n ?? 0 }))} />
        </Field>
        <Field
          label="Renewal grace period (days)"
          htmlFor="s-grace"
          help="After the due date, a site stays live this long before it lapses."
          error={errors.renewalGraceDays}
        >
          <NumberInput id="s-grace" value={v.renewalGraceDays} onChange={(n) => setV((x) => ({ ...x, renewalGraceDays: n ?? 0 }))} />
        </Field>
        <Field label="GST" htmlFor="s-gst">
          <NativeSelect id="s-gst" value={v.gstMode} onChange={(e) => setV((x) => ({ ...x, gstMode: e.target.value as GeneralSettings["gstMode"] }))}>
            {GST_MODES.map((m) => (
              <option key={m} value={m}>
                {GST_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Contact phone" htmlFor="s-phone" help="With country code, e.g. 9198XXXXXXXX." error={errors.contactPhone}>
          <Input id="s-phone" inputMode="tel" value={v.contactPhone} onChange={(e) => setV((x) => ({ ...x, contactPhone: e.target.value }))} />
        </Field>
        <Field label="WhatsApp number" htmlFor="s-wa" help="Used by every “WhatsApp us” button on the website." error={errors.whatsappNumber}>
          <Input id="s-wa" inputMode="tel" value={v.whatsappNumber} onChange={(e) => setV((x) => ({ ...x, whatsappNumber: e.target.value }))} />
        </Field>
      </div>
      <Field label="WhatsApp share message (visiting cards)" htmlFor="s-share" help="Use {name} and {link}." error={errors.whatsappShareTemplate}>
        <Textarea id="s-share" rows={3} value={v.whatsappShareTemplate} onChange={(e) => setV((x) => ({ ...x, whatsappShareTemplate: e.target.value }))} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Save settings
      </Button>
    </form>
  );
}

export function BannedPhrasesForm({ phrases, overridden, defaults }: { phrases: string[]; overridden: boolean; defaults: string[] }) {
  const router = useRouter();
  const [text, setText] = useState(phrases.join("\n"));
  const [pending, start] = useTransition();
  const list = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const save = (value: string[] | null, ok: string) =>
    start(async () => {
      const res = await saveBannedPhrasesAction({ phrases: value });
      if (!res.ok) return void toast.error(res.error);
      if (!value) setText(defaults.join("\n"));
      toast.success(ok);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        One phrase per line, checked case-insensitively as whole words in every free-text field. Patient counts and success rates are
        always checked. {overridden ? <Pill tone="marigold">Custom list</Pill> : <Pill>Defaults</Pill>}
      </p>
      <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-sm" aria-label="Banned phrases" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending || list.length === 0} onClick={() => save(list, `Saved ${list.length} phrases`)}>
          {pending && <Loader2 className="animate-spin" />} Save list
        </Button>
        <Button type="button" variant="outline" disabled={pending || !overridden} onClick={() => save(null, "Reset to defaults")}>
          <RotateCcw /> Reset to defaults
        </Button>
      </div>
    </div>
  );
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLogin: string;
  isMe: boolean;
}

export function NewAdminUserButton() {
  const blank = { name: "", email: "", role: "sales" as AdminRole, password: "" };
  const [v, setV] = useState(blank);
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus /> Add user
        </Button>
      }
      title="Add dashboard user"
      description="Share the temporary password privately; ask them to keep it safe."
      submitLabel="Add user"
      successMessage="User added"
      onSubmit={() => createAdminUserAction(v)}
      onSuccess={() => setV(blank)}
    >
      {(errors) => (
        <>
          <Field label="Name" htmlFor="u-name" required error={errors.name}>
            <Input id="u-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="u-email" required error={errors.email}>
            <Input id="u-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </Field>
          <Field label="Role" htmlFor="u-role">
            <NativeSelect id="u-role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as AdminRole })}>
              {ADMIN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Temporary password" htmlFor="u-pw" required help="At least 12 characters." error={errors.password}>
            <Input id="u-pw" type="text" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function AdminUserActions({ user }: { user: AdminUserRow }) {
  const [v, setV] = useState({ name: user.name, role: user.role, active: user.active });
  const [pw, setPw] = useState("");
  return (
    <div className="flex gap-1">
      <FormDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${user.name}`}>
            <Pencil />
          </Button>
        }
        title={`Edit ${user.name}`}
        successMessage="User updated"
        onSubmit={() => updateAdminUserAction({ id: user.id, ...v })}
      >
        {(errors) => (
          <>
            <Field label="Name" htmlFor={`e-name-${user.id}`} error={errors.name}>
              <Input id={`e-name-${user.id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            </Field>
            <Field label="Role" htmlFor={`e-role-${user.id}`}>
              <NativeSelect id={`e-role-${user.id}`} value={v.role} disabled={user.isMe} onChange={(e) => setV({ ...v, role: e.target.value as AdminRole })}>
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <SwitchField label="Active" description="Inactive users are signed out and can't log in." checked={v.active} disabled={user.isMe} onCheckedChange={(active) => setV({ ...v, active })} />
          </>
        )}
      </FormDialog>
      <FormDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label={`Reset password for ${user.name}`}>
            <KeyRound />
          </Button>
        }
        title={`New password for ${user.name}`}
        submitLabel="Set password"
        successMessage="Password updated"
        onSubmit={() => resetAdminPasswordAction({ id: user.id, password: pw })}
        onSuccess={() => setPw("")}
      >
        {(errors) => (
          <Field label="New password" htmlFor={`pw-${user.id}`} help="At least 12 characters." error={errors.password}>
            <Input id={`pw-${user.id}`} type="text" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
        )}
      </FormDialog>
    </div>
  );
}
