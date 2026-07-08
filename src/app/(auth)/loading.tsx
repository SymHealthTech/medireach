import { ScreenLoader } from "@/components/ui/Spinner";

/** Auth-route transition fallback (login / signup / forgot-password). */
export default function AuthLoading() {
  return <ScreenLoader />;
}
