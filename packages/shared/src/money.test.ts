import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  formatPaise,
  distributePaiseEqually,
  calculateGstBreakdown
} from './money.js';

describe('Money Utilities (Integer Paise)', () => {
  it('converts rupees to paise accurately without float issues', () => {
    expect(rupeesToPaise(10)).toBe(1000);
    expect(rupeesToPaise(12.5)).toBe(1250);
    expect(rupeesToPaise('1250.75')).toBe(125075);
    expect(rupeesToPaise('₹ 1,500.50')).toBe(150050);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('converts paise to rupees accurately', () => {
    expect(paiseToRupees(1000)).toBe(10);
    expect(paiseToRupees(1250)).toBe(12.5);
    expect(paiseToRupees(BigInt(50000))).toBe(500);
  });

  it('formats paise in Indian Lakh/Crore grouping', () => {
    // ₹1,25,000
    const str = formatPaise(12500000, { currency: 'INR', locale: 'en-IN' });
    expect(str).toContain('1,25,000');
    expect(str).toContain('₹');

    // Negative balance: -₹500
    const neg = formatPaise(-50000, { currency: 'INR', locale: 'en-IN' });
    expect(neg).toContain('-₹500');

    // Decimal paise formatting
    const dec = formatPaise(123456, { currency: 'INR', locale: 'en-IN' });
    expect(dec).toContain('1,234.56');
  });

  it('fairly distributes paise remainder among participants', () => {
    // 100 paise divided among 3 people -> 34, 33, 33
    const split = distributePaiseEqually(100, 3, 0);
    expect(split).toEqual([34, 33, 33]);
    expect(split.reduce((a, b) => a + b, 0)).toBe(100);

    // With rotation offset = 1 -> 33, 34, 33
    const rotated = distributePaiseEqually(100, 3, 1);
    expect(rotated).toEqual([33, 34, 33]);
    expect(rotated.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('calculates GST and service charge breakdown properly', () => {
    // ₹1000 base bill (100,000 paise), 5% GST, 10% service charge
    const breakdown = calculateGstBreakdown(100000, 5, 10);
    expect(breakdown.basePaise).toBe(100000);
    expect(breakdown.serviceChargePaise).toBe(10000); // 10% of 1000 = ₹100
    // Taxable = 110,000 paise
    // CGST = 2.5% of 110,000 = 2,750 paise
    // SGST = 2.5% of 110,000 = 2,750 paise
    expect(breakdown.cgstPaise).toBe(2750);
    expect(breakdown.sgstPaise).toBe(2750);
    expect(breakdown.totalGstPaise).toBe(5500);
    expect(breakdown.totalPaise).toBe(115500);
  });
});
