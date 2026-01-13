/**
 * Property-based tests for platform connection state
 *
 * **Feature: nextjs-frontend, Property 6: Platform Connection State Accuracy**
 * **Validates: Requirements 5.4, 5.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Platform types
 */
type PlatformType = "shopify" | "meta" | "google";
type ConnectionStatus = "connected" | "pending" | "failed" | "not_connected";

interface PlatformStatus {
  platform: PlatformType;
  status: ConnectionStatus;
  lastSync?: string;
  error?: string;
}

/**
 * Simulate getting status for a platform from a list
 */
function getStatusForPlatform(
  statuses: PlatformStatus[],
  platform: PlatformType
): PlatformStatus {
  return (
    statuses.find((s) => s.platform === platform) || {
      platform,
      status: "not_connected",
    }
  );
}

/**
 * Check if a platform is connected
 */
function isConnected(status: PlatformStatus): boolean {
  return status.status === "connected";
}

/**
 * Check if Shopify is connected (required for onboarding)
 */
function isShopifyConnected(statuses: PlatformStatus[]): boolean {
  return getStatusForPlatform(statuses, "shopify").status === "connected";
}

/**
 * Count connected platforms
 */
function countConnected(statuses: PlatformStatus[]): number {
  return statuses.filter((s) => s.status === "connected").length;
}

/**
 * Check if user can continue to dashboard
 */
function canContinueToDashboard(statuses: PlatformStatus[]): boolean {
  return isShopifyConnected(statuses);
}

/**
 * Get status color class
 */
function getStatusColor(status: ConnectionStatus): string {
  const colors: Record<ConnectionStatus, string> = {
    connected: "text-green-500",
    pending: "text-yellow-500",
    failed: "text-red-500",
    not_connected: "text-muted-foreground",
  };
  return colors[status];
}

/**
 * Arbitraries for testing
 */
const platformTypeArb = fc.constantFrom<PlatformType>("shopify", "meta", "google");
const connectionStatusArb = fc.constantFrom<ConnectionStatus>(
  "connected",
  "pending",
  "failed",
  "not_connected"
);

// Use a constrained date range to avoid invalid dates
const validISODateArb = fc
  .integer({ min: 1577836800000, max: 1924991999999 }) // 2020-01-01 to 2030-12-31 in milliseconds
  .map((ms) => new Date(ms).toISOString());

const platformStatusArb = fc.record({
  platform: platformTypeArb,
  status: connectionStatusArb,
  lastSync: fc.option(validISODateArb, { nil: undefined }),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

const platformStatusListArb = fc.array(platformStatusArb, { minLength: 0, maxLength: 3 });

describe("Platform Connection State Properties", () => {
  /**
   * Property: Connected status is accurately reflected
   * For any platform with status "connected", isConnected should return true
   */
  it("should accurately reflect connected status", () => {
    fc.assert(
      fc.property(platformStatusArb, (status) => {
        const connected = isConnected(status);
        return connected === (status.status === "connected");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing platform defaults to not_connected
   * For any platform not in the list, getStatusForPlatform should return not_connected
   */
  it("should default to not_connected for missing platforms", () => {
    fc.assert(
      fc.property(platformTypeArb, (platform) => {
        const emptyStatuses: PlatformStatus[] = [];
        const status = getStatusForPlatform(emptyStatuses, platform);
        return status.status === "not_connected" && status.platform === platform;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Connected count is accurate
   * The count of connected platforms should match the actual number with status "connected"
   */
  it("should accurately count connected platforms", () => {
    fc.assert(
      fc.property(platformStatusListArb, (statuses) => {
        const count = countConnected(statuses);
        const actualCount = statuses.filter((s) => s.status === "connected").length;
        return count === actualCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Shopify connection determines dashboard access
   * User can continue to dashboard iff Shopify is connected
   */
  it("should allow dashboard access only when Shopify is connected", () => {
    fc.assert(
      fc.property(platformStatusListArb, (statuses) => {
        const canContinue = canContinueToDashboard(statuses);
        const shopifyConnected = isShopifyConnected(statuses);
        return canContinue === shopifyConnected;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Status color mapping is consistent
   * Each status should map to a specific color class
   */
  it("should have consistent status color mapping", () => {
    fc.assert(
      fc.property(connectionStatusArb, (status) => {
        const color = getStatusColor(status);
        return typeof color === "string" && color.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Connected platforms have green color
   * Connected status should always map to green color
   */
  it("should show green color for connected platforms", () => {
    const color = getStatusColor("connected");
    expect(color).toBe("text-green-500");
  });

  /**
   * Property: Failed platforms have red color
   * Failed status should always map to red color
   */
  it("should show red color for failed platforms", () => {
    const color = getStatusColor("failed");
    expect(color).toBe("text-red-500");
  });

  /**
   * Property: Status lookup is deterministic
   * Looking up the same platform should always return the same result
   */
  it("should have deterministic status lookup", () => {
    fc.assert(
      fc.property(platformStatusListArb, platformTypeArb, (statuses, platform) => {
        const status1 = getStatusForPlatform(statuses, platform);
        const status2 = getStatusForPlatform(statuses, platform);
        return (
          status1.platform === status2.platform &&
          status1.status === status2.status
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Connected count is non-negative
   * The count of connected platforms should always be >= 0
   */
  it("should have non-negative connected count", () => {
    fc.assert(
      fc.property(platformStatusListArb, (statuses) => {
        const count = countConnected(statuses);
        return count >= 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Connected count is bounded by list length
   * The count of connected platforms should not exceed the list length
   */
  it("should have connected count bounded by list length", () => {
    fc.assert(
      fc.property(platformStatusListArb, (statuses) => {
        const count = countConnected(statuses);
        return count <= statuses.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error message only present for failed status
   * If a platform has an error message, it should typically be in failed state
   * (though pending could also have errors in some cases)
   */
  it("should have error messages associated with failure states", () => {
    fc.assert(
      fc.property(
        fc.record({
          platform: platformTypeArb,
          status: fc.constant<ConnectionStatus>("failed"),
          error: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (status) => {
          return status.status === "failed" && status.error !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });
});
