/**
 * DriveLegal AI — Currency Utility
 *
 * Centralised Indian Rupee formatting helpers.
 * All monetary values in the platform MUST be displayed using ₹ (Indian Rupee)
 * with Indian number formatting (en-IN locale: 1,25,000 not 125,000).
 *
 * Usage:
 *   import { formatCurrency, formatCurrencyCompact } from '../utils/currency';
 *
 *   formatCurrency(125000)        → "₹1,25,000"
 *   formatCurrency(500)           → "₹500"
 *   formatCurrencyCompact(125000) → "₹1.25L"
 *   formatCurrencyCompact(1500000)→ "₹15L"
 */

const INR_LOCALE = 'en-IN';
const CURRENCY_CODE = 'INR';

/**
 * Formats a number as Indian Rupees with full digit grouping.
 * Returns "₹0" for null/undefined/NaN values instead of crashing.
 *
 * @param {number|string|null|undefined} amount
 * @param {object} [options] - Additional Intl.NumberFormat options
 * @returns {string} e.g. "₹1,25,000"
 */
export const formatCurrency = (amount, options = {}) => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return '₹0';

  return new Intl.NumberFormat(INR_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(num);
};

/**
 * Formats a number as Indian Rupees — compact form for large values.
 * Uses lakh (L) and crore (Cr) shorthands for readability in tight UI spaces.
 *
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "₹1.25L" | "₹2.5Cr" | "₹500"
 */
export const formatCurrencyCompact = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return '₹0';

  if (num >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  }
  if (num >= 100_000) {
    return `₹${(num / 100_000).toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  return `₹${num.toLocaleString(INR_LOCALE)}`;
};

/**
 * Formats a number using Indian locale digit grouping only (no ₹ prefix).
 * Use when the ₹ symbol is already rendered separately in JSX.
 *
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "1,25,000"
 */
export const formatIndianNumber = (amount) => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return '0';
  return num.toLocaleString(INR_LOCALE);
};
