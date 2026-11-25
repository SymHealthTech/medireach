"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";

/**
 * Login form for the sample website dashboard shown to doctors. The dummy
 * email and password are printed on the page; nothing is checked against a
 * server. Real doctors log in with a one-time email code (/doctor-login).
 */
export function DemoLoginForm({ email, password, next }: { email: string; password: string; next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email, password });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-lagoon">Website dashboard</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-ink">Welcome back, doctor</h1>
      <p className="mt-3 text-body/85">Log in to see appointment requests and update your website.</p>

      <div className="mt-6 rounded-2xl border border-dashed border-marigold/60 bg-marigold/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <KeyRound aria-hidden className="size-4" /> Demo login details
        </p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-mono">{email}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono">{password}</dd>
        </dl>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.email.trim().toLowerCase() === email && form.password === password) {
            sessionStorage.setItem("mr-demo-login", "1");
            router.push(next);
          } else setError("That email or password doesn't match the demo login above.");
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink">Email</span>
          <span className="relative block">
            <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="min-h-12 w-full rounded-[10px] border border-line bg-surface pl-11 pr-3 text-ink outline-none focus:border-lagoon focus:ring-4 focus:ring-lagoon/15"
            />
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-ink">Password</span>
          <span className="relative block">
            <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="min-h-12 w-full rounded-[10px] border border-line bg-surface pl-11 pr-12 text-ink outline-none focus:border-lagoon focus:ring-4 focus:ring-lagoon/15"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-mist"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-clay-text">
            {error}
          </p>
        )}
        <button type="submit" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700">
          Log in <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
    </div>
  );
}
