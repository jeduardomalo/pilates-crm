"use client";

import { useState, useEffect } from "react";
import { X, Moon, Sun, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    
    // Apply theme immediately
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    const html = document.documentElement;
    if (newDarkMode) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new Event("themechange"));
  };

  const handleLogout = async () => {
    onClose();
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl text-charcoal dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-sand-50 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-sand-200 dark:border-gray-700 bg-sand-50 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              {mounted && darkMode ? (
                <Moon size={20} className="text-charcoal dark:text-white" />
              ) : (
                <Sun size={20} className="text-charcoal dark:text-white" />
              )}
              <div>
                <p className="text-sm font-medium text-charcoal dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? "bg-charcoal" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
