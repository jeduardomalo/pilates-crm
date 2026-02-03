"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const trimmedUsername = username.trim();
      const result = await signIn("credentials", {
        username: trimmedUsername,
        email: trimmedUsername,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-8">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl text-charcoal dark:text-white mb-2">The Way LLC</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Client Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage dark:bg-gray-900 dark:text-white"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage dark:bg-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-charcoal dark:bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-black dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
