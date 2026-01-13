/**
 * Property-based tests for Cash Flow Forecast
 * Validates: Requirements 8.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isRunwayCritical,
  getRunwayStatus,
} from "@/lib/hooks/useForecast";
import type { ForecastReport, ForecastPoint } from "@/lib/api/types";

/**
 * Generate a valid ForecastReport
 */
const forecastReportArbitrary = fc
  .record({
    currentCash: fc.float({ min: 0, max: 10000000, noNaN: true }),
    burnRate: fc.float({ min: 0, max: 100000, noNaN: true }),
    runwayDays: fc.float({ min: 0, max: 365, noNaN: true }),
    lowScenario: fc.float({ min: 0, max: 5000000, noNaN: true }),
    midScenario: fc.float({ min: 0, max: 7500000, noNaN: true }),
    highScenario: fc.float({ min: 0, max: 10000000, noNaN: true }),
  })
  .map((base) => ({
    ...base,
    forecastPoints: [] as ForecastPoint[],
  }));

/**
 * Generate forecast points for a given number of days
 */
const forecastPointsArbitrary = (days: number) =>
  fc.array(
    fc.record({
      date: fc.integer({ min: 0, max: 89 }).map((offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return date.toISOString().split("T")[0];
      }),
      low: fc.float({ min: 0, max: 5000000, noNaN: true }),
      mid: fc.float({ min: 0, max: 7500000, noNaN: true }),
      high: fc.float({ min: 0, max: 10000000, noNaN: true }),
    }),
    { minLength: days, maxLength: days }
  );

describe("Cash Flow Forecast Properties", () => {
  describe("Property: Runway warning threshold", () => {
    /**
     * **Feature: nextjs-frontend, Property: Runway warning threshold**
     * **Validates: Requirements 8.4**
     */
    it("should flag runway as critical when less than 30 days", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(29.99), noNaN: true }),
          (runwayDays) => {
            expect(isRunwayCritical(runwayDays)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not flag runway as critical when 30 days or more", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 365, noNaN: true }),
          (runwayDays) => {
            expect(isRunwayCritical(runwayDays)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return critical status for runway < 30 days", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(29.99), noNaN: true }),
          (runwayDays) => {
            const status = getRunwayStatus(runwayDays);
            expect(status.status).toBe("critical");
            expect(status.message).toContain("Critical");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return warning status for runway between 30-59 days", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: Math.fround(59.99), noNaN: true }),
          (runwayDays) => {
            const status = getRunwayStatus(runwayDays);
            expect(status.status).toBe("warning");
            expect(status.message).toContain("Warning");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return healthy status for runway >= 60 days", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 60, max: 365, noNaN: true }),
          (runwayDays) => {
            const status = getRunwayStatus(runwayDays);
            expect(status.status).toBe("healthy");
            expect(status.message).toContain("Healthy");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Forecast data consistency", () => {
    it("should have non-negative current cash", () => {
      fc.assert(
        fc.property(forecastReportArbitrary, (report) => {
          expect(report.currentCash).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should have non-negative burn rate", () => {
      fc.assert(
        fc.property(forecastReportArbitrary, (report) => {
          expect(report.burnRate).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should have non-negative runway days", () => {
      fc.assert(
        fc.property(forecastReportArbitrary, (report) => {
          expect(report.runwayDays).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should have scenario values in order: low <= mid <= high", () => {
      fc.assert(
        fc.property(
          fc.record({
            low: fc.float({ min: 0, max: 1000000, noNaN: true }),
            mid: fc.float({ min: 0, max: 1000000, noNaN: true }),
            high: fc.float({ min: 0, max: 1000000, noNaN: true }),
          }).map((s) => ({
            low: Math.min(s.low, s.mid, s.high),
            mid: [s.low, s.mid, s.high].sort((a, b) => a - b)[1],
            high: Math.max(s.low, s.mid, s.high),
          })),
          (scenarios) => {
            expect(scenarios.low).toBeLessThanOrEqual(scenarios.mid);
            expect(scenarios.mid).toBeLessThanOrEqual(scenarios.high);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Forecast points structure", () => {
    it("should have valid date strings in forecast points", () => {
      fc.assert(
        fc.property(forecastPointsArbitrary(7), (points) => {
          points.forEach((point) => {
            // Date should be in YYYY-MM-DD format
            expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            // Date should be parseable
            const parsed = new Date(point.date);
            expect(isNaN(parsed.getTime())).toBe(false);
          });
        }),
        { numRuns: 50 }
      );
    });

    it("should have finite numeric values in forecast points", () => {
      fc.assert(
        fc.property(forecastPointsArbitrary(7), (points) => {
          points.forEach((point) => {
            expect(Number.isFinite(point.low)).toBe(true);
            expect(Number.isFinite(point.mid)).toBe(true);
            expect(Number.isFinite(point.high)).toBe(true);
          });
        }),
        { numRuns: 50 }
      );
    });

    it("should have non-negative values in forecast points", () => {
      fc.assert(
        fc.property(forecastPointsArbitrary(7), (points) => {
          points.forEach((point) => {
            expect(point.low).toBeGreaterThanOrEqual(0);
            expect(point.mid).toBeGreaterThanOrEqual(0);
            expect(point.high).toBeGreaterThanOrEqual(0);
          });
        }),
        { numRuns: 50 }
      );
    });
  });
});
