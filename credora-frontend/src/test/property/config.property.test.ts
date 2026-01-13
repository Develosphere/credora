/**
 * Property-based tests for environment configuration validation
 * 
 * **Feature: nextjs-frontend, Property: Environment variable validation**
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateEnvConfig, isValidUrl, isValidSecret } from "@/lib/config";

describe("Environment Configuration Validation Properties", () => {
  /**
   * Property: Valid URLs are accepted
   * For any valid HTTP/HTTPS URL, isValidUrl should return true
   */
  it("should accept any valid HTTP or HTTPS URL", () => {
    const validUrlArb = fc.oneof(
      fc.webUrl({ validSchemes: ["http", "https"] }),
      fc.constant("http://localhost:8000"),
      fc.constant("https://api.example.com"),
      fc.constant("http://127.0.0.1:3000")
    );

    fc.assert(
      fc.property(validUrlArb, (url) => {
        return isValidUrl(url) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid URLs are rejected
   * For any string that is not a valid HTTP/HTTPS URL, isValidUrl should return false
   */
  it("should reject invalid URLs", () => {
    const invalidUrlArb = fc.oneof(
      fc.constant(""),
      fc.constant("not-a-url"),
      fc.constant("ftp://example.com"),
      fc.constant("file:///path/to/file"),
      fc.constant("javascript:alert(1)"),
      // Random strings that aren't URLs
      fc.string().filter((s) => {
        try {
          new URL(s);
          return false;
        } catch {
          return true;
        }
      })
    );

    fc.assert(
      fc.property(invalidUrlArb, (url) => {
        return isValidUrl(url) === false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Secrets with sufficient length are accepted
   * For any string with length >= 16, isValidSecret should return true
   */
  it("should accept secrets with at least 16 characters", () => {
    const validSecretArb = fc.string({ minLength: 16, maxLength: 256 });

    fc.assert(
      fc.property(validSecretArb, (secret) => {
        return isValidSecret(secret) === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Secrets with insufficient length are rejected
   * For any string with length < 16, isValidSecret should return false
   */
  it("should reject secrets with less than 16 characters", () => {
    const shortSecretArb = fc.string({ minLength: 0, maxLength: 15 });

    fc.assert(
      fc.property(shortSecretArb, (secret) => {
        return isValidSecret(secret) === false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Complete valid config passes validation
   * For any valid combination of URL and secret, validation should pass
   */
  it("should pass validation when all environment variables are valid", () => {
    const validConfigArb = fc.record({
      PYTHON_API_URL: fc.oneof(
        fc.constant("http://localhost:8000"),
        fc.constant("https://api.example.com")
      ),
      JAVA_ENGINE_URL: fc.oneof(
        fc.constant("http://localhost:8081"),
        fc.constant("https://engine.example.com")
      ),
      NEXTAUTH_SECRET: fc.string({ minLength: 16, maxLength: 64 }),
    });

    fc.assert(
      fc.property(validConfigArb, (env) => {
        const result = validateEnvConfig(env);
        return result.isValid === true && result.errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing required variables fail validation
   * For any config missing a required variable, validation should fail
   */
  it("should fail validation when required variables are missing", () => {
    const missingVarArb = fc.oneof(
      fc.constant({ PYTHON_API_URL: undefined, JAVA_ENGINE_URL: "http://localhost:8081", NEXTAUTH_SECRET: "a-valid-secret-key-here" }),
      fc.constant({ PYTHON_API_URL: "http://localhost:8000", JAVA_ENGINE_URL: undefined, NEXTAUTH_SECRET: "a-valid-secret-key-here" }),
      fc.constant({ PYTHON_API_URL: "http://localhost:8000", JAVA_ENGINE_URL: "http://localhost:8081", NEXTAUTH_SECRET: undefined }),
      fc.constant({ PYTHON_API_URL: undefined, JAVA_ENGINE_URL: undefined, NEXTAUTH_SECRET: undefined })
    );

    fc.assert(
      fc.property(missingVarArb, (env) => {
        const result = validateEnvConfig(env);
        return result.isValid === false && result.errors.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid URLs in config fail validation
   * For any config with invalid URLs, validation should fail
   */
  it("should fail validation when URLs are invalid", () => {
    const invalidUrlConfigArb = fc.oneof(
      fc.constant({ PYTHON_API_URL: "not-a-url", JAVA_ENGINE_URL: "http://localhost:8081", NEXTAUTH_SECRET: "a-valid-secret-key-here" }),
      fc.constant({ PYTHON_API_URL: "http://localhost:8000", JAVA_ENGINE_URL: "invalid", NEXTAUTH_SECRET: "a-valid-secret-key-here" }),
      fc.constant({ PYTHON_API_URL: "ftp://example.com", JAVA_ENGINE_URL: "http://localhost:8081", NEXTAUTH_SECRET: "a-valid-secret-key-here" })
    );

    fc.assert(
      fc.property(invalidUrlConfigArb, (env) => {
        const result = validateEnvConfig(env);
        return result.isValid === false && result.errors.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Short secrets fail validation
   * For any config with a secret shorter than 16 characters, validation should fail
   */
  it("should fail validation when secret is too short", () => {
    const shortSecretConfigArb = fc.record({
      PYTHON_API_URL: fc.constant("http://localhost:8000"),
      JAVA_ENGINE_URL: fc.constant("http://localhost:8081"),
      NEXTAUTH_SECRET: fc.string({ minLength: 1, maxLength: 15 }),
    });

    fc.assert(
      fc.property(shortSecretConfigArb, (env) => {
        const result = validateEnvConfig(env);
        return result.isValid === false && result.errors.some(e => e.includes("NEXTAUTH_SECRET"));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation errors are specific to the invalid field
   * For any invalid config, the error messages should reference the specific invalid field
   */
  it("should provide specific error messages for each invalid field", () => {
    fc.assert(
      fc.property(
        fc.record({
          PYTHON_API_URL: fc.oneof(fc.constant(undefined), fc.constant("invalid")),
          JAVA_ENGINE_URL: fc.constant("http://localhost:8081"),
          NEXTAUTH_SECRET: fc.constant("a-valid-secret-key-here"),
        }),
        (env) => {
          const result = validateEnvConfig(env);
          if (!result.isValid) {
            return result.errors.some(e => e.includes("PYTHON_API_URL"));
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
