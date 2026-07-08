import { PageLoader } from "@/components/ui/Spinner";

/**
 * Route-transition fallback for the whole app shell (Phase 1). Shown while a
 * segment's server work resolves on refresh / client navigation, so the user
 * always sees a centered teal spinner instead of a blank or frozen screen.
 */
export default function AppLoading() {
  return <PageLoader />;
}
