import { cn } from "@/lib/cn";

/** Surface container with generous padding (build-prompt: generous whitespace). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface-raised p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
