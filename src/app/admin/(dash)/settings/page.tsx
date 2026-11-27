import type { Metadata } from "next";
import { DEFAULT_BANNED_PHRASES } from "@/config/banned-phrases";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor, ROLE_LABEL } from "@/components/admin/nav";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { normalizeAdminRole } from "@/lib/constants";
import { Admin } from "@/models/Admin";
import { AdminUserActions, BannedPhrasesForm, GeneralSettingsForm, NewAdminUserButton } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-line bg-card p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const admin = await requireAdminPage(rolesFor("/admin/settings"));
  await connectToDatabase();
  const [settings, users] = await Promise.all([
    getSettings(),
    can.manageAdmins(admin.role) ? Admin.find().sort({ role: 1, name: 1 }).lean() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Section title="Prices, renewals, contact and GST">
        <GeneralSettingsForm
          initial={{
            prices: settings.prices,
            renewalGraceDays: settings.renewalGraceDays,
            contactPhone: settings.contactPhone ?? "",
            whatsappNumber: settings.whatsappNumber ?? "",
            gstMode: settings.gstMode,
            whatsappShareTemplate: settings.whatsappShareTemplate,
          }}
        />
      </Section>

      <Section title="Banned phrases (NMC)">
        <BannedPhrasesForm phrases={settings.bannedPhrases} overridden={settings.bannedPhrasesOverridden} defaults={[...DEFAULT_BANNED_PHRASES]} />
      </Section>

      {can.manageAdmins(admin.role) && (
        <Section title="Dashboard users">
          <p className="text-sm text-muted-foreground">
            Super admins log in with their email. Sales executives log in with their staff ID (MRS-…) and the password you set; they can&apos;t change it, but you can
            reset it here. They see only their own doctors, clinics and hospitals, never payments, and can&apos;t publish.
          </p>
          <div className="flex justify-end">
            <NewAdminUserButton />
          </div>
          <ul id="users" className="divide-y divide-line rounded-lg border border-line">
            {users.map((u) => {
              const role = normalizeAdminRole(u.role) ?? "sales";
              return (
                <li key={String(u._id)} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {u.name} {String(u._id) === admin.id && <span className="text-xs text-muted-foreground">(you)</span>}
                      <Pill tone={role === "superadmin" ? "ink" : "muted"}>{ROLE_LABEL[role]}</Pill>
                      {u.staffId && <span className="rounded bg-mist px-1.5 font-mono text-[11px]">{u.staffId}</span>}
                      {!u.active && <Pill tone="clay">Inactive</Pill>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[u.email, u.mobile, u.lastLoginAt ? `last login ${timeAgo(u.lastLoginAt)}` : "never logged in"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <AdminUserActions
                    user={{
                      id: String(u._id),
                      name: u.name,
                      email: u.email ?? "",
                      mobile: u.mobile ?? "",
                      staffId: u.staffId ?? "",
                      role,
                      active: u.active,
                      lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "",
                      isMe: String(u._id) === admin.id,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
