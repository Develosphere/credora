/**
 * Property-based test for Error Recovery Without Reload
 * 
 * **Feature: voice-controlled-cfo, Property 23: Error Recovery Without Reload**
 * **Validates: Requirements NFR-2.4**
 * 
 * For any voice error state, the user should be able to retry voice operations
 * without requiring a page reload. This test verifies that:
 * 
 * 1. clearError() method successfully clears error states
 * 2. After clearing an error, voice input can be restarted
 * 3. Error recovery works for all error types
 * 4. Multiple error/recovery cycles work without page reload
 * 5. Error state doesn't persist after successful recovery
 * 
 * IMPORTANT: This property test runs with minimum 100 iterations to ensure
 * error recovery behavior is consistent across all scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceInput } from "@/lib/voice/useVoiceInput";
import type { VoiceError } from "@/lib/voice/types";

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

  simulateError(errorType: string) {
    if (this.onerror) {
      this.onerror({
        error: errorType,
        message: `${errorType} error`,
      } as SpeechRecognitionErrorEvent);
    }
  }
}

describe("Property 23: Error Recovery Without Reload", () => {
  let mockRecognitionInstance: MockSpeechRecognition;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mock SpeechRecognition
    mockRecognitionInstance = new MockSpeechRecognition();

    const MockConstructor = function (this: any) {
      return mockRecognitionInstance;
    } as any;

    // @ts-expect-error - Mocking browser API
    global.SpeechRecognition = MockConstructor;
    // @ts-expect-error - Mocking browser API
    global.webkitSpeechRecognition = MockConstructor;

    // Mock navigator.mediaDevices.getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: vi.fn(),
        },
      ],
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
      writable: true,
    });

    // Mock navigator.userAgent
    Object.defineProperty(global.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Core Property Test: clearError() successfully clears error state
   * 
   * This is the fundamental property - after calling clearError(),
   * the error state should be null and the system should be ready
   * for a new attempt.
   */
  it("should clear error state when clearError() is called", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "no-speech",
          "aborted",
          "audio-capture",
          "network"
        ),
        async (errorType) => {
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
          const onError = vi.fn();
          const { result, unmount } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          try {
            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            }, { timeout: 500 });

            // Simulate error
            act(() => {
              localMock.simulateError(errorType);
            });

            // Wait for error to be set
            await waitFor(() => {
              expect(result.current.error).not.toBe(null);
            }, { timeout: 500 });

            // Clear the error
            act(() => {
              result.current.clearError();
            });

            // Error should be cleared
            await waitFor(() => {
              expect(result.current.error).toBe(null);
            }, { timeout: 500 });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Voice input can be restarted after error recovery
   * 
   * Verifies that after clearing an error, the user can successfully
   * restart voice input without any issues.
   */
  it("should allow restarting voice input after clearing error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "no-speech",
          "aborted",
          "audio-capture",
          "network"
        ),
        async (errorType) => {
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
          const onError = vi.fn();
          const { result, unmount } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          try {
            // Start listening
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
            }, { timeout: 500 });

            // Simulate error
            act(() => {
              localMock.simulateError(errorType);
            });

            // Wait for error state
            await waitFor(() => {
              expect(result.current.error).not.toBe(null);
              expect(result.current.isListening).toBe(false);
            }, { timeout: 500 });

            // Clear the error
            act(() => {
              result.current.clearError();
            });

            await waitFor(() => {
              expect(result.current.error).toBe(null);
            }, { timeout: 500 });

            // Should be able to restart
            await act(async () => {
              await result.current.startListening();
            });

            // Should successfully restart
            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
              expect(result.current.error).toBe(null);
            }, { timeout: 500 });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Multiple error/recovery cycles work without reload
   * 
   * Verifies that users can go through multiple error and recovery cycles
   * without needing to reload the page. This is critical for a good UX.
   */
  it("should handle multiple error/recovery cycles without reload", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Number of error/recovery cycles
        fc.constantFrom("no-speech", "aborted", "network"),
        async (numCycles, errorType) => {
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
          const onError = vi.fn();
          const { result, unmount } = renderHook(() =>
            useVoiceInput({ onTranscript, onError })
          );

          try {
            for (let i = 0; i < numCycles; i++) {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 500 });

              // Simulate error
              act(() => {
                localMock.simulateError(errorType);
              });

              // Wait for error state
              await waitFor(() => {
                expect(result.current.error).not.toBe(null);
                expect(result.current.isListening).toBe(false);
              }, { timeout: 500 });

              // Clear the error
              act(() => {
                result.current.clearError();
              });

              // Error should be cleared
              await waitFor(() => {
                expect(result.current.error).toBe(null);
              }, { timeout: 500 });
            }

            // After all cycles, should still be able to start
            await act(async () => {
              await result.current.startListening();
            });

            await waitFor(() => {
              expect(result.current.isListening).toBe(true);
              expect(result.current.error).toBe(null);
            }, { timeout: 500 });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Error state doesn't persist after successful recovery
   * 
   * Verifies th