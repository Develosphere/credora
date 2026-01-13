/**
 * Property-based tests for Insights priority ordering
 *
 * **Feature: nextjs-frontend, Property: Insights priority ordering**
 * **Validates: Requirements 13.4**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sortInsightsByPriority } from "@/lib/hooks/useInsights";
import {
  getImpactIndicator,
  getCategoryBadge,
  getRelatedPageLink,
} from "@/components/financial/InsightCard";
import type { Insight } from "@/lib/api/types";

/**
 * Arbitrary generator for impact values
 */
const impactArb: fc.Arbitrary<Insight["impact"]> = fc.constantFrom(
  "high",
  "medium",
  "low"
);

/**
 * Arbitrary generator for category values
 */
const categoryArb: fc.Arbitrary<Insight["category"]> = fc.constantFrom(
  "revenue",
  "cost",
  "efficiency",
  "risk"
);

/**
 * Arbitrary generator for related page values
 */
const relatedPageArb: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constantFrom("pnl", "forecast", "sku", "sku-analysis", "campaigns", "whatif")
);

/**
 * Arbitrary generator for ISO date strings
 * Using integer timestamps to avoid invalid date issues
 */
const dateArb: fc.Arbitrary<string> = fc
  .integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-12-31").getTime(),
  })
  .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Arbitrary generator for Insight objects
 */
const insightArb: fc.Arbitrary<Insight> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  reasoning: fc.string({ minLength: 1, maxLength: 1000 }),
  impact: impactArb,
  category: categoryArb,
  relatedPage: relatedPageArb,
  dismissed: fc.boolean(),
  createdAt: dateArb,
});

/**
 * Arbitrary generator for arrays of Insight objects
 */
const insightsArrayArb: fc.Arbitrary<Insight[]> = fc.array(insightArb, {
  minLength: 0,
  maxLength: 20,
});

/**
 * Impact priority mapping for verification
 */
const IMPACT_PRIORITY: Record<Insight["impact"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

describe("Insights Priority Ordering Properties", () => {
  /**
   * Property: Sorted insights maintain high > medium > low order
   * For any array of insights, after sorting, all high impact insights
   * should come before medium, and medium before low
   */
  it("should sort insights by impact priority (high > medium > low)", () => {
    fc.assert(
      fc.property(insightsArrayArb, (insights) => {
        const sorted = sortInsightsByPriority(insights);

        // Verify ordering: for each consecutive pair, priority should be non-increasing
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentPriority = IMPACT_PRIORITY[sorted[i].impact];
          const nextPriority = IMPACT_PRIORITY[sorted[i + 1].impact];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting preserves all original insights
   * For any array of insights, sorting should not add or remove any insights
   */
  it("should preserve all insights after sorting", () => {
    fc.assert(
      fc.property(insightsArrayArb, (insights) => {
        const sorted = sortInsightsByPriority(insights);

        // Same length
        expect(sorted.length).toBe(insights.length);

        // All original insights are present
        const originalIds = new Set(insights.map((i) => i.id));
        const sortedIds = new Set(sorted.map((i) => i.id));
        expect(sortedIds).toEqual(originalIds);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting is stable for same impact level (by date)
   * For insights with the same impact, newer insights should come first
   */
  it("should sort by date (newest first) within same impact level", () => {
    fc.assert(
      fc.property(insightsArrayArb, (insights) => {
        const sorted = sortInsightsByPriority(insights);

        // Check that within each impact group, dates are in descending order
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].impact === sorted[i + 1].impact) {
            const currentDate = new Date(sorted[i].createdAt).getTime();
            const nextDate = new Date(sorted[i + 1].createdAt).getTime();
            expect(currentDate).toBeGreaterThanOrEqual(nextDate);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting is idempotent
   * Sorting an already sorted array should produce the same result
   */
  it("should be idempotent", () => {
    fc.assert(
      fc.property(insightsArrayArb, (insights) => {
        const sorted1 = sortInsightsByPriority(insights);
        const sorted2 = sortInsightsByPriority(sorted1);

        // Should produce identical results
        expect(sorted1.map((i) => i.id)).toEqual(sorted2.map((i) => i.id));

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty array returns empty array
   */
  it("should handle empty array", () => {
    const sorted = sortInsightsByPriority([]);
    expect(sorted).toEqual([]);
  });

  /**
   * Property: Single element array returns same element
   */
  it("should handle single element array", () => {
    fc.assert(
      fc.property(insightArb, (insight) => {
        const sorted = sortInsightsByPriority([insight]);
        expect(sorted.length).toBe(1);
        expect(sorted[0].id).toBe(insight.id);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Original array is not mutated
   * Sorting should return a new array without modifying the original
   */
  it("should not mutate the original array", () => {
    fc.assert(
      fc.property(insightsArrayArb, (insights) => {
        const originalIds = insights.map((i) => i.id);
        sortInsightsByPriority(insights);
        const afterIds = insights.map((i) => i.id);

        // Original array should be unchanged
        expect(afterIds).toEqual(originalIds);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe("Impact Indicator Properties", () => {
  /**
   * Property: Impact indicator always returns valid structure
   * For any valid impact value, the indicator should return all required fields
   */
  it("should return valid indicator structure for all impact levels", () => {
    fc.assert(
      fc.property(impactArb, (impact) => {
        const indicator = getImpactIndicator(impact);

        // Should have all required fields
        expect(indicator).toHaveProperty("color");
        expect(indicator).toHaveProperty("bgColor");
        expect(indicator).toHaveProperty("borderColor");
        expect(indicator).toHaveProperty("label");
        expect(indicator).toHaveProperty("icon");

        // String fields should be non-empty
        expect(indicator.color.length).toBeGreaterThan(0);
        expect(indicator.bgColor.length).toBeGreaterThan(0);
        expect(indicator.borderColor.length).toBeGreaterThan(0);
        expect(indicator.label.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Impact indicator is deterministic
   */
  it("should be deterministic", () => {
    fc.assert(
      fc.property(impactArb, (impact) => {
        const indicator1 = getImpactIndicator(impact);
        const indicator2 = getImpactIndicator(impact);

        return (
          indicator1.color === indicator2.color &&
          indicator1.bgColor === indicator2.bgColor &&
          indicator1.borderColor === indicator2.borderColor &&
          indicator1.label === indicator2.label
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different impact levels produce different labels
   */
  it("should produce unique labels for each impact level", () => {
    const highIndicator = getImpactIndicator("high");
    const mediumIndicator = getImpactIndicator("medium");
    const lowIndicator = getImpactIndicator("low");

    expect(highIndicator.label).not.toBe(mediumIndicator.label);
    expect(highIndicator.label).not.toBe(lowIndicator.label);
    expect(mediumIndicator.label).not.toBe(lowIndicator.label);
  });
});

describe("Category Badge Properties", () => {
  /**
   * Property: Category badge always returns valid structure
   */
  it("should return valid badge structure for all categories", () => {
    fc.assert(
      fc.property(categoryArb, (category) => {
        const badge = getCategoryBadge(category);

        expect(badge).toHaveProperty("color");
        expect(badge).toHaveProperty("bgColor");
        expect(badge).toHaveProperty("label");

        expect(badge.color.length).toBeGreaterThan(0);
        expect(badge.bgColor.length).toBeGreaterThan(0);
        expect(badge.label.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Category badge is deterministic
   */
  it("should be deterministic", () => {
    fc.assert(
      fc.property(categoryArb, (category) => {
        const badge1 = getCategoryBadge(category);
        const badge2 = getCategoryBadge(category);

        return (
          badge1.color === badge2.color &&
          badge1.bgColor === badge2.bgColor &&
          badge1.label === badge2.label
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe("Related Page Link Properties", () => {
  /**
   * Property: Known pages return valid links
   */
  it("should return valid links for known pages", () => {
    const knownPages = ["pnl", "forecast", "sku", "sku-analysis", "campaigns", "whatif"];

    for (const page of knownPages) {
      const link = getRelatedPageLink(page);
      expect(link).not.toBeNull();
      expect(link?.href).toBeTruthy();
      expect(link?.label).toBeTruthy();
    }
  });

  /**
   * Property: Undefined returns null
   */
  it("should return null for undefined", () => {
    const link = getRelatedPageLink(undefined);
    expect(link).toBeNull();
  });

  /**
   * Property: Unknown pages return null
   */
  it("should return null for unknown pages", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !["pnl", "forecast", "sku", "sku-analysis", "campaigns", "whatif"].includes(s.toLowerCase())),
        (unknownPage) => {
          const link = getRelatedPageLink(unknownPage);
          return link === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Related page link is deterministic
   */
  it("should be deterministic", () => {
    fc.assert(
      fc.property(relatedPageArb, (relatedPage) => {
        const link1 = getRelatedPageLink(relatedPage);
        const link2 = getRelatedPageLink(relatedPage);

        if (link1 === null && link2 === null) return true;
        if (link1 === null || link2 === null) return false;

        return link1.href === link2.href && link1.label === link2.label;
      }),
      { numRuns: 100 }
    );
  });
});
