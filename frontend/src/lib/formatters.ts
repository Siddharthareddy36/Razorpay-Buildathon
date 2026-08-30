/**
 * Currency and Number Formatting Utilities for Fintech Operations Console
 */

export function formatCompactCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';

  const absVal = Math.abs(val);

  if (absVal >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = val / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }

  if (absVal >= 100000) {
    // 1 Lakh = 100,000
    const lakh = val / 100000;
    return `₹${lakh.toFixed(2)}L`;
  }

  if (absVal >= 1000) {
    const k = val / 1000;
    return `₹${k.toFixed(1)}K`;
  }

  return `₹${val.toLocaleString('en-IN')}`;
}

export function formatExactCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}
