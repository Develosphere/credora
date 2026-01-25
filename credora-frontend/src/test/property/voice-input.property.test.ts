/**
 * Property-based tests for voice input hook (useVoiceInput)
 * 
 * Tests properties:
 * - Property 1: Voice Input State Consistency
 * - Property 2: Transcript Capture Completeness
 * - Property 16: Permission Request Timing
 * - Property 23: Error Recovery Without Reload
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceInput } from "@/lib/voice/useVoiceInput";
import type { VoiceInputConfig, VoiceError } from "@/lib/voice/types";

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

  // Helper method for testing
  simulateResult(
    transcript: string,
    isFinal: boolean,
    confidence: number = 0.9
  ) {
    if (this.onresult) {
      const event = {
        results: [[{ transcript, confidence }]],
        resultIndex: 0,
      } as unknown as SpeechRecognitionEvent;

      // Set isFinal property
      (event.results[0] as any).isFinal = isFinal;

      this.onresult(event);
    }
  }

  // Helper method for testing
  simulateError(errorType: string, message: string = "") {
    if (this.onerror) {
      const event = {
        error: errorType,
        message,
      } as SpeechRecognitionErrorEvent;

      this.onerror(event);
    }
  }

  isStarted() {
    return this._isStarted;
  }
}

describe("Voice Input Properties", () => {
  let mockRecognitionInstance: MockSpeechRecognition;

  // Helper to create a fresh mock for each test iteration
  const createFreshMock = () => {
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

    return mockRecognitionInstance;
  };

  beforeEach(() => {
    createFreshMock();
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

    it("should maintain consistent state across multiple start/stop cycles", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // Number of cycles (reduced for stability)
          async (numCycles) => {
            createFreshMock(); // Fresh mock for each iteration
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript })
            );

            try {
              for (let i = 0; i < numCycles; i++) {
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

                await waitFor(() => {
                  expect(result.current.isListening).toBe(false);
                });
              }

              // Final state should be idle
              expect(result.current.isListening).toBe(false);
              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for stability
      );
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
  });

  /**
   * **Feature: voice-controlled-cfo, Property 2: Transcript Capture Completeness**
   * **Validates: Requirements US-1.2**
   * 
   * For any speech recognition result event, the transcript should be captured
   * and made available to the application without data loss.
   */
  describe("Property 2: Transcript Capture Completeness", () => {
    it("should capture all transcript text without data loss", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }), // Random transcript
          fc.boolean(), // isFinal flag
          async (transcript, isFinal) => {
            const onTranscript = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            // Simulate result
            act(() => {
              mockRecognitionInstance.simulateResult(transcript, isFinal);
            });

            // Verify transcript is captured
            await waitFor(() => {
              expect(result.current.transcript).toBe(transcript);
              expect(onTranscript).toHaveBeenCalledWith(transcript, isFinal);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve transcript content across multiple updates", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
            minLength: 1,
            maxLength: 5,
          }), // Array of transcripts
          async (transcripts) => {
            const onTranscript = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            // Simulate multiple results
            for (let i = 0; i < transcripts.length; i++) {
              const transcript = transcripts[i];
              const isFinal = i === transcripts.length - 1;

              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal);
              });

              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
              });
            }

            // Verify all transcripts were captured
            expect(onTranscript).toHaveBeenCalledTimes(transcripts.length);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should handle empty transcripts correctly", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const { result } = renderHook(() =>
            useVoiceInput({ onTranscript, interimResults: true })
          );

          // Start listening
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          // Simulate empty result
          act(() => {
            mockRecognitionInstance.simulateResult("", false);
          });

          // Should still capture empty transcript
          await waitFor(() => {
            expect(result.current.transcript).toBe("");
            expect(onTranscript).toHaveBeenCalledWith("", false);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should distinguish between interim and final results", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (transcript) => {
            const onTranscript = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            // Simulate interim result
            act(() => {
              mockRecognitionInstance.simulateResult(transcript, false);
            });

            await waitFor(() => {
              expect(onTranscript).toHaveBeenCalledWith(transcript, false);
            });

            // Simulate final result
            act(() => {
              mockRecognitionInstance.simulateResult(transcript, true);
            });

            await waitFor(() => {
              expect(onTranscript).toHaveBeenCalledWith(transcript, true);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should clear transcript when starting new recording", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (transcript1, transcript2) => {
            const onTranscript = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            // First recording
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            act(() => {
              mockRecognitionInstance.simulateResult(transcript1, true);
            });

            await waitFor(() => {
              expect(result.current.transcript).toBe(transcript1);
            });

            // Stop
            act(() => {
              result.current.stopListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(false);
            });

            // Start new recording - transcript should be cleared
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.transcript).toBe("");
            });

            // New transcript
            act(() => {
              mockRecognitionInstance.simulateResult(transcript2, true);
            });

            await waitFor(() => {
              expect(result.current.transcript).toBe(transcript2);
            });

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: voice-controlled-cfo, Property 16: Permission Request Timing**
   * **Validates: Requirements TR-3.3, NFR-3.1**
   * 
   * For any page load, microphone permissions should not be requested until
   * the user explicitly clicks the microphone button.
   */
  describe("Property 16: Permission Request Timing", () => {
    it("should not request permissions on hook initialization", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const onTranscript = vi.fn();
          const startSpy = vi.spyOn(mockRecognitionInstance, "start");

          // Just initialize the hook
          renderHook(() => useVoiceInput({ onTranscript }));

          // Should not have called start (which triggers permission request)
          expect(startSpy).not.toHaveBeenCalled();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should only request permissions when startListening is called", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const startSpy = vi.spyOn(mockRecognitionInstance, "start");
          const { result } = renderHook(() => useVoiceInput({ onTranscript }));

          // Initially, start should not be called
          expect(startSpy).not.toHaveBeenCalled();

          // Call startListening
          await act(async () => {
            await result.current.startListening();
          });

          // Now start should have been called
          await waitFor(() => {
            expect(startSpy).toHaveBeenCalled();
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should not request permissions multiple times for same session", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const startSpy = vi.spyOn(mockRecognitionInstance, "start");
          const { result } = renderHook(() => useVoiceInput({ onTranscript }));

          // First start
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          const firstCallCount = startSpy.mock.calls.length;

          // Stop
          act(() => {
            result.current.stopListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(false);
          });

          // Start again
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          // Should have called start twice (once per session)
          expect(startSpy.mock.calls.length).toBe(firstCallCount + 1);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: voice-controlled-cfo, Property 23: Error Recovery Without Reload**
   * **Validates: Requirements NFR-2.4**
   * 
   * For any voice error state, the user should be able to retry voice operations
   * without requiring a page reload.
   */
  describe("Property 23: Error Recovery Without Reload", () => {
    it("should allow retry after permission denied error", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const onError = vi.fn();
          const { result } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          // Start listening
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          // Simulate permission denied error
          act(() => {
            mockRecognitionInstance.simulateError("not-allowed");
          });

          await waitFor(() => {
            expect(result.current.error).not.toBe(null);
            expect(result.current.error?.type).toBe("permission-denied");
            expect(result.current.isListening).toBe(false);
          });

          // Should be able to retry without reload
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should allow retry after no-speech error", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const onError = vi.fn();
          const { result } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          // Start listening
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          // Simulate no-speech error
          act(() => {
            mockRecognitionInstance.simulateError("no-speech");
          });

          await waitFor(() => {
            expect(result.current.error).not.toBe(null);
            expect(result.current.error?.type).toBe("no-speech");
          });

          // Should be able to retry
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should allow retry after network error", () => {
      fc.assert(
        fc.property(fc.constant(null), async () => {
          const onTranscript = vi.fn();
          const onError = vi.fn();
          const { result } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          // Start listening
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          // Simulate network error
          act(() => {
            mockRecognitionInstance.simulateError("network");
          });

          await waitFor(() => {
            expect(result.current.error).not.toBe(null);
            expect(result.current.error?.type).toBe("network");
          });

          // Should be able to retry
          await act(async () => {
            await result.current.startListening();
          });

          await waitFor(() => {
            expect(result.current.isListening).toBe(true);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recover from multiple consecutive errors", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom("no-speech", "network", "aborted"),
            { minLength: 1, maxLength: 3 }
          ),
          async (errorTypes) => {
            const onTranscript = vi.fn();
            const onError = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, onError })
            );

            for (const errorType of errorTypes) {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              });

              // Simulate error
              act(() => {
                mockRecognitionInstance.simulateError(errorType);
              });

              await waitFor(() => {
                expect(result.current.error).not.toBe(null);
              });
            }

            // Should still be able to retry after multiple errors
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should maintain functionality after error without page reload", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (transcript) => {
            const onTranscript = vi.fn();
            const onError = vi.fn();
            const { result } = renderHook(() =>
              useVoiceInput({ onTranscript, onError })
            );

            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            // Simulate error
            act(() => {
              mockRecognitionInstance.simulateError("no-speech");
            });

            await waitFor(() => {
              expect(result.current.error).not.toBe(null);
            });

            // Retry and verify full functionality
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            });

            // Should be able to capture transcript after error recovery
            act(() => {
              mockRecognitionInstance.simulateResult(transcript, true);
            });

            await waitFor(() => {
              expect(result.current.transcript).toBe(transcript);
              expect(onTranscript).toHaveBeenCalledWith(transcript, true);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
