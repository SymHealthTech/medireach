"use client";

import { Field } from "@/components/admin/form/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UploadSigner } from "@/lib/client/upload-image";
import { LIMITS } from "@/lib/constants";
import type { DoctorForm, ImageValue } from "@/lib/doctors/form";
import { SimpleImageUpload } from "./PhotoCropUpload";

type Value = ImageValue & { caption: string };

/**
 * The "Beyond medicine" photo and its caption. Shared by the dashboard editor
 * and the doctor's own account page (which passes its own upload signer).
 * InterestsStoryFields below is the story shown beside it.
 */
export function InterestsPhotoFields({
  value,
  onChange,
  disabled,
  error,
  sign,
  onUploadError,
}: {
  value?: Value;
  onChange: (v: Value | undefined) => void;
  disabled?: boolean;
  error?: string;
  sign?: UploadSigner;
  onUploadError?: (message: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">Beyond medicine photo</p>
        <p className="text-sm text-muted-foreground">A hobby or activity, e.g. a marathon or a trek. No patient photos.</p>
      </div>
      <SimpleImageUpload
        purpose="interests"
        label="Add photo"
        value={value}
        disabled={disabled}
        sign={sign}
        onError={onUploadError}
        onChange={(img) => onChange(img ? { ...img, caption: value?.caption ?? "" } : undefined)}
      />
      {value && (
        <Field label="Caption" htmlFor="interestsPhoto.caption" help="Optional, e.g. Training for the Pune half marathon." error={error}>
          <Input
            id="interestsPhoto.caption"
            maxLength={120}
            value={value.caption}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange({ ...value, caption: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

/**
 * The "Beyond medicine" story: a personal achievement or hobby, not health
 * advice. Plain text; a blank line starts a new paragraph.
 */
export function InterestsStoryFields({
  value,
  onChange,
  disabled,
  err,
}: {
  value: DoctorForm["interestsStory"];
  onChange: (v: DoctorForm["interestsStory"]) => void;
  disabled?: boolean;
  err: (path: string) => string | undefined;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">Beyond medicine story</p>
        <p className="text-sm text-muted-foreground">
          An achievement or passion outside medicine, e.g. a marathon, a trek or a music performance. Shown beside the photo. Not health advice.
        </p>
      </div>
      <Field label="Story title" htmlFor="interestsStory.title" help="e.g. From a 5 km fun run to the Pune Marathon" error={err("interestsStory.title")}>
        <Input
          id="interestsStory.title"
          maxLength={150}
          value={value.title}
          disabled={disabled}
          aria-invalid={err("interestsStory.title") ? true : undefined}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field
        label="Story"
        htmlFor="interestsStory.body"
        help={`${value.body.length}/${LIMITS.storyBody} — leave a blank line between paragraphs.`}
        error={err("interestsStory.body")}
      >
        <Textarea
          id="interestsStory.body"
          rows={10}
          maxLength={LIMITS.storyBody}
          value={value.body}
          disabled={disabled}
          aria-invalid={err("interestsStory.body") ? true : undefined}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
        />
      </Field>
    </div>
  );
}
