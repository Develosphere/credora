/**
 * Property-based tests for route protection middleware
 *
 * **Feature: nextjs-frontend, Property 2: Route Protection Enforcement**
 * **Validates: Requirements 2.1**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isPublicRoute,
  isAuthRoute,
  isProtectedRoute,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTE_PREFIX,
} from "@/middleware";

describe("Route Protection Middleware Properties", () => {
  /**
   * Property: All defined public routes are recognized as public
   * For any route in PUBLIC_ROUTES, isPublicRoute should return true
   */
  it("should recognize all defined public routes as public", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PUBLIC_ROUTES), (route) => {
        return isPublicRoute(route) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All defined auth routes are recognized as auth routes
   * For any route in AUTH_ROUTES, isAuthRoute should return true
   */
  it("should recognize all defined auth routes as auth routes", () => {
    fc.assert(
      fc.property(fc.constantFrom(...AUTH_ROUTES), (route) => {
        return isAuthRoute(route) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All protected route prefixes are recognized as protected
   * For any route starting with a protected prefix, isProtectedRoute should return true
   */
  it("should recognize all protected route prefixes as protected", () => {
    const protectedRouteArb = fc.tuple(
      fc.constantFrom(...PROTECTED_ROUTE_PREFIX),
      fc.oneof(
        fc.constant(""),
        fc.constant("/"),
        fc.constant("/sub"),
        fc.constant("/sub/path"),
        fc.stringMatching(/^\/[a-z0-9-]+$/)
      )
    ).map(([prefix, suffix]) => prefix + suffix);

    fc.assert(
      fc.property(protectedRouteArb, (route) => {
        return isProtectedRoute(route) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Random non-matching routes are not protected
   * For any route that doesn't start with a protected prefix, isProtectedRoute should return false
   */
  it("should not recognize random routes as protected", () => {
    const nonProtectedRouteArb = fc.stringMatching(/^\/[a-z]{1,5}$/).filter(
      (route) =>
        !PROTECTED_ROUTE_PREFIX.some((prefix) => route.startsWith(prefix)) &&
        !PUBLIC_ROUTES.includes(route)
    );

    fc.assert(
      fc.property(nonProtectedRouteArb, (route) => {
        return isProtectedRoute(route) === false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Auth routes are a subset of public routes
   * For any auth route, it should also be a public route
   */
  it("should have auth routes as a subset of public routes", () => {
    fc.assert(
      fc.property(fc.constantFrom(...AUTH_ROUTES), (route) => {
        return PUBLIC_ROUTES.includes(route);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Protected routes and public routes are mutually exclusive
   * For any protected route, it should not be a public route
   */
  it("should have protected routes and public routes be mutually exclusive", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PROTECTED_ROUTE_PREFIX), (prefix) => {
        return !PUBLIC_ROUTES.includes(prefix);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Route classification is deterministic
   * For any route, calling the classification functions multiple times should return the same result
   */
  it("should have deterministic route classification", () => {
    const routeArb = fc.oneof(
      fc.constantFrom(...PUBLIC_ROUTES),
      fc.constantFrom(...AUTH_ROUTES),
      fc.constantFrom(...PROTECTED_ROUTE_PREFIX),
      fc.stringMatching(/^\/[a-z0-9-]{1,20}(\/[a-z0-9-]{1,10})?$/)
    );

    fc.assert(
      fc.property(routeArb, (route) => {
        const publicResult1 = isPublicRoute(route);
        const publicResult2 = isPublicRoute(route);
        const authResult1 = isAuthRoute(route);
        const authResult2 = isAuthRoute(route);
        const protectedResult1 = isProtectedRoute(route);
        const protectedResult2 = isProtectedRoute(route);

        return (
          publicResult1 === publicResult2 &&
          authResult1 === authResult2 &&
          protectedResult1 === protectedResult2
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dashboard route is always protected
   * The /dashboard route and any sub-routes should always be protected
   */
  it("should always protect dashboard routes", () => {
    const dashboardRouteArb = fc.oneof(
      fc.constant("/dashboard"),
      fc.constant("/dashboard/"),
      fc.stringMatching(/^\/dashboard\/[a-z0-9-]+$/)
    );

    fc.assert(
      fc.property(dashboardRouteArb, (route) => {
        return isProtectedRoute(route) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Login and signup routes are always auth routes
   * The /login and /signup routes should always be recognized as auth routes
   */
  it("should always recognize login and signup as auth routes", () => {
    fc.assert(
      fc.property(fc.constantFrom("/login", "/signup"), (route) => {
        return isAuthRoute(route) === true && isPublicRoute(route) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Root route is public but not protected
   * The root route "/" should be public and not protected
   */
  it("should have root route as public and not protected", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isProtectedRoute("/")).toBe(false);
  });
});
