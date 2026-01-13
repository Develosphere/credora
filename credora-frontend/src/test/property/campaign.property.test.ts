/**
 * Property-based tests for Campaign data quality indicator
 *
 * **Feature: nextjs-frontend, Property: Campaign data quality indicator**
 * **Validates: Requirements 10.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getDataQualityIndicator } from "@/components/financial/CampaignRanking";
import type { Campaign } from "@/lib/api/types";

/**
 * Arbitrary generator for data quality values
 */
const dataQualityArb: fc.Arbitrary<Campaign["dataQuality"]> = fc.constantFrom(
  "high",
  "medium",
  "low"
);

/**
 * Arbitrary generator for Campaign objects
 */
const campaignArb: fc.Arbitrary<Campaign> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  platform: fc.constantFrom("meta" as const, "google" as const),
  spend: fc.double({ min: 0, max: 100000, noNaN: true }),
  revenue: fc.double({ min: 0, max: 500000, noNaN: true }),
  conversions: fc.integer({ min: 0, max: 10000 }),
  effectiveRoas: fc.double({ min: 0, max: 20, noNaN: true }),
  dataQuality: dataQualityArb,
});

describe("Campaign Data Quality Indicator Properties", () => {
  /**
   * Property: Data quality indicator always returns valid structure
   * For any valid data quality value, the indicator should return all required fields
   */
  it("should return valid indicator structure for all quality levels", () => {
    fc.assert(
      fc.property(dataQualityArb, (quality) => {
        const indicator = getDataQualityIndicator(quality);

        // Should have all required fields
        expect(indicator).toHaveProperty("color");
        expect(indicator).toHaveProperty("bgColor");
        expect(indicator).toHaveProperty("label");
        expect(indicator).toHaveProperty("description");

        // All fields should be non-empty strings
        expect(typeof indicator.color).toBe("string");
        expect(typeof indicator.bgColor).toBe("string");
        expect(typeof indicator.label).toBe("string");
        expect(typeof indicator.description).toBe("string");

        expect(indicator.color.length).toBeGreaterThan(0);
        expect(indicator.bgColor.length).toBeGreaterThan(0);
        expect(indicator.label.length).toBeGreaterThan(0);
        expect(indicator.description.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: High quality should have green styling
   * For high data quality, the indicator should use green color scheme
   */
  it("should use green styling for high quality", () => {
    const indicator = getDataQualityIndicator("high");

    expect(indicator.color).toContain("green");
    expect(indicator.bgColor).toContain("green");
    expect(indicator.label).toBe("High");
  });

  /**
   * Property: Medium quality should have yellow/warning styling
   * For medium data quality, the indicator should use yellow color scheme
   */
  it("should use yellow styling for medium quality", () => {
    const indicator = getDataQualityIndicator("medium");

    expect(indicator.color).toContain("yellow");
    expect(indicator.bgColor).toContain("yellow");
    expect(indicator.label).toBe("Medium");
  });

  /**
   * Property: Low quality should have red/danger styling
   * For low data quality, the indicator should use red color scheme
   */
  it("should use red styling for low quality", () => {
    const indicator = getDataQualityIndicator("low");

    expect(indicator.color).toContain("red");
    expect(indicator.bgColor).toContain("red");
    expect(indicator.label).toBe("Low");
  });

  /**
   * Property: Data quality indicator is deterministic
   * For any data quality value, calling the function multiple times should return identical results
   */
  it("should be deterministic", () => {
    fc.assert(
      fc.property(dataQualityArb, (quality) => {
        const indicator1 = getDataQualityIndicator(quality);
        const indicator2 = getDataQualityIndicator(quality);

        return (
          indicator1.color === indicator2.color &&
          indicator1.bgColor === indicator2.bgColor &&
          indicator1.label === indicator2.label &&
          indicator1.description === indicator2.description
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different quality levels produce different indicators
   * Each quality level should have a unique label
   */
  it("should produce unique labels for each quality level", () => {
    const highIndicator = getDataQualityIndicator("high");
    const mediumIndicator = getDataQualityIndicator("medium");
    const lowIndicator = getDataQualityIndicator("low");

    // All labels should be different
    expect(highIndicator.label).not.toBe(mediumIndicator.label);
    expect(highIndicator.label).not.toBe(lowIndicator.label);
    expect(mediumIndicator.label).not.toBe(lowIndicator.label);
  });

  /**
   * Property: Low quality campaigns should have warning description
   * For low data quality, the description should indicate insufficient data
   */
  it("should indicate insufficient data for low quality", () => {
    const indicator = getDataQualityIndicator("low");

    expect(indicator.description.toLowerCase()).toContain("insufficient");
  });

  /**
   * Property: High quality campaigns should indicate reliable data
   * For high data quality, the description should indicate sufficient/reliable data
   */
  it("should indicate reliable data for high quality", () => {
    const indicator = getDataQualityIndicator("high");

    expect(indicator.description.toLowerCase()).toContain("sufficient");
  });
});

describe("Campaign Data Quality Display Properties", () => {
  /**
   * Property: All campaigns have a displayable quality indicator
   * For any campaign, we should be able to get a valid quality indicator
   */
  it("should provide valid indicator for any campaign", () => {
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const indicator = getDataQualityIndicator(campaign.dataQuality);

        // Should always return a valid indicator
        expect(indicator).toBeDefined();
        expect(indicator.label).toBeDefined();

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Quality indicator color classes are valid Tailwind classes
   * The color and bgColor should follow Tailwind CSS naming conventions
   */
  it("should return valid Tailwind CSS class patterns", () => {
    fc.assert(
      fc.property(dataQualityArb, (quality) => {
        const indicator = getDataQualityIndicator(quality);

        // Color should be a text color class
        expect(indicator.color).toMatch(/^text-\w+-\d+$/);

        // Background color should be a bg color class
        expect(indicator.bgColor).toMatch(/^bg-\w+-\d+$/);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
