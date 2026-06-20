import { redirect } from "next/navigation";

/** App entry → today's queue, the default landing screen for both roles (§7.1). */
export default function AppIndex() {
  redirect("/app/queue");
}
