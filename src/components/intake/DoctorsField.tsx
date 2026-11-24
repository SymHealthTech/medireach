"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { uploadImage } from "@/lib/client/upload-image";
import { blankDoctor, DOCTOR_FIELDS, fieldId, isShown, splitLines, str, type DoctorEntry, type FieldDef } from "@/lib/intake/form";
import { IntakeField } from "./IntakeFields";
import { useIntakeContext } from "./IntakeContext";
import { PhotoCropDialog } from "./PhotoCropDialog";

const thumb = (url: string) => url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,g_face,w_240,h_240/");

/**
 * Doctors at a clinic, or in one hospital department: one card per doctor
 * (name, designation, education, role (or their own words for "Other"),
 * portfolio link, photo), up to
 * `field.max`. Error keys: `{errKey}.{index}.{field}`.
 */
export function DoctorsField({ field, value, onChange, errKey }: { field: FieldDef; value: DoctorEntry[]; onChange: (v: DoctorEntry[]) => void; errKey: string }) {
  const max = field.max ?? 5;
  // Photo uploads finish later: always build on the newest list and the newest onChange.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const update = (i: number, patch: Partial<DoctorEntry>) => latest.current.onChange(latest.current.value.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <div id={fieldId(errKey)} className="space-y-3 sm:col-span-2">
      {value.map((d, i) => (
        <DoctorCard
          key={i}
          index={i}
          doctor={d}
          errKey={`${errKey}.${i}`}
          onChange={(patch) => update(i, patch)}
          onRemove={value.length > 1 || d.name || d.photo ? () => onChange(value.length > 1 ? value.filter((_, j) => j !== i) : [blankDoctor()]) : undefined}
        />
      ))}
      {value.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...value, blankDoctor()])}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-dashed border-lagoon/50 px-4 font-semibold text-lagoon hover:bg-lagoon/5"
        >
          <Plus className="size-4" aria-hidden /> {value.length ? "Add another doctor" : "Add a doctor"}
          <span className="font-normal text-body/60">
            ({value.length}/{max})
          </span>
        </button>
      ) : (
        <p className="text-sm text-body/70">You can add up to {max} doctors here. Write any others in the notes at the end.</p>
      )}
    </div>
  );
}

/**
 * A hospital department's doctors: tick them from the form's doctor list
 * (like the admin editor's Departments). Stored one name per line; names no
 * longer on the list are dropped on the next tick.
 */
export function DoctorPickField({ id, value, onChange, describedBy }: { id: string; value: string; onChange: (v: string) => void; describedBy?: string }) {
  const { data } = useIntakeContext();
  const team = (Array.isArray(data?.doctors) ? (data.doctors as DoctorEntry[]) : []).map((d) => str(d?.name)).filter((n, i, all) => n && all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
  const picked = new Set(splitLines(value).map((n) => n.toLowerCase()));
  if (team.length === 0) {
    return (
      <p id={id} className="rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-body/70">
        Add doctors in “Doctors at the hospital” above, then tick them here.
      </p>
    );
  }
  return (
    <ul id={id} aria-describedby={describedBy} className="grid gap-1.5 sm:grid-cols-2">
      {team.map((name, i) => {
        const cid = `${id}-${i}`;
        return (
          <li key={name} className="min-w-0">
            <label htmlFor={cid} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-line bg-surface px-3">
              <input
                id={cid}
                type="checkbox"
                checked={picked.has(name.toLowerCase())}
                onChange={(e) => {
                  const next = team.filter((n) => (n === name ? e.target.checked : picked.has(n.toLowerCase())));
                  onChange(next.join("\n"));
                }}
                className="size-5 shrink-0 accent-[#0E7C7B]"
              />
              <span className="min-w-0 truncate text-sm text-body">{name}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function DoctorCard({ index, doctor, errKey, onChange, onRemove }: { index: number; doctor: DoctorEntry; errKey: string; onChange: (patch: Partial<DoctorEntry>) => void; onRemove?: () => void }) {
  const { errors } = useIntakeContext();
  return (
    <div role="group" aria-label={`Doctor ${index + 1}`} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">
          Doctor {index + 1}
          {doctor.name.trim() && <span className="font-normal text-body/70"> · {doctor.name.trim()}</span>}
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10">
            <Trash2 className="size-4" aria-hidden /> Remove
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <DoctorPhoto doctor={doctor} onChange={(photo) => onChange({ photo })} errKey={errKey} />
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          {DOCTOR_FIELDS.filter((f) => isShown(f, doctor as unknown as Record<string, unknown>)).map((f) => {
            const key = `${errKey}.${f.key}`;
            return (
              <IntakeField
                key={f.key}
                field={f}
                errKey={key}
                value={doctor[f.key as keyof DoctorEntry] as string}
                error={errors[key]}
                context={doctor as unknown as Record<string, unknown>}
                // Leaving "Other" clears what was typed for it.
                onChange={(v) => onChange(f.key === "role" && v !== "other" ? { role: v as string, roleOther: "" } : { [f.key]: v as string })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DoctorPhoto({ doctor, onChange, errKey }: { doctor: DoctorEntry; onChange: (photo: DoctorEntry["photo"]) => void; errKey: string }) {
  const { ensureSaved, sign } = useIntakeContext();
  const input = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (crop?.startsWith("blob:")) URL.revokeObjectURL(crop);
    setCrop(null);
  };
  async function upload(blob: Blob) {
    setBusy(true);
    try {
      if (!(await ensureSaved())) throw new Error("Enter your email at the top first: photos are saved with your form.");
      const up = await uploadImage(blob, "intake", sign, { maxSide: 1200 });
      onChange({ publicId: up.publicId, url: up.url });
      close();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex shrink-0 flex-row items-center gap-3 sm:w-28 sm:flex-col sm:items-stretch">
      <button
        id={`${fieldId(errKey)}-photo`}
        type="button"
        onClick={() => input.current?.click()}
        aria-label={doctor.photo ? "Change profile photo" : "Add profile photo"}
        className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-lagoon/50 bg-lagoon/5 text-lagoon hover:bg-lagoon/10 sm:mx-auto"
      >
        {doctor.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail of the applicant's own upload
          <img src={thumb(doctor.photo.url)} alt="" className="size-full object-cover" />
        ) : busy ? (
          <Loader2 className="size-6 animate-spin" aria-hidden />
        ) : (
          <UserRound className="size-9" strokeWidth={1.5} aria-hidden />
        )}
      </button>
      <div className="flex flex-col items-start gap-0.5 sm:items-center">
        <button type="button" onClick={() => input.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-lagoon hover:bg-lagoon/10">
          <ImagePlus className="size-4" aria-hidden /> {doctor.photo ? "Change" : "Profile photo"}
        </button>
        {doctor.photo && (
          <button type="button" onClick={() => onChange(undefined)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10">
            <Trash2 className="size-4" aria-hidden /> Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setCrop(URL.createObjectURL(f));
          e.target.value = "";
        }}
      />
      <PhotoCropDialog key={crop ?? "none"} src={crop} mode="portrait" onCancel={close} onDone={upload} />
    </div>
  );
}
