"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/client/api";
import { doctorDisplayName } from "@/lib/doctorName";

interface Contact {
  doctorId: string;
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
  const [max, setMax] = useState(10);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await apiGet<{ contacts: Contact[]; max: number }>(
      "/api/sos/contacts",
    ).catch(() => null);
    if (data) {
      setContacts(data.contacts);
      setMax(data.max);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <EmergencyContactsSkeleton />;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await apiPost<{ name: string }>("/api/sos/contacts", { query });
      setQuery("");
      setMsg(`${doctorDisplayName(res.name)} added to your emergency contacts.`);
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function remove(doctorId: string) {
    await fetch(`/api/sos/contacts/${doctorId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency Contacts" subtitle={`Add up to ${max} fellow doctors.`} />

      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      <Card>
        <form onSubmit={add} className="flex gap-2">
          <Input
            placeholder="MediReach ID (e.g. MR-00042) or mobile number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="brand" disabled={contacts.length >= max || !query.trim()}>
            Add
          </Button>
        </form>
      </Card>

      {contacts.length === 0 ? (
        <EmptyState
          icon="🚑"
          title="No contacts yet"
          description="As more doctors join MediReach, you can add them here for emergencies."
        />
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.doctorId} className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3">
              <span className="text-ink">
                {doctorDisplayName(c.name)} <span className="text-ink-muted">({c.appId})</span>
              </span>
              <button onClick={() => remove(c.doctorId)} className="text-sm text-sos hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmergencyContactsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card>
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-16 rounded-xl" />
        </div>
      </Card>
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}
