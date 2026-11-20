import { PageLoader } from "@/components/loading/BrandLoader";

/** While the form (and any saved answers) loads. */
export default function IntakeFormLoading() {
  return <PageLoader label="Opening the form" className="mr-hero-bg -mt-16 min-h-dvh pt-16" />;
}
