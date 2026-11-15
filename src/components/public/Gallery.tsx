"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { PublicImage } from "@/templates/types";

/** Photo grid (2 columns on mobile) with a tap-to-open lightbox. */
export function Gallery({ images }: { images: PublicImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<PublicImage | null>(null);

  function open(img: PublicImage) {
    setActive(img);
    dialog.current?.showModal();
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <li key={img.url}>
            <figure>
              <button
                type="button"
                onClick={() => open(img)}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-sage"
                aria-label={`Open photo: ${img.caption || img.alt}`}
              >
                <Image src={img.url} alt={img.alt} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
              </button>
              {img.caption && <figcaption className="mt-1.5 text-sm text-muted">{img.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setActive(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="max-h-[90vh] w-[min(92vw,960px)] rounded-xl bg-surface p-0 backdrop:bg-ink/80"
      >
        {active && (
          <figure className="relative">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink"
              aria-label="Close photo"
            >
              <X aria-hidden className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <div className="relative aspect-[4/3] w-full">
              <Image src={active.url} alt={active.alt} fill sizes="92vw" className="object-contain" />
            </div>
            {active.caption && <figcaption className="p-4 text-sm text-body">{active.caption}</figcaption>}
          </figure>
        )}
      </dialog>
    </>
  );
}
