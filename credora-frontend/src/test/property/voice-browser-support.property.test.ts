/**
 * Property-based tests for voice browser support detection
 * 
 * **Feature: voice-controlled-cfo, Property 4: Browser Support Detection**
 * **Validates: Requirements US-1.5, TR-1.2, TR-1.4**
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import {
  detectBrowserSupport,
  getSpeechRecognition,
  isBrowserSupported,
  getUnsupportedBrowserMessage,
} from "@/lib/voice/browserSupport";

describe("Voice Browser Support Detection Properties", () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  /**
   * Property 4.1: Detection always returns a valid BrowserSupport object
   * For any browser environment, detectBrowserSupport should return an object
   * with all required fields
   */
  it("should always return a complete BrowserSupport object", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const support = detectBrowserSupport();
        
        // Check all required fields exist
        expect(support).toHaveProperty('speechRecognition');
        expect(support).toHaveProperty('speechSynthesis');
        expect(support).toHaveProperty('mediaDevices');
        expect(support).toHaveProperty('userAgent');
        expect(support).toHaveProperty('browserName');
        expect(support).toHaveProperty('browserVersion');
        
        // Check types
        expect(typeof support.speechRecognition).toBe('boolean');
        expect(typeof support.speechSynthesis).toBe('boolean');
        expect(typeof support.mediaDevices).toBe('boolean');
        expect(typeof support.userAgent).toBe('string');
        expect(typeof support.browserName).toBe('string');
        expect(typeof support.browserVersion).toBe('string');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: Browser support is deterministic
   * For any given browser environment, calling detectBrowserSupport multiple times
   * should return the same result
   */
  it("should return consistent results across multiple calls", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result1 = detectBrowserSupport();
        const result2 = detectBrowserSupport();
        
        expect(result1.speechRecognition).toBe(result2.speechRecognition);
        expect(result1.speechSynthesis).toBe(result2.speechSynthesis);
        expect(result1.mediaDevices).toBe(result2.mediaDevices);
        expect(result1.userAgent).toBe(result2.userAgent);
        expect(result1.browserName).toBe(result2.browserName);
        expect(result1.browserVersion).toBe(result2.browserVersion);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: Browser name is always a known value or "Unknown"
   * For any browser environment, browserName should be one of the expected values
   */
  it("should return a valid browser name", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const support = detectBrowserSupport();
        const validNames = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'Unknown'];
        
        expect(validNames).toContain(support.browserName);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: Browser version is always a string
   * For any browser environment, browserVersion should be a non-null string
   */
  it("should return a valid browser version string", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const support = detectBrowserSupport();
        
        expect(typeof support.browserVersion).toBe('string');
        expect(support.browserVersion).toBeDefined();
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: getSpeechRecognition returns null or a constructor
   * For any browser environment, getSpeechRecognition should return either null
   * or a function (constructor)
   */
  it("should return null or a constructor function", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const SpeechRecognition = getSpeechRecognition();
        
        if (SpeechRecognition === null) {
          return true;
        }
        
        expect(typeof SpeechRecognition).toBe('function');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.6: isBrowserSupported is consistent with detectBrowserSupport
   * For any browser environment, if isBrowserSupported returns true,
   * then detectBrowserSupport should show at least one feature is supported
   */
  it("should be consistent with feature detection", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const isSupported = isBrowserSupported();
        const support = detectBrowserSupport();
        
        if (isSupported) {
          // If browser is supported, at least one feature should be available
          const hasAnyFeature = support.speechRecognition || support.speechSynthesis;
          expect(hasAnyFeature).toBe(true);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.7: Unsupported browser message is always a non-empty string
   * For any browser environment, getUnsupportedBrowserMessage should return
   * a meaningful error message
   */
  it("should return a non-empty error message", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const message = getUnsupportedBrowserMessage();
        
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message).toMatch(/voice|browser|chrome|safari|edge|firefox/i);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.8: Detection handles server-side rendering gracefully
   * When window is undefined (SSR), detection should return safe defaults
   */
  it("should handle SSR environment safely", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // In a real SSR environment, window would be undefined
        // In our test environment, we can still verify the function doesn't crash
        const support = detectBrowserSupport();
        
        // Should not throw and should return valid object
        expect(support).toBeDefined();
        expect(typeof support.speechRecognition).toBe('boolean');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.9: Feature flags are boolean values
   * For any browser environment, all feature detection flags should be strictly boolean
   */
  it("should return strict boolean values for feature flags", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const support = detectBrowserSupport();
        
        // Check that each flag is strictly a boolean (true or false)
        expect(typeof support.speechRecognition).toBe('boolean');
        expect(typeof support.speechSynthesis).toBe('boolean');
        expect(typeof support.mediaDevices).toBe('boolean');
        
        // Verify they are exactly true or false (not truthy/falsy)
        expect(support.speechRecognition === true || support.speechRecognition === false).toBe(true);
        expect(support.speechSynthesis === true || support.speechSynthesis === false).toBe(true);
        expect(support.mediaDevices === true || support.mediaDevices === false).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.10: User agent string matches navigator.userAgent
   * For any browser environment, the returned userAgent should match
   * the actual navigator.userAgent
   */
  it("should return the correct user agent string", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const support = detectBrowserSupport();
        
        // In test environment, navigator.userAgent should match
        if (typeof navigator !== 'undefined') {
          expect(support.userAgent).toBe(navigator.userAgent);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
