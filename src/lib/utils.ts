import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Currency formatter (PHP)
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

// Date formatter
export function formatDate(date?: string | null) {
  if (!date) return "N/A";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

