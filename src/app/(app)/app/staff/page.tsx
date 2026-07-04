"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/client/api";

/**
 * Staff (spec §12) — the DOCTOR provisions and manages the single linked
 * receptionist account (§5.2, Change 1). The doctor sets the username and
 * password directly; if an account already exists he can change the password by
 * just typing a new one (no reset-link flow), or delete the account entirely.
 * The receptionist has no self-service account management of her own.
 */
export default function StaffPage() {
  const [existing, setExisting] = useState<{ name: string; username: string } | null>(null);
  const [form, setForm] = useState({ name: "", username: "", mobile: "", password: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const d = await apiGet<{ receptionist: { name: string; username: string } | null }>("/api/staff").catch(() => null);
    if (d?.receptionist) {
      setExisting(d.receptionist);
      setForm((f) => ({ ...f, name: d.receptionist!.name, username: d.receptionist!.username, password: "" }));
    } else {
      setExisting(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <StaffSkeleton />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiPost("/api/staff", form);
      setMsg(
        existing
          ? "Updated. The receptionist's previous session (if any) is now logged out."
          : "Receptionist account created. Share the username and password with her.",
      );
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function remove() {
    if (!confirm("Delete the receptionist account? She will be logged out immediately.")) return;
    setMsg(null);
    const res = await fetch("/api/staff", { method: "DELETE" });
    if (res.ok) {
      setForm({ name: "", username: "", mobile: "", password: "" });
      setExisting(null);
      setMsg("Receptionist account deleted.");
    } else {
      setMsg("Could not delete the account.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Staff</h1>
        <p className="text-sm text-ink-muted">
          {existing
            ? `Receptionist login: ${existing.username}. Type a new password below to reset her access.`
            : "Create your receptionist's login. She signs in on the same login screen with these credentials."}
        </p>
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="n">Receptionist name</Label>
            <Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="u">Username (for login)</Label>
            <Input id="u" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="m">Mobile (optional)</Label>
            <Input id="m" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="p">{existing ? "New password" : "Password"}</Label>
            <Input
              id="p"
              type="password"
              autoComplete="new-password"
              placeholder={existing ? "Type a new password to reset access" : "At least 8 characters"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="brand" size="lg">
              {existing ? "Update access" : "Create account"}
            </Button>
            {existing && (
              <Button type="button" variant="danger" size="lg" onClick={remove}>
                Delete account
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function StaffSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Card>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-40 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}
