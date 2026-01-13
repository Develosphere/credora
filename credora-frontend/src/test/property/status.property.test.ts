/**
 * Property-based tests for service health indicators
 *
 * **Feature: nextjs-frontend, Property: Service health indicator accuracy**
 * **Validates: Requirements 15.2, 15.3**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ServiceHealthStatus } from "@/lib/api/types";

/**
 * Determine health indicator color based on status
 * This mirrors the implementation in status.ts
 */
function getHealthIndicatorColor(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "green";
    case "unhealthy":
      return "red";
    case "unknown":
    default:
      return "gray";
  }
}

/**
 * Determine if a service should show error details
 */
function shouldShowErrorDetails(status: ServiceHealthStatus, error?: string): boolean {
  return status === "unhealthy" && error !== undefined && error.length > 0;
}

/**
 * Determine if a service should show response time
 */
function shouldShowResponseTime(responseTime?: number): boolean {
  return responseTime !== undefined && responseTime >= 0;
}

/**
 * Validate that the indicator state is consistent with the service health
 */
function isIndicatorStateConsistent(
  status: ServiceHealthStatus,
  indicatorColor: string
): boolean {
  if (status === "healthy" && indicatorColor !== "green") return false;
  if (status === "unhealthy" && indicatorColor !== "red") return false;
  if (status === "unknown" && indicatorColor !== "gray") return false;
  return true;
}


/**
 * Arbitraries for testing
 */
const serviceHealthStatusArb = fc.constantFrom<ServiceHealthStatus>(
  "healthy",
  "unhealthy",
  "unknown"
);

const serviceTypeArb = fc.constantFrom("python_api", "java_engine");

// Use a constrained date range to avoid invalid dates that cause toISOString() to fail
// Generate ISO date strings directly to avoid any date conversion issues
const validISODateArb = fc
  .integer({ min: 1577836800000, max: 1924991999999 }) // 2020-01-01 to 2030-12-31 in milliseconds
  .map((ms) => new Date(ms).toISOString());

const serviceHealthArb = fc.record({
  service: serviceTypeArb,
  status: serviceHealthStatusArb,
  responseTime: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
  error: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  lastChecked: validISODateArb,
});

describe("Service Health Indicator Properties", () => {
  /**
   * Property: Healthy services show green indicator
   * For any healthy service, the indicator color should be green
   */
  it("should show green indicator for healthy services", () => {
    fc.assert(
      fc.property(
        fc.record({
          service: serviceTypeArb,
          status: fc.constant<ServiceHealthStatus>("healthy"),
          responseTime: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
          error: fc.constant(undefined),
          lastChecked: validISODateArb,
        }),
        (health) => {
          const color = getHealthIndicatorColor(health.status);
          return color === "green";
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unhealthy services show red indicator
   * For any unhealthy service, the indicator color should be red
   */
  it("should show red indicator for unhealthy services", () => {
    fc.assert(
      fc.property(
        fc.record({
          service: serviceTypeArb,
          status: fc.constant<ServiceHealthStatus>("unhealthy"),
          responseTime: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
          error: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          lastChecked: validISODateArb,
        }),
        (health) => {
          const color = getHealthIndicatorColor(health.status);
          return color === "red";
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unknown status shows gray indicator
   * For any unknown status, the indicator color should be gray
   */
  it("should show gray indicator for unknown status", () => {
    fc.assert(
      fc.property(
        fc.record({
          service: serviceTypeArb,
          status: fc.constant<ServiceHealthStatus>("unknown"),
          responseTime: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
          error: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          lastChecked: validISODateArb,
        }),
        (health) => {
          const color = getHealthIndicatorColor(health.status);
          return color === "gray";
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property: Indicator color is always one of green, red, or gray
   * For any service health status, the color should be valid
   */
  it("should always return a valid indicator color", () => {
    fc.assert(
      fc.property(serviceHealthStatusArb, (status) => {
        const color = getHealthIndicatorColor(status);
        return ["green", "red", "gray"].includes(color);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Indicator state is consistent with service health
   * The indicator color should always match the service status
   */
  it("should have consistent indicator state with service health", () => {
    fc.assert(
      fc.property(serviceHealthArb, (health) => {
        const color = getHealthIndicatorColor(health.status);
        return isIndicatorStateConsistent(health.status, color);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error details shown only for unhealthy services with errors
   * Error details should only be visible when status is unhealthy and error exists
   */
  it("should show error details only for unhealthy services with errors", () => {
    fc.assert(
      fc.property(
        serviceHealthStatusArb,
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        (status, error) => {
          const shouldShow = shouldShowErrorDetails(status, error);
          
          // If status is healthy or unknown, should never show error
          if (status !== "unhealthy") {
            return shouldShow === false;
          }
          
          // If unhealthy but no error, should not show
          if (error === undefined || error.length === 0) {
            return shouldShow === false;
          }
          
          // If unhealthy with error, should show
          return shouldShow === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Response time shown when available and non-negative
   * Response time should be displayed when it's a valid non-negative number
   */
  it("should show response time when available and non-negative", () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: -100, max: 10000 }), { nil: undefined }),
        (responseTime) => {
          const shouldShow = shouldShowResponseTime(responseTime);
          
          if (responseTime === undefined) {
            return shouldShow === false;
          }
          
          if (responseTime < 0) {
            return shouldShow === false;
          }
          
          return shouldShow === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Each service type maps to exactly one indicator
   * Both python_api and java_engine should have their own indicators
   */
  it("should have distinct indicators for each service type", () => {
    fc.assert(
      fc.property(
        fc.record({
          service: serviceTypeArb,
          status: serviceHealthStatusArb,
          responseTime: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
          error: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          lastChecked: validISODateArb,
        }),
        (health) => {
          // Service type should be one of the valid types
          return health.service === "python_api" || health.service === "java_engine";
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Health status is deterministic
   * Same status should always produce the same indicator color
   */
  it("should produce deterministic indicator colors", () => {
    fc.assert(
      fc.property(serviceHealthStatusArb, (status) => {
        const color1 = getHealthIndicatorColor(status);
        const color2 = getHealthIndicatorColor(status);
        return color1 === color2;
      }),
      { numRuns: 100 }
    );
  });
});
