import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { GuideClient } from "./GuideClient";

export default async function GuidePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <GuideClient role={session.role} />;
}
