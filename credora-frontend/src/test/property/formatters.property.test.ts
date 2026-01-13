/**
 * Property-based tests for currency and number formatters
 *
 * **Feature: nextjs-frontend, Property 3: Currency Formatting Consistency**
 * **Validates: Requirements 7.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatROAS,
  formatDays,
  parseCurrency,
} from "@/lib/utils/formatters";

describe("Currency Formatting Properties", () => {
  /**
   * Property: Currency formatting always includes currency symbol
   * For any valid number, the formatted output should include a currency symbol
   */
  it("should always include currency symbol in formatted output", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: 1e12, noNaN: true }),
        (value) => {
          const formatted = formatCurrency(value);
          // USD uses $ symbol
          return formatted.includes("$");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Currency formatting always includes exactly two decimal places
   * For any valid number, the formatted output should have exactly two decimal places
   */
  it("should always include exactly two decimal places", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: 1e12, noNaN: true }),
        (value) => {
          const formatted = formatCurrency(value);
          // Check for pattern: digits followed by decimal point and exactly 2 digits
          const decimalMatch = formatted.match(/\.\d{2}(?!\d)/);
          return decimalMatch !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Currency formatting includes thousand separators for large numbers
   * For any number >= 1000, the formatted output should include thousand separators
   */
  it("should include thousand separators for large numbers", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 1e12, noNaN: true }),
        (value) => {
          const formatted = formatCurrency(value);
          // Should contain comma as thousand separator
          return formatted.includes(",");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Currency formatting handles negative values correctly
   * For any negative number, the formatted output should indicate negativity
   */
  it("should handle negative values correctly", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e12, max: -0.01, noNaN: true }),
        (value) => {
          const formatted = formatCurrency(value);
          // Should contain minus sign or be wrapped in parentheses
          return formatted.includes("-") || formatted.includes("(");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Currency formatting handles zero correctly
   * Zero should format as $0.00
   */
  it("should format zero as $0.00", () => {
    const formatted = formatCurrency(0);
    expect(formatted).toBe("$0.00");
  });

  /**
   * Property: Currency formatting handles special values gracefully
   * NaN and Infinity should return a default value
   */
  it("should handle special values gracefully", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
    expect(formatCurrency(Infinity)).toBe("$0.00");
    expect(formatCurrency(-Infinity)).toBe("$0.00");
  });

  /**
   * Property: Round-trip consistency for currency values
   * For any valid number, formatting then parsing should preserve the value (within rounding)
   */
  it("should preserve value through format-parse round trip", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e9, max: 1e9, noNaN: true }),
        (value) => {
          const formatted = formatCurrency(value);
          const parsed = parseCurrency(formatted);
          // Allow for rounding to 2 decimal places
          const rounded = Math.round(value * 100) / 100;
          return Math.abs(parsed - rounded) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Percent Formatting Properties", () => {
  /**
   * Property: Percent formatting always includes percent symbol
   */
  it("should always include percent symbol", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 100, noNaN: true }),
        (value) => {
          const formatted = formatPercent(value);
          return formatted.includes("%");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Percent formatting handles special values gracefully
   */
  it("should handle special values gracefully", () => {
    expect(formatPercent(NaN)).toBe("0.0%");
    expect(formatPercent(Infinity)).toBe("0.0%");
  });
});

describe("Number Formatting Properties", () => {
  /**
   * Property: Number formatting includes thousand separators for large numbers
   */
  it("should include thousand separators for large numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 1e9 }),
        (value) => {
          const formatted = formatNumber(value);
          return formatted.includes(",");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Compact number formatting produces shorter strings
   */
  it("should produce shorter strings in compact mode for large numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 1e12 }),
        (value) => {
          const regular = formatNumber(value);
          const compact = formatCompactNumber(value);
          return compact.length <= regular.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Number formatting handles special values gracefully
   */
  it("should handle special values gracefully", () => {
    expect(formatNumber(NaN)).toBe("0");
    expect(formatNumber(Infinity)).toBe("0");
    expect(formatCompactNumber(NaN)).toBe("0");
  });
});

describe("ROAS Formatting Properties", () => {
  /**
   * Property: ROAS formatting always includes 'x' suffix
   */
  it("should always include x suffix", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (value) => {
          const formatted = formatROAS(value);
          return formatted.endsWith("x");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ROAS formatting always has exactly two decimal places
   */
  it("should always have exactly two decimal places", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (value) => {
          const formatted = formatROAS(value);
          const match = formatted.match(/\d+\.\d{2}x$/);
          return match !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Days Formatting Properties", () => {
  /**
   * Property: Days formatting uses singular for 1 day
   */
  it("should use singular for 1 day", () => {
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(0.5)).toBe("1 day"); // rounds to 1
  });

  /**
   * Property: Days formatting uses plural for other values
   */
  it("should use plural for values other than 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        (value) => {
          const formatted = formatDays(value);
          return formatted.endsWith("days");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Days formatting handles special values gracefully
   */
  it("should handle special values gracefully", () => {
    expect(formatDays(NaN)).toBe("0 days");
    expect(formatDays(Infinity)).toBe("0 days");
  });
});
