"use client";

import { Copy, KeyRound, MessageCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Passwords are stored one-way (bcrypt), so nobody can read one back later.
 * The super admin sees and shares the password at the moment they set it:
 * when adding a user and when setting a new password.
 */

export interface LoginDetails {
  name: string;
  /** Staff ID (sales executives) or email (super admins). */
  loginId: string;
  password: string;
  mobile?: string;
}

// No look-alikes (0/O, 1/l/I), so it can be read out over the phone.
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** "Kq7m-Tz4p-Hw9c": 14 characters, easy to read and type. */
export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const s = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

const copy = (text: string, what: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error("Couldn't copy. Select it and copy by hand."),
  );

/** Password box with Generate and Copy. */
export function PasswordInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <Input id={id} type="text" autoComplete="new-password" spellCheck={false} className="font-mono" value={value} onChange={(e) => onChange(e.target.value)} />
      <Button type="button" variant="outline" onClick={() => onChange(generatePassword())} title="Make a strong password">
        <Wand2 /> Generate
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Copy password" disabled={!value} onClick={() => void copy(value, "Password")}>
        <Copy />
      </Button>
    </div>
  );
}

function message(d: LoginDetails, loginUrl: string) {
  return `Hello ${d.name},\n\nYour MediReach dashboard login:\n${loginUrl}\nLogin ID: ${d.loginId}\nPassword: ${d.password}\n\nPlease keep it private.`;
}

/** After adding a user or setting a new password: the login details to copy or send on WhatsApp. */
export function LoginDetailsDialog({ details, onClose }: { details: LoginDetails | null; onClose: () => void }) {
  const loginUrl = typeof window === "undefined" ? "/admin/login" : `${window.location.origin}/admin/login`;
  const digits = details?.mobile?.replace(/\D/g, "").slice(-10) ?? "";
  const wa = details ? `https://wa.me/${digits.length === 10 ? `91${digits}` : ""}?text=${encodeURIComponent(message(details, loginUrl))}` : "#";
  return (
    <Dialog open={details !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" /> Login details for {details?.name}
          </DialogTitle>
          <DialogDescription>
            Send these to them now. The password is stored one-way, so it can&apos;t be shown again later. If it&apos;s lost, set a new one with the key button.
          </DialogDescription>
        </DialogHeader>
        {details && (
          <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-muted/40 p-3 text-sm">
            <dt className="text-muted-foreground">Login page</dt>
            <dd className="truncate">{loginUrl}</dd>
            <span />
            <dt className="text-muted-foreground">Login ID</dt>
            <dd className="font-mono font-semibold text-ink">{details.loginId}</dd>
            <Button size="icon-sm" variant="ghost" aria-label="Copy login ID" onClick={() => void copy(details.loginId, "Login ID")}>
              <Copy />
            </Button>
            <dt className="text-muted-foreground">Password</dt>
            <dd className="break-all font-mono font-semibold text-ink">{details.password}</dd>
            <Button size="icon-sm" variant="ghost" aria-label="Copy password" onClick={() => void copy(details.password, "Password")}>
              <Copy />
            </Button>
          </dl>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => details && void copy(message(details, loginUrl), "Login details")}>
            <Copy /> Copy all
          </Button>
          <Button asChild>
            <a href={wa} target="_blank" rel="noopener">
              <MessageCircle /> Send on WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
