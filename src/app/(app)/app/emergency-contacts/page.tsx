"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";

interface Contact {
  doctorId: string;
  name: string;
  appId: string;
  status: "pending" | "accepted" | "declined";
}
interface Incoming {
  fromDoctorId: string;
  name: string;
  appId: string;
}

/**
 * Emergency Contacts (spec §10, §12). Add other MediReach doctors by their app
 * ID (they must accept), respond to incoming requests, and manage the list
 * (max 10). Cold-start note: this network grows with adoption (§10).
 */
export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [max, setMax] = useState(10);
  const [appId, setAppId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<{ contacts: Contact[]; incoming: Incoming[]; max: number }>(
      "/api/sos/contacts",
    ).catch(() => null);
    if (data) {
      setContacts(data.contacts);
      setIncoming(data.incoming);
      setMax(data.max);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/sos/contacts", { appId });
      setAppId("");
      setMsg("Request sent — they'll need to accept.");
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function respond(fromDoctorId: string, accept: boolean) {
    await apiPost("/api/sos/contacts/respond", { fromDoctorId, accept }).catch(() => {});
    load();
  }

  async function remove(doctorId: string) {
    await fetch(`/api/sos/contacts/${doctorId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Emergency Contacts</h1>
        <p className="text-sm text-ink-muted">
          Add up to {max} fellow doctors. They must accept before they&apos;ll receive your SOS
          alerts.
        </p>
      </div>

      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      {incoming.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Requests for you</p>
          {incoming.map((r) => (
            <div key={r.fromDoctorId} className="flex items-center justify-between">
              <span className="text-ink">
                Dr. {r.name} <span className="text-ink-muted">({r.appId})</span>
              </span>
              <div className="flex gap-2">
                <Button variant="brand" size="md" onClick={() => respond(r.fromDoctorId, true)}>
                  Accept
                </Button>
                <Button variant="ghost" size="md" onClick={() => respond(r.fromDoctorId, false)}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <form onSubmit={add} className="flex gap-2">
          <Input
            placeholder="Doctor's MediReach ID (e.g. MR-00042)"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          <Button type="submit" variant="brand" disabled={contacts.length >= max || !appId.trim()}>
            Add
          </Button>
        </form>
      </Card>

      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.doctorId} className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3">
            <span className="text-ink">
              Dr. {c.name} <span className="text-ink-muted">({c.appId})</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  c.status === "accepted" ? "bg-success/15 text-success" : "bg-line text-ink-muted"
                }`}
              >
                {c.status}
              </span>
            </span>
            <button onClick={() => remove(c.doctorId)} className="text-sm text-sos hover:underline">
              Remove
            </button>
          </li>
        ))}
        {contacts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-muted">
            No contacts yet. As more doctors join MediReach, you can add them here.
          </p>
        )}
      </ul>
    </div>
  );
}
