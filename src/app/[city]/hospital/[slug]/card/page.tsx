import { siteCardRoute } from "@/lib/public/site-card-route";

/** Public visiting-card page (noindex). Logic in lib/public/site-card-route.tsx. */
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

const route = siteCardRoute("hospital");
export const generateMetadata = route.generateMetadata;
export default route.Page;
