/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongoose", "bcryptjs"],
  // Card images read the brand fonts from disk; make sure they ship with these routes.
  outputFileTracingIncludes: {
    "/[city]/doctor/[slug]/card/[file]": ["./src/assets/fonts/**"],
    "/[city]/doctor/[slug]/opengraph-image": ["./src/assets/fonts/**"],
    "/admin/cards/[id]/[file]": ["./src/assets/fonts/**"],
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async rewrites() {
    return {
      // Top-level doctor short links (/dr-amit-shah) are answered by a route
      // handler that issues a real 301 to the canonical profile URL. Runs
      // before dynamic routes, so /[city] never sees "dr-" slugs.
      afterFiles: [{ source: "/:shortSlug(dr-[a-z0-9-]+)", destination: "/go/:shortSlug" }],
    };
  },
};

export default nextConfig;
