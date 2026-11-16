"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublicImage } from "@/templates/types";

/**
 * Photo grid (2 columns on mobile) with a tap-to-open lightbox. "mosaic" makes
 * the first photo a large feature tile with captions over the photos.
 */
export function Gallery({ images, layout = "grid" }: { images: PublicImage[]; layout?: "grid" | "mosaic" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<PublicImage | null>(null);

  function open(img: PublicImage) {
    setActive(img);
    dialog.current?.showModal();
  }

  return (
    <>
      {layout === "mosaic" ? (
        <ul
          className={cn(
            "grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:gap-4 lg:auto-rows-[210px]",
            images.length === 1 && "grid-cols-1 auto-rows-[260px] sm:auto-rows-[420px]",
            images.length === 3 && "lg:grid-cols-3",
            images.length >= 4 && "lg:grid-cols-4",
            images.length === 2 && "sm:auto-rows-[320px]",
          )}
        >
          {images.map((img, i) => (
            <li
              key={img.url}
              className={cn(
                // Feature tile first; with 4 photos the last one spans two columns to close the gap.
                i === 0 && images.length >= 3 && "col-span-2 row-span-2",
                i === 3 && images.length === 4 && "col-span-2",
              )}
            >
              <button
                type="button"
                onClick={() => open(img)}
                className="group relative block h-full w-full overflow-hidden rounded-2xl bg-sage"
                aria-label={`Open photo: ${img.caption || img.alt}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                {img.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent px-3 pb-2.5 pt-8 text-left text-sm font-medium text-paper">
                    {img.caption}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
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
                {img.caption && <figcaption className="mt-1.5 text-sm text-muted-foreground">{img.caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      )}

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
