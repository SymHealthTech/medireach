/**
 * Dev-only banner for placeholder template slots (t2–t5). Inline styles only,
 * so it also renders inside card images. Never shown in production.
 */
export function DevBanner({ name }: { name: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "6px 12px",
        background: "#E3A23B",
        color: "#0E3B3C",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      TODO: “{name}” design not built yet — showing Classic
    </div>
  );
}
