import type { Metadata } from "next";

/** Everything under /admin is private: never indexed, never cached publicly. */
export const metadata: Metadata = {
  title: { default: "Dashboard | MediReach", template: "%s | MediReach dashboard" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
