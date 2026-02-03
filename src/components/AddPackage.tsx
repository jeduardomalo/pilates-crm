"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addPackage } from "@/app/actions";

interface AddPackageProps {
  clientId: string;
  onSuccess?: () => void;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddPackage({ clientId, onSuccess }: AddPackageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => todayISO());
  const [isPaid, setIsPaid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("clientId", clientId);
      formData.set("classes", String(quantity));
      formData.set("price", price === "" ? "0" : String(parseFloat(price)));
      formData.set("date", date);
      formData.set("isPaid", isPaid ? "true" : "false");
      const result = await addPackage(formData);
      if (result.success) {
        setIsOpen(false);
        setQuantity(1);
        setPrice("");
        setDate(todayISO());
        setIsPaid(true);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to add package");
      }
    } finally {
      setLoading(false);
    }
  };

  const isValidPrice = price === "" || (!isNaN(parseFloat(price)) && parseFloat(price) >= 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-sage text-white rounded-lg text-sm font-medium hover:bg-sage/90 transition-colors"
      >
        <Plus size={14} />
        Add Package
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl border border-sand-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl text-charcoal dark:text-white">Add Class Package</h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setPrice("");
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Number of Classes
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Price Charged
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-sand-200 dark:border-gray-700 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1">
                  This will be recorded as revenue for the package purchase.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-sand-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sage bg-white dark:bg-gray-700 text-charcoal dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-pkg-paid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  disabled={loading}
                  className="accent-sage w-4 h-4 disabled:opacity-50"
                />
                <label htmlFor="add-pkg-paid" className="text-sm text-gray-600 dark:text-gray-300">
                  Mark as Paid
                </label>
              </div>

              {error && (
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPrice("");
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-sand-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isValidPrice}
                  className="flex-1 px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding..." : "Add Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
