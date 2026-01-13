/**
 * Date utilities for date range handling and validation
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeStrings {
  startDate: string;
  endDate: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a date range
 * Returns validation result with error message if invalid
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): ValidationResult {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    return { isValid: false, error: "Start date is invalid" };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: "End date is invalid" };
  }

  // Check if end date is after start date
  if (end < start) {
    return { isValid: false, error: "End date must be after start date" };
  }

  // Check if dates are not in the future (for historical data)
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (end > today) {
    return { isValid: false, error: "End date cannot be in the future" };
  }

  return { isValid: true };
}

/**
 * Check if a date range is valid (simple boolean check)
 */
export function isValidDateRange(
  startDate: Date | string,
  endDate: Date | string
): boolean {
  return validateDateRange(startDate, endDate).isValid;
}

/**
 * Get a date range for the last N days
 */
export function getLastNDays(days: number): DateRange {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Get a date range for the last N days as ISO strings
 */
export function getLastNDaysStrings(days: number): DateRangeStrings {
  const { startDate, endDate } = getLastNDays(days);
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate),
  };
}

/**
 * Format a date for API requests (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "Invalid date";
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date range for display (e.g., "Jan 15 - Feb 15, 2024")
 */
export function formatDateRangeForDisplay(
  startDate: Date | string,
  endDate: Date | string
): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Invalid date range";
  }

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Get the number of days between two dates
 */
export function getDaysBetween(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Parse a date string in various formats
 */
export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get preset date ranges
 */
export const DATE_RANGE_PRESETS = {
  last7Days: () => getLastNDays(7),
  last30Days: () => getLastNDays(30),
  last60Days: () => getLastNDays(60),
  last90Days: () => getLastNDays(90),
  thisMonth: () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date();
    return { startDate, endDate };
  },
  lastMonth: () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate, endDate };
  },
  thisYear: () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date();
    return { startDate, endDate };
  },
};
