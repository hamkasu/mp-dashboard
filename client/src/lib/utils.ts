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

export interface YearlyBreakdown {
  year: number;
  monthsServed: number;
  amount: number;
}

export function calculateYearlyBreakdown(swornInDate: Date | string, monthlySalary: number): YearlyBreakdown[] {
  const swornIn = new Date(swornInDate);
  const now = new Date();
  const breakdown: YearlyBreakdown[] = [];
  
  const startYear = swornIn.getFullYear();
  const currentYear = now.getFullYear();
  
  for (let year = startYear; year <= currentYear; year++) {
    let monthsServed = 0;
    
    if (year === startYear && year === currentYear) {
      // Same year - calculate months from sworn in to now
      monthsServed = now.getMonth() - swornIn.getMonth();
      if (now.getDate() >= swornIn.getDate()) {
        monthsServed += 1;
      }
    } else if (year === startYear) {
      // First year - calculate months from sworn in to end of year
      monthsServed = 12 - swornIn.getMonth();
      if (swornIn.getDate() > 1) {
        monthsServed -= 1;
      }
      monthsServed += 1; // Include the month they were sworn in
    } else if (year === currentYear) {
      // Current year - calculate months from start of year to now
      monthsServed = now.getMonth() + 1;
      if (now.getDate() < swornIn.getDate()) {
        monthsServed -= 1;
      }
    } else {
      // Full year
      monthsServed = 12;
    }
    
    monthsServed = Math.max(0, monthsServed);
    const amount = monthsServed * monthlySalary;
    
    breakdown.push({
      year,
      monthsServed,
      amount,
    });
  }
  
  return breakdown;
}
