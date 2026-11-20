import { PageLoader } from "@/components/loading/BrandLoader";

/** While the saved forms for this browser load. */
export default function ContinueLoading() {
  return <PageLoader label="Finding your saved forms" className="mr-hero-bg -mt-16 min-h-dvh pt-16" />;
}
