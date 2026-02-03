"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateFilterOption = "all-time" | "this-month" | "last-30" | "last-60" | "custom";

interface DateFilterProps {
  value: DateFilterOption;
  onChange: (option: DateFilterOption, startDate?: Date, endDate?: Date) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const getDateRange = (option: DateFilterOption): { start: Date | null; end: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (option) {
      case "all-time":
        return { start: null, end: null };
      case "this-month":
        return {
          start: new Date(today.getFullYear(), today.getMonth(), 1),
          end: today,
        };
      case "last-30":
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: today,
        };
      case "last-60":
        return {
          start: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
          end: today,
        };
      case "custom":
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const handleOptionSelect = (option: DateFilterOption) => {
    if (option === "custom") {
      setShowCustomInputs(true);
      return;
    }
    setShowCustomInputs(false);
    const { start, end } = getDateRange(option);
    onChange(option, start || undefined, end || undefined);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      onChange("custom", new Date(customStartDate), new Date(customEndDate));
      setIsOpen(false);
      setShowCustomInputs(false);
    }
  };

  const getDisplayText = () => {
    switch (value) {
      case "all-time":
        return "All Time";
      case "this-month":
        return "This Month";
      case "last-30":
        return "Last 30 Days";
      case "last-60":
        return "Last 60 Days";
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return "Custom Range";
      default:
        return "All Time";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-sand-200 dark:border-gray-700 rounded-lg text-sm font-medium text-charcoal dark:text-white hover:bg-sand-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Calendar size={16} />
        <span>{getDisplayText()}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowCustomInputs(false);
            }}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border border-sand-200 dark:border-gray-700 shadow-lg z-20 overflow-hidden">
            <div className="p-2">
              <button
                onClick={() => handleOptionSelect("all-time")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === "all-time"
                    ? "bg-sage-light text-sage font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => handleOptionSelect("this-month")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === "this-month"
                    ? "bg-sage-light text-sage font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => handleOptionSelect("last-30")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === "last-30"
                    ? "bg-sage-light text-sage font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handleOptionSelect("last-60")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === "last-60"
                    ? "bg-sage-light text-sage font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700"
                }`}
              >
                Last 60 Days
              </button>
              <button
                onClick={() => handleOptionSelect("custom")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === "custom"
                    ? "bg-sage-light text-sage font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-sand-50 dark:hover:bg-gray-700"
                }`}
              >
                Custom Range
              </button>
            </div>

            {showCustomInputs && (
              <div className="border-t border-sand-200 dark:border-gray-700 p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-sand-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-700 text-charcoal dark:text-white focus:outline-none focus:border-sage dark:focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-sand-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-700 text-charcoal dark:text-white focus:outline-none focus:border-sage dark:focus:border-sage"
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
