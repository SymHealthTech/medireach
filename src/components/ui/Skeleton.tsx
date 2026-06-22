import { cn } from "@/lib/cn";

/** Animated shimmer placeholder for content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}
