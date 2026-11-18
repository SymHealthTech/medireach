/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongoose", "bcryptjs"],
  // Card images read the brand fonts from disk; make sure they ship with these routes.
  outputFileTracingIncludes: {
    "/[city]/doctor/[slug]/card/[file]": ["./src/assets/fonts/**"],
    "/[city]/doctor/[slug]/opengraph-image": ["./src/assets/fonts/**"],
    "/[city]/clinic/[slug]/opengraph-image": ["./src/assets/fonts/**"],
    "/[city]/hospital/[slug]/opengraph-image": ["./src/assets/fonts/**"],
    "/[city]/clinic/[slug]/card/[file]": ["./src/assets/fonts/**"],
    "/[city]/hospital/[slug]/card/[file]": ["./src/assets/fonts/**"],
    "/admin/cards/site/[id]/[file]": ["./src/assets/fonts/**"],
    "/admin/cards/[id]/[file]": ["./src/assets/fonts/**"],
    "/sample/[key]/card/[file]": ["./src/assets/fonts/**"],
    "/opengraph-image": ["./src/assets/fonts/**", "./public/icon-192.png"],
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async redirects() {
    return [
      // The old marketing page for hospitals moved to /for-hospitals.
      { source: "/hospitals", destination: "/for-hospitals", statusCode: 301 },
      // The old Hospitals admin pages were replaced by Clinics & hospitals.
      { source: "/admin/hospitals", destination: "/admin/establishments?kind=hospital", permanent: false },
      { source: "/admin/hospitals/:path*", destination: "/admin/establishments?kind=hospital", permanent: false },
    ];
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
