/**
 * Copyright by Calmic Sdn Bhd
 */

import type { Mp } from "@shared/schema";

// Standard MP Allowances (in RM) based on official rates
export const ALLOWANCE_RATES = {
  // Monthly Base Salary
  DEWAN_RAKYAT_SALARY: 25700,
  DEWAN_NEGARA_SALARY: 11000,

  // Daily Attendance Allowances (Cumulative from sworn-in date)
  PARLIAMENT_SITTING_PER_DAY: 400,
  GOVERNMENT_MEETING_PER_DAY: 300,
  
  // Monthly Fixed Allowances
  ENTERTAINMENT: 2500,
  SPECIAL_NON_ADMIN_MP: 1500,
  FIXED_TRAVEL: 1500,
  FUEL: 1500,
  TOLL: 300,
  DRIVER: 1500,
  PHONE_BILL: 900,
  
  // Periodic Allowances
  HANDPHONE_PURCHASE: 2000, // Every 2 years
  COMPUTER_PURCHASE: 6000, // One-time
  BLACKTIE_ATTIRE: 1000, // Every 3 years
  CEREMONIAL_ATTIRE: 1500, // One-time
  
  // Travel Allowances
  DOMESTIC_HOTEL_PER_NIGHT: 400,
  DOMESTIC_STIPEND_PER_NIGHT: 100,
  INTERNATIONAL_STIPEND_PER_NIGHT: 170,
  OVERSEAS_FOOD_PER_NIGHT: 340,
} as const;

export interface AllowanceBreakdown {
  // Monthly Fixed
  baseSalary: number;
  entertainment: number;
  specialNonAdmin: number;
  fixedTravel: number;
  fuel: number;
  toll: number;
  driver: number;
  phoneBill: number;
  
  // Cumulative (lifetime from sworn-in date)
  parliamentSittingTotal: number;
  governmentMeetingTotal: number;
  totalCumulativeAttendance: number;
  
  // Totals (recurring only)
  totalMonthlyFixed: number;
  totalMonthly: number;
  totalAnnual: number;
  
  // Additional Info
  isMinister: boolean;
  ministerialPosition?: string;
  daysAttended: number;
  governmentMeetingDays: number;
}

export interface PeriodicAllowances {
  handphonePurchase: number; // Every 2 years
  computerPurchase: number; // One-time
  blacktieAttire: number; // Every 3 years
  ceremonialAttire: number; // One-time
}

export function calculateMpAllowances(
  mp: Mp,
  monthsInYear: number = 12
): AllowanceBreakdown {
  const isMinister = mp.isMinister;

  // Base salary (Dewan Rakyat MPs)
  const baseSalary = ALLOWANCE_RATES.DEWAN_RAKYAT_SALARY;

  // Monthly fixed allowances
  const entertainment = ALLOWANCE_RATES.ENTERTAINMENT;
  const specialNonAdmin = ALLOWANCE_RATES.SPECIAL_NON_ADMIN_MP;
  const fixedTravel = ALLOWANCE_RATES.FIXED_TRAVEL;
  const fuel = ALLOWANCE_RATES.FUEL;
  const toll = ALLOWANCE_RATES.TOLL;
  const driver = ALLOWANCE_RATES.DRIVER;
  const phoneBill = ALLOWANCE_RATES.PHONE_BILL;
  
  // Cumulative allowances based on lifetime attendance (from sworn-in date)
  const parliamentSittingTotal = mp.daysAttended * ALLOWANCE_RATES.PARLIAMENT_SITTING_PER_DAY;
  const governmentMeetingTotal = mp.governmentMeetingDays * ALLOWANCE_RATES.GOVERNMENT_MEETING_PER_DAY;
  const totalCumulativeAttendance = parliamentSittingTotal + governmentMeetingTotal;
  
  // Calculate recurring monthly totals (excluding cumulative attendance)
  const totalMonthlyFixed =
    baseSalary +
    entertainment +
    specialNonAdmin +
    fixedTravel +
    fuel +
    toll +
    driver +
    phoneBill;

  const totalMonthly = totalMonthlyFixed;
  const totalAnnual = totalMonthlyFixed * monthsInYear;

  return {
    baseSalary,
    entertainment,
    specialNonAdmin,
    fixedTravel,
    fuel,
    toll,
    driver,
    phoneBill,
    parliamentSittingTotal,
    governmentMeetingTotal,
    totalCumulativeAttendance,
    totalMonthlyFixed,
    totalMonthly,
    totalAnnual,
    isMinister,
    ministerialPosition: mp.ministerialPosition || undefined,
    daysAttended: mp.daysAttended,
    governmentMeetingDays: mp.governmentMeetingDays,
  };
}

export function calculatePeriodicAllowances(): PeriodicAllowances {
  return {
    handphonePurchase: ALLOWANCE_RATES.HANDPHONE_PURCHASE,
    computerPurchase: ALLOWANCE_RATES.COMPUTER_PURCHASE,
    blacktieAttire: ALLOWANCE_RATES.BLACKTIE_ATTIRE,
    ceremonialAttire: ALLOWANCE_RATES.CEREMONIAL_ATTIRE,
  };
}

export function formatCurrency(amount: number): string {
  return `RM${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function calculateAttendancePercentage(daysAttended: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return Math.round((daysAttended / totalDays) * 100);
}
