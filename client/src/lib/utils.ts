import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateTotalSalary(swornInDate: Date | string, monthlySalary: number): number {
  const swornIn = new Date(swornInDate);
  const now = new Date();
  
  const yearsDiff = now.getFullYear() - swornIn.getFullYear();
  const monthsDiff = now.getMonth() - swornIn.getMonth();
  let totalMonths = yearsDiff * 12 + monthsDiff;
  
  // If the current day is before the sworn-in day, we haven't completed the current month yet
  if (now.getDate() < swornIn.getDate()) {
    totalMonths -= 1;
  }
  
  // Ensure we never return a negative value
  return Math.max(0, totalMonths) * monthlySalary;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
