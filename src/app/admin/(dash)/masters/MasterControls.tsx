"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/admin/FormDialog";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { FormDialog } from "@/components/admin/FormDialog";
import { slugify } from "@/lib/slug";
import { deleteMasterAction, saveMasterAction, type MasterKind } from "./actions";

export interface MasterRow {
  id?: string;
  name: string;
  slug: string;
  plural?: string;
  state?: string;
  cityId?: string;
  description?: string;
}

const KIND_LABEL: Record<MasterKind, string> = { city: "city", area: "area", specialty: "specialty", degree: "degree", council: "council" };

export function MasterDialog({
  kind,
  initial,
  cities,
  defaultCityId,
}: {
  kind: MasterKind;
  initial?: MasterRow;
  cities?: { id: string; name: string }[];
  defaultCityId?: string;
}) {
  const blank: MasterRow = { name: "", slug: "", plural: "", state: kind === "city" ? "Maharashtra" : "", cityId: defaultCityId ?? "", description: "" };
  const [v, setV] = useState<MasterRow>(initial ?? blank);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const editing = Boolean(initial?.id);
  const set = (patch: Partial<MasterRow>) => setV((x) => ({ ...x, ...patch }));

  return (
    <FormDialog
      trigger={
        editing ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${initial!.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Add {KIND_LABEL[kind]}
          </Button>
        )
      }
      title={`${editing ? "Edit" : "Add"} ${KIND_LABEL[kind]}`}
      description={editing && (kind === "city" || kind === "area" || kind === "specialty") ? "Changing the slug changes public page addresses." : undefined}
      successMessage="Saved"
      onSubmit={() =>
        saveMasterAction({
          kind,
          id: v.id,
          name: v.name,
          slug: v.slug,
          plural: v.plural || undefined,
          state: v.state || undefined,
          cityId: kind === "area" ? v.cityId : undefined,
          description: v.description || undefined,
        })
      }
      onSuccess={() => {
        if (!editing) {
          setV(blank);
          setSlugTouched(false);
        }
      }}
    >
      {(errors) => (
        <>
          <Field label="Name" htmlFor={`m-name-${kind}`} required error={errors.name}>
            <Input
              id={`m-name-${kind}`}
              value={v.name}
              onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
            />
          </Field>
          <Field label="Slug (used in URLs)" htmlFor={`m-slug-${kind}`} required error={errors.slug}>
            <Input
              id={`m-slug-${kind}`}
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: e.target.value.toLowerCase() });
              }}
            />
          </Field>
          {kind === "specialty" && (
            <Field label="Plural (for headings)" htmlFor="m-plural" required help="e.g. “General Physicians”" error={errors.plural}>
              <Input id="m-plural" value={v.plural ?? ""} onChange={(e) => set({ plural: e.target.value })} />
            </Field>
          )}
          {(kind === "city" || kind === "council") && (
            <Field label="State" htmlFor={`m-state-${kind}`} required={kind === "city"} error={errors.state}>
              <Input id={`m-state-${kind}`} value={v.state ?? ""} onChange={(e) => set({ state: e.target.value })} />
            </Field>
          )}
          {kind === "area" && cities && (
            <Field label="City" htmlFor="m-city" required error={errors.cityId}>
              <NativeSelect id="m-city" value={v.cityId} onChange={(e) => set({ cityId: e.target.value })}>
                <option value="" />
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </>
      )}
    </FormDialog>
  );
}

export function DeleteMasterButton({ kind, id, name }: { kind: MasterKind; id: string; name: string }) {
  return (
    <ConfirmButton
      trigger={
        <Button size="icon-sm" variant="ghost" className="text-clay-text" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      }
      title={`Delete “${name}”?`}
      description="Only possible when nothing uses it."
      confirmLabel="Delete"
      successMessage="Deleted"
      onConfirm={() => deleteMasterAction({ kind, id })}
    />
  );
}
