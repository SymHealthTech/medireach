"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, SwitchField } from "@/components/admin/form/fields";
import { Group, grid2, type StepProps } from "../shared";

const LINKS: { key: keyof StepProps["form"]["links"]; label: string; placeholder: string }[] = [
  { key: "googleBusiness", label: "Google Business Profile", placeholder: "https://g.page/…" },
  { key: "website", label: "Own website", placeholder: "https://" },
  { key: "practo", label: "Practo", placeholder: "https://www.practo.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/…" },
];

export function ContactStep({ form: f, set, err, readOnly }: StepProps) {
  const sameWhatsapp = !f.whatsapp || f.whatsapp === f.mobile;
  const [selfEdit, setSelfEdit] = useState(Boolean(f.ownerEmail));
  return (
    <div className="space-y-5">
      <Group title="Phone and email" description="The mobile powers the Call button; WhatsApp powers the WhatsApp button.">
        <div className={grid2}>
          <Field label="Mobile" htmlFor="mobile" error={err("mobile")}>
            <Input id="mobile" type="tel" inputMode="tel" placeholder="98XXXXXXXX" value={f.mobile} disabled={readOnly} onChange={(e) => set({ mobile: e.target.value, ...(sameWhatsapp ? { whatsapp: "" } : {}) })} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" help={sameWhatsapp ? "Same as mobile (leave empty)." : undefined} error={err("whatsapp")}>
            <Input id="whatsapp" type="tel" inputMode="tel" placeholder="Same as mobile" value={f.whatsapp} disabled={readOnly} onChange={(e) => set({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Email (shown on the page)" htmlFor="email" error={err("email")}>
            <Input id="email" type="email" inputMode="email" value={f.email} disabled={readOnly} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </div>
      </Group>

      <Group title="Links">
        <div className={grid2}>
          {LINKS.map((l) => (
            <Field key={l.key} label={l.label} htmlFor={`links.${l.key}`} error={err(`links.${l.key}`)}>
              <Input
                id={`links.${l.key}`}
                type="url"
                inputMode="url"
                placeholder={l.placeholder}
                value={f.links[l.key]}
                disabled={readOnly}
                onChange={(e) => set({ links: { ...f.links, [l.key]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
      </Group>

      <Group title="Doctor login" description="Lets the doctor sign in with an emailed link to update timings, phone, address and fees.">
        <SwitchField
          label="Enable self-edit login"
          description="Needs the doctor's email. Login emails are sent from the doctor's account page (coming with doctor login)."
          checked={selfEdit}
          disabled={readOnly}
          onCheckedChange={(on) => {
            setSelfEdit(on);
            set({ ownerEmail: on ? f.ownerEmail || f.email : "" });
          }}
        />
        {selfEdit && (
          <Field label="Login email" htmlFor="ownerEmail" required error={err("ownerEmail")}>
            <Input id="ownerEmail" type="email" inputMode="email" value={f.ownerEmail} disabled={readOnly} onChange={(e) => set({ ownerEmail: e.target.value })} />
          </Field>
        )}
      </Group>
    </div>
  );
}
