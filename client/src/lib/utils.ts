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
  
  // First, calculate the total months served using the same logic as calculateTotalSalary
  const totalMonths = (() => {
    const yearsDiff = now.getFullYear() - swornIn.getFullYear();
    const monthsDiff = now.getMonth() - swornIn.getMonth();
    let total = yearsDiff * 12 + monthsDiff;
    if (now.getDate() < swornIn.getDate()) {
      total -= 1;
    }
    return Math.max(0, total);
  })();
  
  // Now distribute these months across years
  const yearCounts = new Map<number, number>();
  
  // Iterate through each completed month and assign it to a year
  const currentDate = new Date(swornIn);
  for (let i = 0; i < totalMonths; i++) {
    const year = currentDate.getFullYear();
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  // Convert to array of breakdown objects
  const breakdown: YearlyBreakdown[] = [];
  const startYear = swornIn.getFullYear();
  const endYear = now.getFullYear();
  
  for (let year = startYear; year <= endYear; year++) {
    const monthsServed = yearCounts.get(year) || 0;
    const amount = monthsServed * monthlySalary;
    breakdown.push({
      year,
      monthsServed,
      amount,
    });
  }
  
  return breakdown;
}

export function getPublicationName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Map common Malaysian news sources
    if (hostname.includes('thestar.com.my')) return 'The Star';
    if (hostname.includes('nst.com.my')) return 'New Straits Times';
    if (hostname.includes('malaymail.com')) return 'Malay Mail';
    if (hostname.includes('bernama.com')) return 'Bernama';
    if (hostname.includes('freemalaysiatoday.com')) return 'Free Malaysia Today';
    if (hostname.includes('astroawani.com')) return 'Astro Awani';
    if (hostname.includes('malaysiakini.com')) return 'Malaysiakini';
    if (hostname.includes('theedgemarkets.com')) return 'The Edge Markets';
    if (hostname.includes('usnews.com')) return 'U.S. News';
    if (hostname.includes('benarnews.org')) return 'BenarNews';
    
    // Default: capitalize first letter of domain
    const domain = hostname.replace('www.', '').split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'External Source';
  }
}
