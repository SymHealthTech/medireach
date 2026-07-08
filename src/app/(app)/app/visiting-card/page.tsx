"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { PublicCard } from "@/components/card/PublicCard";
import type { PublicCardData } from "@/lib/visiting-card";
import {
  VisitingCardEditor,
  type CardData,
  type CardProfile,
} from "@/components/app/VisitingCardEditor";
import {
  qrDataUrl,
  downloadDataUrl,
  buildShareCardImage,
  buildFullCardImage,
} from "@/lib/client/visitingCard";

interface CardResponse {
  profile: CardProfile;
  card: CardData | null;
}

/** Assemble the exact public view from the doctor's live profile + card. */
function toPreview(profile: CardProfile, card: CardData): PublicCardData {
  return {
    slug: card.slug,
    name: profile.name,
    degree: profile.degree,
    clinicName: profile.clinicName,
    clinicAddress: profile.clinicAddress,
    clinicTimings: profile.clinicTimings,
    registrationNumber: profile.registrationNumber,
    designation: card.designation,
    callNumber: profile.mobile,
    tagline: card.tagline,
    services: card.services,
    languages: card.languages,
    whatsappNumber: card.whatsappNumber || profile.mobile,
    mapsLink: card.mapsLink,
    profilePhotoUrl: card.profilePhotoPreview,
    coverPhotoUrl: card.coverPhotoPreview,
  };
}

/**
 * Doctor's "Digital Visiting Card" management screen. Creates the card (if none
 * exists) or lets the doctor view / share / edit / delete an existing one.
 * Doctor-only — receptionists are shown a short notice.
 */
export default function VisitingCardPage() {
  const { me, loading: meLoading } = useMe();
  const [data, setData] = useState<CardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<CardResponse>("/api/visiting-card");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.role === "doctor") load();
    else if (!meLoading) setLoading(false);
  }, [me, meLoading, load]);

  // (Re)generate the QR whenever a published card is present.
  useEffect(() => {
    if (data?.card) {
      qrDataUrl(data.card.publicUrl).then(setQr).catch(() => setQr(null));
    } else {
      setQr(null);
    }
  }, [data?.card]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied.");
    } catch {
      flash("Couldn't copy — long-press the link to copy.");
    }
  }

  async function shareLink(url: string, name: string) {
    const text = `Dr. ${name}'s visiting card`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copyLink(url);
  }

  // "Download QR" → a branded, printable QR flyer (header + name + big QR).
  async function downloadQr(profile: CardProfile, card: CardData) {
    try {
      const blob = await buildShareCardImage({
        url: card.publicUrl,
        name: profile.name,
        degree: profile.degree,
        designation: card.designation,
        clinicName: profile.clinicName,
        tagline: card.tagline,
      });
      downloadDataUrl(URL.createObjectURL(blob), `${card.slug}-qr.png`);
    } catch (e) {
      flash((e as Error).message || "Couldn't generate QR image.");
    }
  }

  // "Download card image" → a PNG snapshot of the full visiting card.
  async function downloadImage(profile: CardProfile, card: CardData) {
    try {
      const blob = await buildFullCardImage(toPreview(profile, card));
      downloadDataUrl(URL.createObjectURL(blob), `${card.slug}-card.png`);
    } catch (e) {
      flash((e as Error).message || "Couldn't create image.");
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/visiting-card", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmDelete(false);
      flash("Card deleted.");
      await load();
    } catch {
      flash("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (meLoading || loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  if (me?.role !== "doctor") {
    return (
      <Card>
        <p className="text-sm text-ink-muted">
          The Digital Visiting Card is available to doctors only.
        </p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">Couldn&apos;t load your visiting card.</p>
        <Button className="mt-3" variant="outline" onClick={load}>
          Retry
        </Button>
      </Card>
    );
  }

  const { profile, card } = data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Digital Visiting Card"
        subtitle="A shareable, professional page you can send to patients."
      />

      {toast && (
        <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{toast}</p>
      )}

      {/* No card yet, or actively editing/creating → show the editor. */}
      {editing || !card ? (
        <>
          {!card && !editing && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">
                Create your Digital Visiting Card
              </h2>
              <p className="text-sm text-ink-muted">
                Get a beautiful, shareable link and QR code for your practice — perfect for your
                prescription pad, clinic door, or a WhatsApp introduction. We&apos;ll pre-fill your
                profile details automatically.
              </p>
              <Button variant="brand" size="lg" onClick={() => setEditing(true)}>
                Get started
              </Button>
            </Card>
          )}
          {editing && (
            <VisitingCardEditor
              profile={profile}
              card={card}
              onSaved={async () => {
                setEditing(false);
                await load();
                flash(card ? "Card updated." : "Card created.");
              }}
              onCancel={card ? () => setEditing(false) : undefined}
            />
          )}
        </>
      ) : (
        <>
          {/* Share section */}
          <Card className="space-y-4">
            <h2 className="text-base font-semibold text-ink">Share your card</h2>

            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Public link</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={card.publicUrl}
                  className="h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm text-ink"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" onClick={() => copyLink(card.publicUrl)}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="brand" onClick={() => shareLink(card.publicUrl, profile.name)}>
                Share
              </Button>
              <a href={card.publicUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">Open</Button>
              </a>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-4">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="Visiting card QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
              ) : (
                <Skeleton className="h-44 w-44 rounded-lg" />
              )}
              <p className="text-xs text-ink-muted">
                Print this on your prescription pad or clinic door.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadQr(profile, card)}>
                  Download QR (PNG)
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadImage(profile, card)}>
                  Download card image
                </Button>
              </div>
            </div>
          </Card>

          {/* Live preview */}
          <div>
            <p className="mb-2 text-sm font-medium text-ink-muted">Live preview</p>
            <div className="rounded-2xl bg-[#EEF3F4] p-4">
              <PublicCard data={toPreview(profile, card)} />
            </div>
          </div>

          {/* Manage */}
          <Card className="flex flex-wrap gap-3">
            <Button variant="brand" onClick={() => setEditing(true)}>
              Edit card
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </Card>
        </>
      )}

      <Modal open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-ink">Delete visiting card?</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Your public link will stop working and show a “no longer available” page. You can create
            a new card anytime.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
