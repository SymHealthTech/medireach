"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { inputClass } from "./IntakeFields";
import { currentPosition } from "./LocationField";

type LatLng = { lat: number; lng: number };

/** Pune; the form is for Pune first. */
const START: LatLng = { lat: 18.5204, lng: 73.8567 };

const PIN = L.divIcon({
  className: "",
  iconSize: [36, 46],
  iconAnchor: [18, 44],
  html: `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 45s15-15.4 15-27A15 15 0 0 0 3 18c0 11.6 15 27 15 27Z" fill="#0E7C7B" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="6" fill="#F2994A" stroke="#fff" stroke-width="2"/></svg>`,
});

interface Place {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Map with a draggable pin (Leaflet + OpenStreetMap tiles: free, no API key).
 * Search uses OpenStreetMap's Nominatim, only when the user presses Search.
 */
export default function MapPicker({ initial, hint, onPick, onCancel }: { initial: LatLng | null; hint: string; onPick: (p: LatLng) => void; onCancel: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [pos, setPos] = useState<LatLng | null>(initial);
  const [q, setQ] = useState(hint);
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const place = (p: LatLng, zoom?: number) => {
    const m = map.current;
    if (!m) return;
    if (!marker.current) {
      marker.current = L.marker([p.lat, p.lng], { draggable: true, icon: PIN, keyboard: true, title: "Drag to the exact place" }).addTo(m);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLatLng();
        setPos({ lat: ll.lat, lng: ll.lng });
      });
    } else marker.current.setLatLng([p.lat, p.lng]);
    if (zoom) m.setView([p.lat, p.lng], zoom);
    setPos(p);
  };

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: true }).setView(initial ? [initial.lat, initial.lng] : [START.lat, START.lng], initial ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    if (initial) place(initial);
    m.on("click", (e: L.LeafletMouseEvent) => place({ lat: e.latlng.lat, lng: e.latlng.lng }));
    // The dialog animates in; measure again once it has its final size.
    const t = setTimeout(() => m.invalidateSize(), 250);
    return () => {
      clearTimeout(t);
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create the map once
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy("search");
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ format: "jsonv2", limit: "5", countrycodes: "in", q: q.trim() })}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error();
      const list = (await res.json()) as Place[];
      setResults(list);
      if (list.length === 1) choose(list[0]!);
      if (!list.length) setError("No match. Try just the area and city (e.g. “Kothrud, Pune”), then move the pin.");
    } catch {
      setError("Search isn't working right now. Zoom and drag the map to find the place instead.");
    } finally {
      setBusy(null);
    }
  }

  function choose(p: Place) {
    place({ lat: Number(p.lat), lng: Number(p.lon) }, 17);
    setResults(null);
  }

  async function locate() {
    setBusy("locate");
    setError(null);
    try {
      place(await currentPosition(), 18);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get your location.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <label className="sr-only" htmlFor="map-search">
          Search a place
        </label>
        <input id="map-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area, road or clinic name" className={cn(inputClass, "h-11 min-w-0 flex-1")} />
        <button type="submit" disabled={busy !== null} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-700 disabled:opacity-60">
          {busy === "search" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>
      {results && results.length > 1 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl border border-line bg-surface text-sm">
          {results.map((r, i) => (
            <li key={`${i}:${r.display_name}`}>
              <button type="button" onClick={() => choose(r)} className="block w-full border-b border-line px-3 py-2 text-left last:border-0 hover:bg-paper">
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-clay-text">{error}</p>}

      <div className="relative">
        <div ref={box} className="h-[50dvh] min-h-[260px] w-full overflow-hidden rounded-xl border border-line" aria-label="Map. Tap to place the pin." />
        <button
          type="button"
          onClick={locate}
          disabled={busy !== null}
          className="absolute bottom-3 right-3 z-[500] inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-surface px-3 text-sm font-semibold text-ink shadow-soft ring-1 ring-ink/10 hover:bg-paper"
        >
          {busy === "locate" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />} My location
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-body/80">{pos ? "Drag the pin if it isn't exactly at the entrance." : "Tap the map to drop the pin."}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-[10px] px-4 text-sm font-semibold text-body hover:bg-paper">
            Cancel
          </button>
          <button
            type="button"
            disabled={!pos}
            onClick={() => pos && onPick(pos)}
            className="min-h-11 rounded-[10px] bg-marigold px-5 text-sm font-semibold text-white hover:bg-marigold-700 disabled:opacity-50"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}
