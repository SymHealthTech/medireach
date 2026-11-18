import { siteRoute } from "@/lib/public/site-route";

/** Canonical hospital site. Rendering, SEO and caching live in lib/public/site-route.tsx. */
export const revalidate = 86400; // safety net; on-demand revalidation is primary

const route = siteRoute("hospital");
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
