"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, NumberInput } from "@/components/admin/form/fields";
import { FormDialog } from "@/components/admin/FormDialog";
import { createHospitalAction, updateHospitalAction } from "./actions";

export interface HospitalValue {
  id?: string;
  name: string;
  cityId: string;
  areaId: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  pricePerDoctor?: number;
  notes: string;
}

export interface CityAreaOptions {
  cities: { id: string; name: string }[];
  areas: { id: string; name: string; cityId: string }[];
}

/** Add / edit hospital dialog. */
export function HospitalDialog({ initial, options }: { initial?: HospitalValue; options: CityAreaOptions }) {
  const blank: HospitalValue = {
    name: "",
    cityId: options.cities[0]?.id ?? "",
    areaId: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
    pricePerDoctor: undefined,
    notes: "",
  };
  const [v, setV] = useState<HospitalValue>(initial ?? blank);
  const set = (patch: Partial<HospitalValue>) => setV((x) => ({ ...x, ...patch }));
  const editing = Boolean(initial?.id);

  return (
    <FormDialog
      trigger={
        editing ? (
          <Button variant="outline">
            <Pencil /> Edit
          </Button>
        ) : (
          <Button>
            <Plus /> New hospital
          </Button>
        )
      }
      title={editing ? "Edit hospital" : "New hospital"}
      successMessage={editing ? "Hospital updated" : "Hospital added"}
      onSubmit={() => {
        const { id, ...rest } = v;
        return editing && id ? updateHospitalAction({ id, ...rest }) : createHospitalAction(rest);
      }}
      onSuccess={() => !editing && setV(blank)}
    >
      {(errors) => (
        <>
          <Field label="Hospital name" htmlFor="h-name" required error={errors.name}>
            <Input id="h-name" value={v.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="h-city" required>
              <NativeSelect id="h-city" value={v.cityId} onChange={(e) => set({ cityId: e.target.value, areaId: "" })}>
                {options.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Area" htmlFor="h-area" error={errors.areaId}>
              <NativeSelect id="h-area" value={v.areaId} onChange={(e) => set({ areaId: e.target.value })}>
                <option value="">Choose…</option>
                {options.areas
                  .filter((a) => a.cityId === v.cityId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Address" htmlFor="h-address">
            <Input id="h-address" value={v.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person" htmlFor="h-contact">
              <Input id="h-contact" value={v.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="h-phone" error={errors.phone}>
              <Input id="h-phone" type="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="h-email" error={errors.email}>
              <Input id="h-email" type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Price per doctor (₹)" htmlFor="h-price" help="Bulk price for this hospital's consultants.">
              <NumberInput id="h-price" value={v.pricePerDoctor} onChange={(pricePerDoctor) => set({ pricePerDoctor })} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="h-notes">
            <Textarea id="h-notes" rows={3} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
