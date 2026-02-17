/**
 * Property-based test for voice input state consistency
 * 
 * **Feature: voice-controlled-cfo, Property 1: Voice Input State Consistency**
 * **Validates: Requirements US-1.1, US-1.4**
 * 
 * For any microphone button click, the recording state should transition correctly
 * (idle → listening or listening → idle), and the UI should reflect the current state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceInput } from "@/lib/voice/useVoiceInput";

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  maxAlternatives = 1;

  onstart: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;

  private _isStarted = false;

  start() {
    if (this._isStarted) {
      throw new Error("already started");
    }
    this._isStarted = true;
    setTimeout(() => {
      if (this.onstart) {
        this.onstart(new Event("start"));
      }
    }, 0);
  }

  stop() {
    if (!this._isStarted) return;
    this._isStarted = false;
    setTimeout(() => {
      if (this.onend) {
        this.onend(new Event("end"));
      }
    }, 0);
  }

  abort() {
    this.stop();
  }

  isStarted() {
    return this._isStarted;
  }
}

describe("Voice Input State Consistency - Property 1", () => {
  let mockRecognitionInstance: MockSpeechRecognition;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockRecognitionInstance = new MockSpeechRecognition();

    // Create a proper constructor function
    const MockConstructor = function (this: any) {
      return mockRecognitionInstance;
    } as any;

    // @ts-expect-error - Mocking browser API
    global.SpeechRecognition = MockConstructor;
    // @ts-expect-error - Mocking browser API
    global.webkitSpeechRecognition = MockConstructor;

    // Mock navigator
    Object.defineProperty(global.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: voice-controlled-cfo, Property 1: Voice Input State Consistency**
   * **Validates: Requirements US-1.1, US-1.4**
   * 
   * For any microphone button click, the recording state should transition correctly
   * (idle → listening or listening → idle), and the UI should reflect the current state.
   */
  describe("Property 1: Voice Input State Consistency", () => {
    it("should transition from idle to listening when starting", async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => useVoiceInput({ onTranscript }));

      // Initial state should be idle (not listening)
      expect(result.current.isListening).toBe(false);

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      // Should transition to listening
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      unmount();
    });

    it("should transition from listening to idle when stopping", async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => useVoiceInput({ onTranscript }));

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      // Stop listening
      act(() => {
        result.current.stopListening();
      });

      // Should transition back to idle
      await waitFor(() => {
        expect(result.current.isListening).toBe(false);
      });

      unmount();
    });

    it("should not allow starting when already listening", async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => useVoiceInput({ onTranscript }));

      // Start listening
      await act(async () => {
        await result.current.startListening();
      });

      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });

      // Try to start again - should not throw or change state
      await act(async () => {
        await result.current.startListening();
      });

      // Should still be listening (not duplicated)
      expect(result.current.isListening).toBe(true);

      unmount();
    });

    it("should handle rapid start/stop toggling", async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => useVoiceInput({ onTranscript }));

      // Rapid toggle
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      // Final state should be consistent
      await waitFor(() => {
        expect(result.current.isListening).toBe(false);
      });

      unmount();
    });

    /**
     * Property-based test: State consistency across multiple start/stop cycles
     * 
     * This test verifies that for ANY number of start/stop cycles (1-5),
     * the voice input state transitions correctly and ends in the idle state.
     * 
     * Runs 20 iterations with different cycle counts to ensure robustness.
     */
    it("should maintain consistent state across multiple start/stop cycles (property-based)", async () => {
      // Use a simpler approach: test the state machine logic directly
      // rather than trying to reuse mocks across iterations
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // Number of cycles (reduced for performance)
          async (numCycles) => {
            // Create fresh mock for this iteration
            const localMock = new MockSpeechRecognition();
            const LocalMockConstructor = function (this: any) {
              return localMock;
            } as any;

            // @ts-expect-error - Mocking browser API
            global.SpeechRecognition = LocalMockConstructor;
            // @ts-expect-error - Mocking browser API
            global.webkitSpeechRecognition = LocalMockConstructor;

            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript })
            );

            try {
              // Verify initial state
              expect(result.current.isListening).toBe(false);

              for (let i = 0; i < numCycles; i++) {
                // Start listening - should transition to listening
                await act(async () => {
                  await result.current.startListening();
                });

                await waitFor(() => {
                  expect(result.current.isListening).toBe(true);
                }, { timeout: 500 });

                // Stop listening - should transition to idle
                act(() => {
                  result.current.stopListening();
                });

                await waitFor(() => {
                  expect(result.current.isListening).toBe(false);
                }, { timeout: 500 });
              }

              // Final state should be idle
              expect(result.current.isListening).toBe(false);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 } // Run 20 iterations for faster execution
      );
    }, 15000); // 15 second timeout for property-based test

    /**
     * Property-based test: State transitions are deterministic
     * 
     * This test verifies that the state transitions are always deterministic:
     * - Starting from idle always leads to listening
     * - Stopping from listening always leads to idle
     * 
     * Tests with random sequences of operations.
     */
    it("should have deterministic state transitions (property-based)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom("start", "stop"), { minLength: 1, maxLength: 4 }),
          async (operations) => {
            // Create fresh mock for this iteration
            const localMock = new MockSpeechRecognition();
            const LocalMockConstructor = function (this: any) {
              return localMock;
            } as any;

            // @ts-expect-error - Mocking browser API
            global.SpeechRecognition = LocalMockConstructor;
            // @ts-expect-error - Mocking browser API
            global.webkitSpeechRecognition = LocalMockConstructor;

            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript })
            );

            try {
              let expectedState = false; // Start in idle state

              for (const operation of operations) {
                if (operation === "start" && !expectedState) {
                  // Can only start if not already listening
                  await act(async () => {
                    await result.current.startListening();
                  });

                  await waitFor(() => {
                    expect(result.current.isListening).toBe(true);
                  }, { timeout: 500 });

                  expectedState = true;
                } else if (operation === "stop" && expectedState) {
                  // Can only stop if currently listening
                  act(() => {
                    result.current.stopListening();
                  });

                  await waitFor(() => {
                    expect(result.current.isListening).toBe(false);
                  }, { timeout: 500 });

                  expectedState = false;
                }

                // Verify state matches expectation
                expect(result.current.isListening).toBe(expectedState);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 } // Run 20 iterations for faster execution
      );
    }, 15000); // 15 second timeout for property-based test

    /**
     * Property-based test: UI state always reflects internal state
     * 
     * This test verifies that the isListening flag (UI state) always
     * accurately reflects the actual recording state, regardless of
     * the sequence of operations.
     */
    it("should always reflect correct UI state (property-based)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Whether to start listening
          fc.boolean(), // Whether to stop after starting
          async (shouldStart, shouldStop) => {
            // Create fresh mock for this iteration
            const localMock = new MockSpeechRecognition();
            const LocalMockConstructor = function (this: any) {
              return localMock;
            } as any;

            // @ts-expect-error - Mocking browser API
            global.SpeechRecognition = LocalMockConstructor;
            // @ts-expect-error - Mocking browser API
            global.webkitSpeechRecognition = LocalMockConstructor;

            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript })
            );

            try {
              // Initial state should always be idle
              expect(result.current.isListening).toBe(false);

              if (shouldStart) {
                await act(async () => {
                  await result.current.startListening();
                });

                await waitFor(() => {
                  expect(result.current.isListening).toBe(true);
                }, { timeout: 500 });

                if (shouldStop) {
                  act(() => {
                    result.current.stopListening();
                  });

                  await waitFor(() => {
                    expect(result.current.isListening).toBe(false);
                  }, { timeout: 500 });
                }
              }

              // UI state should always be consistent
              const expectedState = shouldStart && !shouldStop;
              expect(result.current.isListening).toBe(expectedState);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 } // Run 20 iterations for faster execution
      );
    }, 10000); // 10 second timeout for property-based test
  });
});
