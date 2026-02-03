"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, BarChart3, Settings, DollarSign, Bell, CalendarDays, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getNotificationsCount } from "@/app/actions";
import { SettingsModal } from "./SettingsModal";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Collectibles", href: "/collectibles", icon: DollarSign },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    function updateCount() {
      getNotificationsCount()
        .then((count) => setNotificationCount(count))
        .catch(() => setNotificationCount(0));
    }
    updateCount();
    const interval = setInterval(updateCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* Backdrop on mobile when drawer is open */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-sand-100 dark:bg-gray-800 border-r border-sand-200 dark:border-gray-700 flex flex-col p-6 z-50 transition-transform duration-300 ease-out",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between mb-12 md:mb-12">
          <div>
            <h1 className="font-serif text-2xl tracking-tight text-charcoal dark:text-white">The Way LLC</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Client Management</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2.5 rounded-lg text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const showBadge = item.href === "/notifications" && notificationCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 relative min-h-[44px] touch-manipulation",
                  isActive
                    ? "bg-white dark:bg-gray-700 shadow-sm text-charcoal dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-charcoal dark:hover:text-white"
                )}
              >
                <Icon size={18} strokeWidth={1.5} />
                {item.name}
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-sand-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors w-full rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 min-h-[44px] touch-manipulation"
          >
            <Settings size={18} strokeWidth={1.5} />
            Settings
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
