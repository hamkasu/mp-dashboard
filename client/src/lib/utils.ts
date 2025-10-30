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
  const totalMonths = yearsDiff * 12 + monthsDiff;
  
  return totalMonths * monthlySalary;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
