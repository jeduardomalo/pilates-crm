import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  className?: string;
}

export function MetricCard({ title, value, trend, className }: MetricCardProps) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 p-6 rounded-xl border border-sand-200 dark:border-gray-700 shadow-sm", className)}>
      <h3 className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium mb-2">{title}</h3>
      <div className="flex items-baseline">
        <span className="font-serif text-3xl text-charcoal dark:text-white">{value}</span>
      </div>
    </div>
  );
}
