import { siteRoute } from "@/lib/public/site-route";

/** Hospital listing on MediReach (or the full site without a subdomain). Rendering, SEO and caching live in lib/public/site-route.tsx. */
export const revalidate = 86400; // safety net; on-demand revalidation is primary

const route = siteRoute("hospital");
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
