"use client";

import { useRef, useState } from "react";
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useUploadSigner } from "@/components/admin/form/upload-signer";
import { uploadImage } from "@/lib/client/upload-image";
import type { DoctorForm } from "@/lib/doctors/form";

type Item = DoctorForm["gallery"][number];

function SortablePhoto({
  item,
  index,
  onCaption,
  onRemove,
  disabled,
  error,
}: {
  item: Item;
  index: number;
  onCaption: (c: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.publicId, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-line bg-card p-2 ${isDragging ? "z-10 shadow-soft" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sage">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
        <img src={item.url} alt={item.caption || `Photo ${index + 1}`} className="size-full object-cover" />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder photo ${index + 1}`}
          className="absolute left-1.5 top-1.5 flex size-9 cursor-grab touch-none items-center justify-center rounded-md bg-paper/90 text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove photo ${index + 1}`}
          className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-md bg-paper/90 text-clay-text"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <Input
        id={`gallery.${index}.caption`}
        value={item.caption}
        disabled={disabled}
        onChange={(e) => onCaption(e.target.value)}
        placeholder="Caption (e.g. Clinic reception)"
        className="mt-2 h-10"
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="mt-1 text-xs text-clay-text">{error}</p>}
    </li>
  );
}

/**
 * Up to 5 photos (award photos count toward the limit), drag to reorder,
 * captions checked by the compliance scanner. No patient photos.
 */
export function GalleryEditor({
  value,
  onChange,
  maxPhotos,
  disabled,
  errorFor,
  note,
}: {
  value: Item[];
  onChange: (v: Item[]) => void;
  maxPhotos: number;
  disabled?: boolean;
  errorFor: (path: string) => string | undefined;
  /** Replaces the default (doctor) guidance under the photos. */
  note?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const ctxSign = useUploadSigner();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = value.findIndex((x) => x.publicId === e.active.id);
    const to = value.findIndex((x) => x.publicId === e.over!.id);
    onChange(arrayMove(value, from, to));
  }

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const room = maxPhotos - value.length;
    if (room <= 0) return toast.error(`At most ${maxPhotos} photos.`);
    setBusy(true);
    const added: Item[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const up = await uploadImage(file, "gallery", ctxSign);
        added.push({ publicId: up.publicId, url: up.url, caption: "" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      if (added.length) onChange([...value, ...added]);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((x) => x.publicId)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((item, i) => (
              <SortablePhoto
                key={item.publicId}
                item={item}
                index={i}
                disabled={disabled}
                error={errorFor(`gallery.${i}.caption`)}
                onCaption={(caption) => onChange(value.map((x, j) => (j === i ? { ...x, caption } : x)))}
                onRemove={() => onChange(value.filter((_, j) => j !== i))}
              />
            ))}
            {value.length < maxPhotos && (
              <li>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => input.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-card text-sm text-muted-foreground hover:border-ink/40 hover:text-ink"
                >
                  {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" strokeWidth={1.5} />}
                  Add photos
                </button>
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-muted-foreground">
        {value.length} of {maxPhotos} photos
        {note
          ? `. ${note}`
          : " (award photos count toward the 5). Clinic, team, certificates and events only — never patients or before/after pictures."}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
