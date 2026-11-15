import Image from "next/image";
import { cn } from "@/lib/cn";
import type { PublicImage } from "@/templates/types";

function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/**
 * Circular doctor photo (real <img> via next/image, so Google can use it as a
 * thumbnail), or initials when no photo is set.
 */
export function DoctorAvatar({
  name,
  photo,
  size,
  sizes,
  priority,
  ring,
  className,
}: {
  name: string;
  photo?: PublicImage;
  /** Rendered px size (square). */
  size: number;
  sizes?: string;
  priority?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const wrapper = cn(
    "relative shrink-0 overflow-hidden rounded-full bg-sage",
    ring && "ring-2 ring-marigold ring-offset-4 ring-offset-paper",
    className,
  );
  if (!photo) {
    return (
      <span
        aria-hidden
        className={cn(wrapper, "flex items-center justify-center font-display font-semibold text-ink")}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <span className={wrapper} style={{ width: size, height: size }}>
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        sizes={sizes ?? `${size}px`}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
