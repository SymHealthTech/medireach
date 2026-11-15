import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/seo/profile";

/** Visible breadcrumb trail (matches the BreadcrumbList JSON-LD). Absolute links. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.url} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-body">
                  {c.name}
                </span>
              ) : (
                <>
                  <a href={c.url} className="hover:text-ink hover:underline">
                    {c.name}
                  </a>
                  <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
