"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Mobile header: hamburger + title */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 bg-sand-100 dark:bg-gray-800 border-b border-sand-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2.5 -ml-1 rounded-lg text-charcoal dark:text-white hover:bg-white/50 dark:hover:bg-gray-700/50 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={24} strokeWidth={1.5} />
        </button>
        <h1 className="font-serif text-lg tracking-tight text-charcoal dark:text-white truncate">The Way LLC</h1>
      </header>

      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="pt-14 md:pt-0 md:pl-64 min-h-screen bg-sand-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
          {children}
        </div>
      </main>
    </>
  );
}
