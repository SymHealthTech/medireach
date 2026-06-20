import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Auth-pages layout: pins a dark/light toggle in the corner so login, signup,
 * and recovery screens are switchable too (spec §2 dark/light support).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
