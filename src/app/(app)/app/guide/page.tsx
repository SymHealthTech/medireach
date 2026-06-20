import { getContent } from "@/lib/content";

/** In-app User Guide (spec §12) — admin-editable content. */
export default async function GuidePage() {
  const { title, body } = await getContent("user-guide");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="space-y-3">
        {body.split("\n").map((line, i) =>
          line.trim() ? <p key={i} className="text-ink-muted">{line}</p> : <div key={i} className="h-1" />,
        )}
      </div>
    </div>
  );
}
