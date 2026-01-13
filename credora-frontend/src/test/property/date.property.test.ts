/**
 * Property-based tests for date range validation
 *
 * **Feature: nextjs-frontend, Property 4: Date Range Validation**
 * **Validates: Requirements 7.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateDateRange,
  isValidDateRange,
  getLastNDays,
  formatDateForAPI,
  getDaysBetween,
} from "@/lib/utils/date";

describe("Date Range Validation Properties", () => {
  /**
   * Property: Valid date ranges pass validation
   * For any date range where end >= start and both are in the past, validation should pass
   */
  it("should pass validation for valid date ranges", () => {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: oneYearAgo, max: now - 1000 }),
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }), // up to 30 days difference
        (startTimestamp, daysDiff) => {
          const startDate = new Date(startTimestamp);
          const endDate = new Date(startTimestamp + daysDiff);

          // Only test if end date is not in the future
          if (endDate > new Date()) {
            return true;
          }

          const result = validateDateRange(startDate, endDate);
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid date ranges fail validation
   * For any date range where end < start, validation should fail
   */
  it("should fail validation when end date is before start date", () => {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: oneYearAgo, max: now }),
        fc.integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 }), // at least 1ms before
        (endTimestamp, daysDiff) => {
          const endDate = new Date(endTimestamp);
          const startDate = new Date(endTimestamp + daysDiff); // start is after end

          const result = validateDateRange(startDate, endDate);
          return (
            result.isValid === false &&
            result.error === "End date must be after start date"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Same start and end date is valid
   * A date range where start equals end should be valid
   */
  it("should accept date ranges where start equals end", () => {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: oneYearAgo, max: now - 24 * 60 * 60 * 1000 }), // at least 1 day ago
        (timestamp) => {
          const date = new Date(timestamp);
          const result = validateDateRange(date, date);
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isValidDateRange is consistent with validateDateRange
   * For any date range, isValidDateRange should return the same as validateDateRange.isValid
   */
  it("should have isValidDateRange consistent with validateDateRange", () => {
    const now = Date.now();
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: twoYearsAgo, max: now }),
        fc.integer({ min: twoYearsAgo, max: now }),
        (timestamp1, timestamp2) => {
          const date1 = new Date(timestamp1);
          const date2 = new Date(timestamp2);

          const validationResult = validateDateRange(date1, date2);
          const booleanResult = isValidDateRange(date1, date2);

          return validationResult.isValid === booleanResult;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: String dates work the same as Date objects
   * Validation should work identically for string and Date inputs
   */
  it("should handle string dates the same as Date objects", () => {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: oneYearAgo, max: now - 24 * 60 * 60 * 1000 }),
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
        (startTimestamp, daysDiff) => {
          const startDate = new Date(startTimestamp);
          const endDate = new Date(startTimestamp + daysDiff);

          // Skip if end date is in the future
          if (endDate > new Date()) {
            return true;
          }

          const startString = startDate.toISOString();
          const endString = endDate.toISOString();

          const resultWithDates = validateDateRange(startDate, endDate);
          const resultWithStrings = validateDateRange(startString, endString);

          return resultWithDates.isValid === resultWithStrings.isValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("getLastNDays Properties", () => {
  /**
   * Property: getLastNDays returns correct number of days
   * For any positive number of days, the range should span approximately that many days
   */
  it("should return a range spanning the specified number of days", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 365 }), (days) => {
        const { startDate, endDate } = getLastNDays(days);
        const actualDays = getDaysBetween(startDate, endDate);

        // Allow for 1 day variance due to time of day
        return actualDays >= days && actualDays <= days + 1;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getLastNDays always returns valid date range
   * The returned range should always pass validation
   */
  it("should always return a valid date range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 365 }), (days) => {
        const { startDate, endDate } = getLastNDays(days);
        return isValidDateRange(startDate, endDate);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getLastNDays end date is today
   * The end date should always be today
   */
  it("should have end date as today", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 365 }), (days) => {
        const { endDate } = getLastNDays(days);
        const today = new Date();

        return (
          endDate.getFullYear() === today.getFullYear() &&
          endDate.getMonth() === today.getMonth() &&
          endDate.getDate() === today.getDate()
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe("formatDateForAPI Properties", () => {
  /**
   * Property: formatDateForAPI returns YYYY-MM-DD format
   * For any valid date, the output should match the ISO date format
   */
  it("should return date in YYYY-MM-DD format", () => {
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(fc.integer({ min: tenYearsAgo, max: now }), (timestamp) => {
        const date = new Date(timestamp);
        const formatted = formatDateForAPI(date);

        // Should match YYYY-MM-DD pattern
        const pattern = /^\d{4}-\d{2}-\d{2}$/;
        return pattern.test(formatted);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: formatDateForAPI is deterministic
   * For any date, calling formatDateForAPI multiple times should return the same result
   */
  it("should be deterministic", () => {
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(fc.integer({ min: tenYearsAgo, max: now }), (timestamp) => {
        const date = new Date(timestamp);
        const result1 = formatDateForAPI(date);
        const result2 = formatDateForAPI(date);

        return result1 === result2;
      }),
      { numRuns: 100 }
    );
  });
});

describe("getDaysBetween Properties", () => {
  /**
   * Property: getDaysBetween is symmetric
   * The number of days between A and B should equal the number between B and A
   */
  it("should be symmetric", () => {
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: tenYearsAgo, max: now }),
        fc.integer({ min: tenYearsAgo, max: now }),
        (timestamp1, timestamp2) => {
          const date1 = new Date(timestamp1);
          const date2 = new Date(timestamp2);

          const days1to2 = getDaysBetween(date1, date2);
          const days2to1 = getDaysBetween(date2, date1);

          return days1to2 === days2to1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getDaysBetween same date is zero
   * The number of days between a date and itself should be 0
   */
  it("should return 0 for same date", () => {
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(fc.integer({ min: tenYearsAgo, max: now }), (timestamp) => {
        const date = new Date(timestamp);
        return getDaysBetween(date, date) === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getDaysBetween is non-negative
   * The result should always be >= 0
   */
  it("should always return non-negative value", () => {
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: tenYearsAgo, max: now }),
        fc.integer({ min: tenYearsAgo, max: now }),
        (timestamp1, timestamp2) => {
          const date1 = new Date(timestamp1);
          const date2 = new Date(timestamp2);

          return getDaysBetween(date1, date2) >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
