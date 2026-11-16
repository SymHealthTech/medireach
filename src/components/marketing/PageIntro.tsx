/** Title block for marketing pages. */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-12 sm:px-6 lg:pt-16">
      {eyebrow && <span className="inline-flex rounded-full bg-sage px-3 py-1 text-sm font-medium text-ink">{eyebrow}</span>}
      <h1 className="font-display text-[36px] font-semibold leading-[1.15] text-ink lg:text-5xl">{title}</h1>
      {children && <div className="text-lg text-body">{children}</div>}
    </header>
  );
}

/** Long-form text (terms, privacy). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pb-20 text-body sm:px-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_section]:space-y-3 [&_ul]:space-y-2">
      {children}
    </div>
  );
}
