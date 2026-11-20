"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, ExternalLink, Loader2, MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mapsLinkFor, parseLocation } from "@/lib/intake/form";

// Leaflet (and its CSS) loads only when someone opens the map.
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[55dvh] items-center justify-center rounded-xl bg-paper text-sm text-body/70">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Loading map…
    </div>
  ),
});

/** Ask the browser for the current position (only when the user taps the button). */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Your browser can't share its location. Pick it on the map instead."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location permission was refused. Allow it in your browser settings, or pick the place on the map."
              : "Couldn't get your location. Pick the place on the map instead.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

const fmt = (v: { lat: number; lng: number }) => `${v.lat.toFixed(6)},${v.lng.toFixed(6)}`;

/**
 * Location as a map pin ("lat,lng"): pick it on a map (search + drag the pin)
 * or use the phone's current location. No Google Maps link needed.
 */
export function LocationField({ id, value, onChange, hint }: { id: string; value: string; onChange: (v: string) => void; hint: string }) {
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loc = parseLocation(value);

  async function useCurrent() {
    setError(null);
    setLocating(true);
    try {
      onChange(fmt(await currentPosition()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-2">
      {loc ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-leaf/30 bg-leaf/10 px-3 py-2 text-sm">
          <MapPin className="size-4 text-leaf-text" aria-hidden />
          <span className="font-semibold text-ink">Location pinned</span>
          <a href={mapsLinkFor(loc)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-lagoon underline underline-offset-2">
            Check on Google Maps <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          id={id}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-700"
        >
          <MapPin className="size-4" aria-hidden /> {loc ? "Change on map" : "Pick on map"}
        </button>
        <button
          type="button"
          onClick={useCurrent}
          disabled={locating}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
        >
          {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />} Use my current location
        </button>
        {loc && (
          <button type="button" onClick={() => onChange("")} className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm text-clay-text hover:bg-clay/10">
            <Trash2 className="size-4" aria-hidden /> Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-clay-text">
          {error}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto rounded-2xl border-line bg-surface p-4 sm:max-w-3xl sm:p-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="font-display text-xl font-semibold text-ink">Pin your location</DialogTitle>
            <DialogDescription className="text-sm text-body/80">Search your area, then tap the map or drag the pin to the exact entrance.</DialogDescription>
          </DialogHeader>
          {open && (
            <MapPicker
              initial={loc}
              hint={hint}
              onCancel={() => setOpen(false)}
              onPick={(p) => {
                onChange(fmt(p));
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
