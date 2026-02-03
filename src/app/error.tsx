"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const message = error.message || "Something went wrong.";
  const isPrismaMessage = message.includes("Prisma client is out of date");
  const isDbMessage =
    message.includes("DATABASE") ||
    message.includes("Prisma") ||
    message.includes("connect");

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 dark:bg-gray-900 p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-sand-200 dark:border-gray-700 p-8">
        <h1 className="font-serif text-xl text-charcoal dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 whitespace-pre-wrap">
          {message}
        </p>
        {(isPrismaMessage || isDbMessage) && (
          <ul className="text-sm text-gray-500 dark:text-gray-500 mb-6 list-disc list-inside">
            {isPrismaMessage && (
              <>
                <li>Run: <code className="bg-sand-100 dark:bg-gray-700 px-1 rounded">npx prisma generate</code></li>
                <li>Restart the dev server: <code className="bg-sand-100 dark:bg-gray-700 px-1 rounded">npm run dev</code></li>
              </>
            )}
            {isDbMessage && !isPrismaMessage && (
              <>
                <li>Check <code className="bg-sand-100 dark:bg-gray-700 px-1 rounded">.env</code> has a valid <code className="bg-sand-100 dark:bg-gray-700 px-1 rounded">DATABASE_URL</code></li>
                <li>If you use auth, set <code className="bg-sand-100 dark:bg-gray-700 px-1 rounded">NEXTAUTH_SECRET</code></li>
              </>
            )}
          </ul>
        )}
        <button
          type="button"
          onClick={reset}
          className="w-full bg-charcoal text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
