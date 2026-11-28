import { siteWebsiteRoute } from "@/lib/public/site-route";

/**
 * The clinic's own website on its subdomain (middleware rewrite; 404 on the apex).
 * Rendering, SEO and caching live in lib/public/site-route.tsx.
 */
export const revalidate = 86400; // safety net; on-demand revalidation is primary

const route = siteWebsiteRoute("clinic");
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
