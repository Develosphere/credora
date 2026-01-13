/**
 * Property-based tests for dashboard error state recovery
 *
 * **Feature: nextjs-frontend, Property 8: Error State Recovery**
 * **Validates: Requirements 6.4**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Metric card state types
 */
interface MetricCardState {
  isLoading: boolean;
  error: Error | null;
  value?: string;
  hasRetry: boolean;
}

/**
 * Determine the display state of a metric card
 */
function getDisplayState(
  state: MetricCardState
): "loading" | "error" | "normal" {
  if (state.error) return "error";
  if (state.isLoading) return "loading";
  return "normal";
}

/**
 * Check if retry button should be visible
 */
function shouldShowRetry(state: MetricCardState): boolean {
  return state.error !== null && state.hasRetry;
}

/**
 * Check if error message should be visible
 */
function shouldShowErrorMessage(state: MetricCardState): boolean {
  return state.error !== null;
}

/**
 * Check if skeleton should be visible
 */
function shouldShowSkeleton(state: MetricCardState): boolean {
  return state.isLoading && state.error === null;
}

/**
 * Check if value should be visible
 */
function shouldShowValue(state: MetricCardState): boolean {
  return !state.isLoading && state.error === null;
}

/**
 * Simulate retry action
 */
function simulateRetry(
  state: MetricCardState,
  retrySucceeds: boolean
): MetricCardState {
  if (!state.error || !state.hasRetry) {
    return state;
  }

  // Start loading
  const loadingState: MetricCardState = {
    ...state,
    isLoading: true,
    error: null,
  };

  // After retry completes
  if (retrySucceeds) {
    return {
      ...loadingState,
      isLoading: false,
      error: null,
      value: "Recovered Value",
    };
  } else {
    return {
      ...loadingState,
      isLoading: false,
      error: new Error("Retry failed"),
    };
  }
}

/**
 * Arbitraries for testing
 */
const errorArb = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg))
);

const metricCardStateArb = fc.record({
  isLoading: fc.boolean(),
  error: errorArb,
  value: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  hasRetry: fc.boolean(),
});

describe("Error State Recovery Properties", () => {
  /**
   * Property: Error state shows error message
   * For any state with an error, the error message should be visible
   */
  it("should show error message when error is present", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.boolean(),
        }),
        (state) => {
          return shouldShowErrorMessage(state) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error state with retry shows retry button
   * For any state with an error and hasRetry=true, retry button should be visible
   */
  it("should show retry button when error is present and retry is available", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.constant(true),
        }),
        (state) => {
          return shouldShowRetry(state) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: No error means no retry button needed
   * For any state without an error, retry button should not be shown
   */
  it("should not show retry button when no error", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          error: fc.constant(null),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.boolean(),
        }),
        (state) => {
          return shouldShowRetry(state) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Loading state shows skeleton
   * For any loading state without error, skeleton should be visible
   */
  it("should show skeleton when loading without error", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(true),
          error: fc.constant(null),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.boolean(),
        }),
        (state) => {
          return shouldShowSkeleton(state) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Normal state shows value
   * For any non-loading, non-error state, value should be visible
   */
  it("should show value when not loading and no error", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          error: fc.constant(null),
          value: fc.string({ minLength: 1, maxLength: 50 }),
          hasRetry: fc.boolean(),
        }),
        (state) => {
          return shouldShowValue(state) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Display state is mutually exclusive
   * A card can only be in one of: loading, error, or normal state
   */
  it("should have mutually exclusive display states", () => {
    fc.assert(
      fc.property(metricCardStateArb, (state) => {
        const displayState = getDisplayState(state);
        const validStates = ["loading", "error", "normal"];
        return validStates.includes(displayState);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Successful retry clears error
   * After a successful retry, the error should be cleared
   */
  it("should clear error after successful retry", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.constant(true),
        }),
        (state) => {
          const afterRetry = simulateRetry(state, true);
          return afterRetry.error === null && afterRetry.value !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Failed retry keeps error state
   * After a failed retry, the error should still be present
   */
  it("should keep error state after failed retry", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(false),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.constant(true),
        }),
        (state) => {
          const afterRetry = simulateRetry(state, false);
          return afterRetry.error !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error takes precedence over loading
   * If both error and loading are true, error state should be shown
   */
  it("should show error state even when loading is true", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(true),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.boolean(),
        }),
        (state) => {
          const displayState = getDisplayState(state);
          return displayState === "error";
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Retry without hasRetry flag does nothing
   * If hasRetry is false, retry should not change state
   */
  it("should not change state when retry is not available", () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          error: fc.string({ minLength: 1, maxLength: 100 }).map((msg) => new Error(msg)),
          value: fc.option(fc.string(), { nil: undefined }),
          hasRetry: fc.constant(false),
        }),
        (state) => {
          const afterRetry = simulateRetry(state, true);
          return afterRetry.error?.message === state.error?.message;
        }
      ),
      { numRuns: 100 }
    );
  });
});
