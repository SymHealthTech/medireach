"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PrescriptionSheet, type PrescriptionSheetData } from "./PrescriptionSheet";

/** A4 layout size in CSS px at 96dpi (210mm × 297mm). */
const A4_W = (210 / 25.4) * 96; // ≈ 793.7
const A4_H = (297 / 25.4) * 96; // ≈ 1122.5

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Renders a full-size <PrescriptionSheet> scaled down to fit the available
 * width, so the customise screen shows the real A4 sheet (the exact thing that
 * prints and ships) without a horizontal scrollbar. Exposes the underlying
 * full-size node via `sheetRef` for print / raster.
 */
export function PrescriptionPreview({
  data,
  sheetRef,
}: {
  data: PrescriptionSheetData;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / A4_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <div style={{ width: A4_W * scale, height: A4_H * scale, margin: "0 auto" }}>
        <div
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          }}
        >
          <PrescriptionSheet ref={sheetRef} data={data} />
        </div>
      </div>
    </div>
  );
}
