"use client";

import { DoctorMenu } from "@/components/app/DoctorMenu";
import { ReceptionistMenu } from "@/components/app/ReceptionistMenu";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { useMe } from "@/lib/client/useMe";

/**
 * Menu screen. Renders a role-specific component — the doctor's full menu (§12)
 * or the receptionist's short menu (§5.2) — never a shared menu with items
 * conditionally hidden.
 */
export default function MenuPage() {
  const { me, loading } = useMe();
  if (loading || !me) return <SpinnerBlock />;
  return me.role === "receptionist" ? <ReceptionistMenu name={me.name} /> : <DoctorMenu name={me.name} />;
}
