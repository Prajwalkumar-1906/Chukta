/**
 * All money throughout Chukta is stored and calculated as INTEGER paise.
 * 1 Rupee = 100 Paise.
 * Never use floating point numbers for currency amounts.
 */

import { CURRENCY_SYMBOLS, DEFAULT_CURRENCY } from './constants.js';

/**
 * Converts a rupee float/string input from user into integer paise.
 * Example: 1250.50 -> 125050
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise into rupees (number).
 * Example: 125050 -> 1250.5
 */
export function paiseToRupees(paise: number | bigint): number {
  const numeric = typeof paise === 'bigint' ? Number(paise) : paise;
  return numeric / 100;
}

/**
 * Formats integer paise using the Indian numbering system (Lakhs and Crores).
 * Example: 12500000 paise = ₹1,25,000.00 or ₹1,25,000
 */
export function formatPaise(
  paise: number | bigint,
  options: {
    currency?: string;
    showSymbol?: boolean;
    showPaiseIfZero?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    currency = DEFAULT_CURRENCY,
    showSymbol = true,
    showPaiseIfZero = false,
    locale = 'en-IN'
  } = options;

  const rawPaise = typeof paise === 'bigint' ? Number(paise) : paise;
  const isNegative = rawPaise < 0;
  const absPaise = Math.abs(rawPaise);

  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = absPaise % 100;

  // Indian currency formatting for rupees
  let formattedRupees = '';
  try {
    formattedRupees = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0
    }).format(rupeesPart);
  } catch {
    // Fallback manual Indian grouping
    formattedRupees = formatIndianGrouping(rupeesPart);
  }

  let amountStr = formattedRupees;
  if (paisePart > 0 || showPaiseIfZero) {
    amountStr += `.${paisePart.toString().padStart(2, '0')}`;
  }

  const symbol = showSymbol ? (CURRENCY_SYMBOLS[currency] || `${currency} `) : '';
  const prefix = isNegative ? '-' : '';

  return `${prefix}${symbol}${amountStr}`;
}

/**
 * Fallback formatter implementing Indian numbering system (3,2,2,... grouping).
 * e.g., 1234567 -> 12,34,567
 */
function formatIndianGrouping(val: number): string {
  const s = Math.abs(Math.floor(val)).toString();
  if (s.length <= 3) return s;
  const lastThree = s.slice(-3);
  const remaining = s.slice(0, -3);
  const groupedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${groupedRemaining},${lastThree}`;
}

/**
 * Fairly splits an amount in paise among N members with deterministic remainder allocation.
 * If 100 paise is split among 3 members:
 * base = 33 paise, remainder = 1 paise
 * The 1 extra paise is given to the first member (or rotated by offset).
 */
export function distributePaiseEqually(
  totalPaise: number,
  memberCount: number,
  rotationOffset: number = 0
): number[] {
  if (memberCount <= 0) return [];
  const base = Math.floor(totalPaise / memberCount);
  const remainder = totalPaise % memberCount;

  const results = new Array(memberCount).fill(base);
  for (let i = 0; i < remainder; i++) {
    const targetIdx = (rotationOffset + i) % memberCount;
    results[targetIdx] += 1;
  }
  return results;
}

/**
 * Calculates GST components (CGST & SGST) for India.
 * Total GST = CGST (rate/2) + SGST (rate/2).
 */
export function calculateGstBreakdown(
  basePaise: number,
  gstRatePercent: number,
  serviceChargePercent: number = 0
): {
  basePaise: number;
  serviceChargePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalGstPaise: number;
  totalPaise: number;
} {
  const serviceChargePaise = Math.round((basePaise * serviceChargePercent) / 100);
  const taxablePaise = basePaise + serviceChargePaise;

  const halfGstPercent = gstRatePercent / 2;
  const cgstPaise = Math.round((taxablePaise * halfGstPercent) / 100);
  const sgstPaise = Math.round((taxablePaise * halfGstPercent) / 100);
  const totalGstPaise = cgstPaise + sgstPaise;
  const totalPaise = taxablePaise + totalGstPaise;

  return {
    basePaise,
    serviceChargePaise,
    cgstPaise,
    sgstPaise,
    totalGstPaise,
    totalPaise
  };
}
