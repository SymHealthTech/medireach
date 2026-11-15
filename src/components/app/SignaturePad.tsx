"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * A draw-your-own signature pad (spec §15.3, Design Prescription). The doctor
 * signs with finger / stylus / mouse on a canvas; "Use this signature" exports a
 * transparent PNG File that the caller uploads exactly like an uploaded image,
 * so both signature methods converge on the same stored public_id.
 */
export function SignaturePad({
  onSave,
  busy,
}: {
  onSave: (file: File) => void;
  busy: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Size the backing store to the device pixel ratio so strokes stay crisp on
  // retina / high-DPI screens, then scale the context back to CSS pixels.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  function pointFor(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFor(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pointFor(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(new File([blob], "signature.png", { type: "image/png" }));
      clear();
    }, "image/png");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-xl border border-dashed border-line bg-surface-raised"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">Sign inside the box above.</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk || busy}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line/30 disabled:opacity-50"
          >
            Clear
          </button>
          <Button type="button" variant="brand" size="sm" onClick={commit} disabled={!hasInk} loading={busy}>
            Use this signature
          </Button>
        </div>
      </div>
    </div>
  );
}
