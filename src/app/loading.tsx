export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-2 border-sand-200 dark:border-gray-600 border-t-charcoal dark:border-t-white rounded-full animate-spin"
          aria-hidden
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    </div>
  );
}
