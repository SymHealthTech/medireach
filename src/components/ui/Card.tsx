import { cn } from "@/lib/cn";

/**
 * Surface container: 12px corners, soft shadow, no harsh border in light mode
 * (build-prompt: subtle rounded corners + soft shadow, no harsh borders). Dark
 * mode adds a hairline ring so cards separate from the near-black page, plus a
 * deeper shadow tuned for dark backgrounds.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-raised p-5 shadow-card",
        "dark:shadow-card-dark dark:ring-1 dark:ring-line/70",
        className,
      )}
      {...props}
    />
  );
}
