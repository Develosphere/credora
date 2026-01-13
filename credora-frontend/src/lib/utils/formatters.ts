/**
 * Currency and number formatting utilities
 * Provides consistent formatting for financial values across the application
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface FormatCurrencyOptions {
  currency?: CurrencyCode;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSign?: boolean;
}

/**
 * Format a number as currency
 * Always includes currency symbol, thousand separators, and exactly two decimal places
 */
export function formatCurrency(
  value: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currency = "USD",
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSign = false,
  } = options;

  // Handle special cases
  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    signDisplay: showSign ? "exceptZero" : "auto",
  });

  return formatter.format(value);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(
  value: number,
  options: { decimals?: number; showSign?: boolean } = {}
): string {
  const { decimals = 1, showSign = false } = options;

  // Handle special cases
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? "exceptZero" : "auto",
  });

  // Intl.NumberFormat expects decimal (0.5 = 50%), but we often pass percentage (50 = 50%)
  // So we divide by 100 if the value seems to be a percentage
  const normalizedValue = Math.abs(value) > 1 ? value / 100 : value;

  return formatter.format(normalizedValue);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number,
  options: { decimals?: number; compact?: boolean } = {}
): string {
  const { decimals = 0, compact = false } = options;

  // Handle special cases
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (compact) {
    return formatCompactNumber(value);
  }

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value);
}

/**
 * Format a number in compact notation (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(value: number): string {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return "0";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  return formatter.format(value);
}

/**
 * Format a currency value in compact notation (e.g., $1.2K, $3.4M)
 */
export function formatCompactCurrency(
  value: number,
  currency: CurrencyCode = "USD"
): string {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  return formatter.format(value);
}

/**
 * Format ROAS (Return on Ad Spend) value
 */
export function formatROAS(value: number): string {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return "0.00x";
  }

  return `${value.toFixed(2)}x`;
}

/**
 * Format a number of days
 */
export function formatDays(value: number): string {
  // Handle special cases
  if (!Number.isFinite(value)) {
    return "0 days";
  }

  const rounded = Math.round(value);
  return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}

/**
 * Parse a formatted currency string back to a number
 * Useful for testing round-trip consistency
 */
export function parseCurrency(formatted: string): number {
  // Remove currency symbols, thousand separators, and whitespace
  const cleaned = formatted.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
