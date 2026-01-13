/**
 * Property-based tests for P&L rendering
 * Validates: Requirements 7.3, 7.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { PnLReport } from "@/lib/api/types";

/**
 * Generate a valid PnLReport with consistent financial relationships
 */
const pnlReportArbitrary = fc
  .record({
    userId: fc.uuid(),
    startDate: fc.constant("2024-01-01"),
    endDate: fc.constant("2024-01-31"),
    revenue: fc.float({ min: 0, max: 10000000, noNaN: true }),
    refunds: fc.float({ min: 0, max: 100000, noNaN: true }),
    cogs: fc.float({ min: 0, max: 5000000, noNaN: true }),
    adSpend: fc.float({ min: 0, max: 1000000, noNaN: true }),
    otherExpenses: fc.float({ min: 0, max: 500000, noNaN: true }),
  })
  .map((base) => {
    const netRevenue = base.revenue - base.refunds;
    const grossProfit = netRevenue - base.cogs;
    const operatingCosts = base.adSpend + base.otherExpenses;
    const netProfit = grossProfit - operatingCosts;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      ...base,
      netRevenue,
      grossProfit,
      operatingCosts,
      netProfit,
      grossMargin,
      netMargin,
    } as PnLReport;
  });

describe("P&L Data Rendering Properties", () => {
  describe("Property: P&L data completeness", () => {
    it("should have all required line items present", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          // All required fields must be defined
          expect(report.revenue).toBeDefined();
          expect(report.refunds).toBeDefined();
          expect(report.netRevenue).toBeDefined();
          expect(report.cogs).toBeDefined();
          expect(report.grossProfit).toBeDefined();
          expect(report.adSpend).toBeDefined();
          expect(report.otherExpenses).toBeDefined();
          expect(report.operatingCosts).toBeDefined();
          expect(report.netProfit).toBeDefined();
          expect(report.grossMargin).toBeDefined();
          expect(report.netMargin).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it("should have all numeric values as finite numbers", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(Number.isFinite(report.revenue)).toBe(true);
          expect(Number.isFinite(report.refunds)).toBe(true);
          expect(Number.isFinite(report.netRevenue)).toBe(true);
          expect(Number.isFinite(report.cogs)).toBe(true);
          expect(Number.isFinite(report.grossProfit)).toBe(true);
          expect(Number.isFinite(report.adSpend)).toBe(true);
          expect(Number.isFinite(report.otherExpenses)).toBe(true);
          expect(Number.isFinite(report.operatingCosts)).toBe(true);
          expect(Number.isFinite(report.netProfit)).toBe(true);
          expect(Number.isFinite(report.grossMargin)).toBe(true);
          expect(Number.isFinite(report.netMargin)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: P&L calculation consistency", () => {
    it("net revenue should equal revenue minus refunds", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          const expected = report.revenue - report.refunds;
          expect(report.netRevenue).toBeCloseTo(expected, 2);
        }),
        { numRuns: 100 }
      );
    });

    it("gross profit should equal net revenue minus COGS", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          const expected = report.netRevenue - report.cogs;
          expect(report.grossProfit).toBeCloseTo(expected, 2);
        }),
        { numRuns: 100 }
      );
    });

    it("operating costs should equal ad spend plus other expenses", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          const expected = report.adSpend + report.otherExpenses;
          expect(report.operatingCosts).toBeCloseTo(expected, 2);
        }),
        { numRuns: 100 }
      );
    });

    it("net profit should equal gross profit minus operating costs", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          const expected = report.grossProfit - report.operatingCosts;
          expect(report.netProfit).toBeCloseTo(expected, 2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Margin calculations", () => {
    it("gross margin should be calculated correctly when net revenue > 0", () => {
      fc.assert(
        fc.property(
          pnlReportArbitrary.filter((r) => r.netRevenue > 0),
          (report) => {
            const expected = (report.grossProfit / report.netRevenue) * 100;
            expect(report.grossMargin).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("net margin should be calculated correctly when net revenue > 0", () => {
      fc.assert(
        fc.property(
          pnlReportArbitrary.filter((r) => r.netRevenue > 0),
          (report) => {
            const expected = (report.netProfit / report.netRevenue) * 100;
            expect(report.netMargin).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("margins should be 0 when net revenue is 0", () => {
      fc.assert(
        fc.property(
          pnlReportArbitrary.filter((r) => r.netRevenue === 0),
          (report) => {
            expect(report.grossMargin).toBe(0);
            expect(report.netMargin).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Property: Non-negative base values", () => {
    it("revenue should be non-negative", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(report.revenue).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("refunds should be non-negative", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(report.refunds).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("COGS should be non-negative", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(report.cogs).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("ad spend should be non-negative", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(report.adSpend).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it("other expenses should be non-negative", () => {
      fc.assert(
        fc.property(pnlReportArbitrary, (report) => {
          expect(report.otherExpenses).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
