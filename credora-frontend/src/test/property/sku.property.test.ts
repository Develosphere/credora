/**
 * Property-based tests for SKU table data manipulation (sort/filter)
 *
 * **Feature: nextjs-frontend, Property: Table data manipulation (sort/filter)**
 * **Validates: Requirements 9.4, 9.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sortSKUData, filterSKUData, type SortField, type SortDirection } from "@/components/financial/SKUTable";
import type { SKUAnalysis } from "@/lib/api/types";

/**
 * Arbitrary generator for SKUAnalysis objects
 */
const skuAnalysisArb = fc.record({
  skuId: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  profitPerUnit: fc.double({ min: -1000, max: 1000, noNaN: true }),
  cac: fc.double({ min: 0, max: 500, noNaN: true }),
  refundRate: fc.double({ min: 0, max: 1, noNaN: true }),
  trueRoas: fc.double({ min: 0, max: 20, noNaN: true }),
  inventoryDays: fc.integer({ min: 0, max: 365 }),
  totalRevenue: fc.double({ min: 0, max: 1000000, noNaN: true }),
  totalProfit: fc.double({ min: -100000, max: 500000, noNaN: true }),
});

/**
 * Arbitrary generator for sort fields
 */
const sortFieldArb: fc.Arbitrary<SortField> = fc.constantFrom(
  "name",
  "profitPerUnit",
  "refundRate",
  "trueRoas",
  "inventoryDays",
  "totalRevenue",
  "totalProfit"
);

/**
 * Arbitrary generator for sort direction
 */
const sortDirectionArb: fc.Arbitrary<SortDirection> = fc.constantFrom("asc", "desc");

describe("SKU Table Sorting Properties", () => {
  /**
   * Property: Sorting preserves all elements
   * For any list of SKUs and any sort configuration, sorting should not add or remove elements
   */
  it("should preserve all elements after sorting", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        sortFieldArb,
        sortDirectionArb,
        (skus, field, direction) => {
          const sorted = sortSKUData(skus, field, direction);
          return sorted.length === skus.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting produces correctly ordered results for numeric fields
   * For any list of SKUs sorted by a numeric field, adjacent elements should be in correct order
   */
  it("should produce correctly ordered results for numeric fields", () => {
    const numericFields: SortField[] = [
      "profitPerUnit",
      "refundRate",
      "trueRoas",
      "inventoryDays",
      "totalRevenue",
      "totalProfit",
    ];

    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 2, maxLength: 50 }),
        fc.constantFrom(...numericFields),
        sortDirectionArb,
        (skus, field, direction) => {
          const sorted = sortSKUData(skus, field, direction);

          // Check that adjacent elements are in correct order
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = Number(sorted[i][field]);
            const next = Number(sorted[i + 1][field]);

            if (direction === "asc") {
              if (current > next) return false;
            } else {
              if (current < next) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting by name produces alphabetically ordered results
   * For any list of SKUs sorted by name, adjacent elements should be in correct alphabetical order
   */
  it("should produce alphabetically ordered results for name field", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 2, maxLength: 50 }),
        sortDirectionArb,
        (skus, direction) => {
          const sorted = sortSKUData(skus, "name", direction);

          // Check that adjacent elements are in correct alphabetical order
          for (let i = 0; i < sorted.length - 1; i++) {
            const comparison = sorted[i].name.localeCompare(sorted[i + 1].name);

            if (direction === "asc") {
              if (comparison > 0) return false;
            } else {
              if (comparison < 0) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting is idempotent
   * Sorting the same data twice with the same parameters should produce identical results
   */
  it("should be idempotent", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        sortFieldArb,
        sortDirectionArb,
        (skus, field, direction) => {
          const sorted1 = sortSKUData(skus, field, direction);
          const sorted2 = sortSKUData(sorted1, field, direction);

          // Check that both sorts produce the same order
          for (let i = 0; i < sorted1.length; i++) {
            if (sorted1[i].skuId !== sorted2[i].skuId) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Reversing sort direction reverses the order
   * Sorting ascending then descending should produce reversed order
   */
  it("should reverse order when direction is reversed", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 2, maxLength: 50 }),
        sortFieldArb,
        (skus, field) => {
          const sortedAsc = sortSKUData(skus, field, "asc");
          const sortedDesc = sortSKUData(skus, field, "desc");

          // The first element of asc should be the last of desc (and vice versa)
          // for unique values
          const ascFirst = sortedAsc[0][field];
          const descLast = sortedDesc[sortedDesc.length - 1][field];
          const ascLast = sortedAsc[sortedAsc.length - 1][field];
          const descFirst = sortedDesc[0][field];

          return ascFirst === descLast && ascLast === descFirst;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("SKU Table Filtering Properties", () => {
  /**
   * Property: Empty filter returns all elements
   * For any list of SKUs, filtering with empty string should return all elements
   */
  it("should return all elements when filter is empty", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        fc.constantFrom("", "  ", "\t", "\n"),
        (skus, emptyFilter) => {
          const filtered = filterSKUData(skus, emptyFilter);
          return filtered.length === skus.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering never increases the number of elements
   * For any list of SKUs and any filter, the result should have at most as many elements as the input
   */
  it("should never increase the number of elements", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (skus, filterText) => {
          const filtered = filterSKUData(skus, filterText);
          return filtered.length <= skus.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All filtered results contain the filter text
   * For any non-empty filter, all returned SKUs should have name or skuId containing the filter text
   */
  it("should only return SKUs matching the filter text", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (skus, filterText) => {
          const filtered = filterSKUData(skus, filterText);
          const searchLower = filterText.toLowerCase().trim();

          // All filtered results should contain the search text
          return filtered.every(
            (sku) =>
              sku.name.toLowerCase().includes(searchLower) ||
              sku.skuId.toLowerCase().includes(searchLower)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering is case-insensitive
   * Filtering with uppercase or lowercase should produce the same results
   */
  it("should be case-insensitive", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (skus, filterText) => {
          const filteredLower = filterSKUData(skus, filterText.toLowerCase());
          const filteredUpper = filterSKUData(skus, filterText.toUpperCase());

          // Both should return the same number of results
          return filteredLower.length === filteredUpper.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtering preserves element identity
   * All elements in the filtered result should be present in the original array
   */
  it("should preserve element identity", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 20 }),
        (skus, filterText) => {
          const filtered = filterSKUData(skus, filterText);
          const originalIds = new Set(skus.map((s) => s.skuId));

          // All filtered elements should be from the original array
          return filtered.every((sku) => originalIds.has(sku.skuId));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("SKU Table Combined Sort and Filter Properties", () => {
  /**
   * Property: Sort and filter operations are commutative in terms of final content
   * Filtering then sorting should contain the same elements as sorting then filtering
   */
  it("should produce same elements regardless of operation order", () => {
    fc.assert(
      fc.property(
        fc.array(skuAnalysisArb, { minLength: 0, maxLength: 50 }),
        sortFieldArb,
        sortDirectionArb,
        fc.string({ minLength: 0, maxLength: 10 }),
        (skus, field, direction, filterText) => {
          // Filter then sort
          const filterFirst = sortSKUData(filterSKUData(skus, filterText), field, direction);

          // Sort then filter
          const sortFirst = filterSKUData(sortSKUData(skus, field, direction), filterText);

          // Should have same elements (same length and same skuIds)
          if (filterFirst.length !== sortFirst.length) return false;

          const filterFirstIds = new Set(filterFirst.map((s) => s.skuId));
          return sortFirst.every((s) => filterFirstIds.has(s.skuId));
        }
      ),
      { numRuns: 100 }
    );
  });
});
