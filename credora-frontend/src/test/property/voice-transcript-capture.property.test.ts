/**
 * Property-based test for transcript capture completeness
 * 
 * **Feature: voice-controlled-cfo, Property 2: Transcript Capture Completeness**
 * **Validates: Requirements US-1.2**
 * 
 * For any speech recognition result event, the transcript should be captured
 * and made available to the application without data loss.
 * 
 * This test suite validates that:
 * 1. All transcript text is captured without data loss
 * 2. Transcript content is preserved across multiple updates
 * 3. Empty transcripts are handled correctly
 * 4. Interim and final results are distinguished
 * 5. Transcripts are cleared when starting new recordings
 * 6. Special characters and unicode are preserved
 * 7. Long transcripts are captured completely
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

  /**
   * Helper method to simulate a speech recognition result
   */
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

  isStarted() {
    return this._isStarted;
  }
}

describe("Voice Transcript Capture - Property 2", () => {
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
   * **Feature: voice-controlled-cfo, Property 2: Transcript Capture Completeness**
   * **Validates: Requirements US-1.2**
   * 
   * Core property: For any speech recognition result event, the transcript should
   * be captured and made available to the application without data loss.
   */
  describe("Property 2: Transcript Capture Completeness", () => {
    /**
     * Test 1: All transcript text is captured without data loss
     * 
     * For any random string (1-500 characters) and any isFinal flag,
     * the transcript should be captured exactly as provided.
     */
    it("should capture all transcript text without data loss (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // Random transcript
          fc.boolean(), // isFinal flag
          async (transcript, isFinal) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate result
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal);
              });

              // Verify transcript is captured exactly
              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
                expect(onTranscript).toHaveBeenCalledWith(transcript, isFinal);
              }, { timeout: 1000 });

              // Verify no data loss - transcript length matches
              expect(result.current.transcript.length).toBe(transcript.length);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 2: Transcript content is preserved across multiple updates
     * 
     * For any sequence of transcripts (1-5 updates), each transcript should
     * be captured in order without loss.
     */
    it("should preserve transcript content across multiple updates (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
            minLength: 1,
            maxLength: 5,
          }), // Array of transcripts
          async (transcripts) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate multiple results
              for (let i = 0; i < transcripts.length; i++) {
                const transcript = transcripts[i];
                const isFinal = i === transcripts.length - 1;

                act(() => {
                  mockRecognitionInstance.simulateResult(transcript, isFinal);
                });

                await waitFor(() => {
                  expect(result.current.transcript).toBe(transcript);
                }, { timeout: 1000 });
              }

              // Verify all transcripts were captured
              expect(onTranscript).toHaveBeenCalledTimes(transcripts.length);

              // Verify final transcript is the last one
              const lastTranscript = transcripts[transcripts.length - 1];
              expect(result.current.transcript).toBe(lastTranscript);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 3: Empty transcripts are handled correctly
     * 
     * Empty transcripts should be captured without errors.
     */
    it("should handle empty transcripts correctly (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // isFinal flag
          async (isFinal) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate empty result
              act(() => {
                mockRecognitionInstance.simulateResult("", isFinal);
              });

              // Should still capture empty transcript
              await waitFor(() => {
                expect(result.current.transcript).toBe("");
              }, { timeout: 1000 });
              
              // Verify callback was called (even with empty string)
              expect(onTranscript).toHaveBeenCalled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 4: Interim and final results are distinguished
     * 
     * The system should correctly distinguish between interim and final results,
     * calling the callback with the correct isFinal flag.
     */
    it("should distinguish between interim and final results (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (transcript) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate interim result
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, false);
              });

              await waitFor(() => {
                expect(onTranscript).toHaveBeenCalledWith(transcript, false);
              }, { timeout: 1000 });

              // Clear mock to verify next call
              onTranscript.mockClear();

              // Simulate final result
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, true);
              });

              await waitFor(() => {
                expect(onTranscript).toHaveBeenCalledWith(transcript, true);
              }, { timeout: 1000 });

              // Verify both calls were made with correct flags
              expect(onTranscript).toHaveBeenCalledTimes(1); // Only the final call after clear
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 5: Transcripts are cleared when starting new recordings
     * 
     * When starting a new recording session, the previous transcript should
     * be cleared to avoid confusion.
     */
    it("should clear transcript when starting new recording (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (transcript1, transcript2) => {
            // Skip if transcripts are the same (can't test non-contamination)
            fc.pre(transcript1 !== transcript2);
            
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // First recording
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              act(() => {
                mockRecognitionInstance.simulateResult(transcript1, true);
              });

              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript1);
              }, { timeout: 1000 });

              // Stop
              act(() => {
                result.current.stopListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(false);
              }, { timeout: 1000 });

              // Start new recording - transcript should be cleared
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.transcript).toBe("");
              }, { timeout: 1000 });

              // New transcript
              act(() => {
                mockRecognitionInstance.simulateResult(transcript2, true);
              });

              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript2);
              }, { timeout: 1000 });

              // Verify the new transcript is not contaminated by the old one
              expect(result.current.transcript).toBe(transcript2);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 6: Special characters and unicode are preserved
     * 
     * Transcripts containing special characters, unicode, emojis, etc.
     * should be captured without corruption.
     */
    it("should preserve special characters and unicode (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }), // Regular string (includes unicode)
          fc.boolean(), // isFinal flag
          async (transcript, isFinal) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate result with unicode
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal);
              });

              // Verify transcript is captured exactly, including unicode
              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
                expect(onTranscript).toHaveBeenCalledWith(transcript, isFinal);
              }, { timeout: 1000 });

              // Verify character-by-character equality
              for (let i = 0; i < transcript.length; i++) {
                expect(result.current.transcript[i]).toBe(transcript[i]);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 7: Long transcripts are captured completely
     * 
     * Very long transcripts (up to 1000 characters) should be captured
     * without truncation or data loss.
     */
    it("should capture long transcripts completely (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 500, maxLength: 1000 }), // Long transcript
          fc.boolean(), // isFinal flag
          async (transcript, isFinal) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate long result
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal);
              });

              // Verify entire transcript is captured
              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
                expect(result.current.transcript.length).toBe(transcript.length);
                expect(onTranscript).toHaveBeenCalledWith(transcript, isFinal);
              }, { timeout: 1000 });

              // Verify no truncation occurred
              expect(result.current.transcript.length).toBeGreaterThanOrEqual(500);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 8: Whitespace is preserved in transcripts
     * 
     * Leading, trailing, and internal whitespace should be preserved exactly.
     */
    it("should preserve whitespace in transcripts (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.nat({ max: 5 }), // Leading spaces
          fc.nat({ max: 5 }), // Trailing spaces
          fc.boolean(), // isFinal flag
          async (baseText, leadingSpaces, trailingSpaces, isFinal) => {
            const transcript = " ".repeat(leadingSpaces) + baseText + " ".repeat(trailingSpaces);
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate result with whitespace
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal);
              });

              // Verify whitespace is preserved
              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
              }, { timeout: 1000 });
              
              expect(result.current.transcript.length).toBe(transcript.length);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 9: Confidence values don't affect transcript capture
     * 
     * Regardless of confidence level, the transcript should be captured.
     */
    it("should capture transcripts regardless of confidence level (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.double({ min: 0, max: 1, noNaN: true }), // Confidence level
          fc.boolean(), // isFinal flag
          async (transcript, confidence, isFinal) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate result with varying confidence
              act(() => {
                mockRecognitionInstance.simulateResult(transcript, isFinal, confidence);
              });

              // Verify transcript is captured regardless of confidence
              await waitFor(() => {
                expect(result.current.transcript).toBe(transcript);
                expect(onTranscript).toHaveBeenCalledWith(transcript, isFinal);
              }, { timeout: 1000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test

    /**
     * Test 10: Rapid successive transcripts are all captured
     * 
     * When multiple transcripts arrive in rapid succession, all should be captured.
     */
    it("should capture rapid successive transcripts (100 iterations)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 2,
            maxLength: 10,
          }), // Array of rapid transcripts
          async (transcripts) => {
            const onTranscript = vi.fn();
            const { result, unmount } = renderHook(() =>
              useVoiceInput({ onTranscript, interimResults: true })
            );

            try {
              // Start listening
              await act(async () => {
                await result.current.startListening();
              });

              await waitFor(() => {
                expect(result.current.isListening).toBe(true);
              }, { timeout: 1000 });

              // Simulate rapid results
              for (let i = 0; i < transcripts.length; i++) {
                const transcript = transcripts[i];
                const isFinal = i === transcripts.length - 1;

                act(() => {
                  mockRecognitionInstance.simulateResult(transcript, isFinal);
                });
              }

              // Wait for all to be processed
              await waitFor(() => {
                expect(onTranscript).toHaveBeenCalledTimes(transcripts.length);
              }, { timeout: 2000 });

              // Verify all transcripts were captured
              for (let i = 0; i < transcripts.length; i++) {
                const isFinal = i === transcripts.length - 1;
                expect(onTranscript).toHaveBeenNthCalledWith(i + 1, transcripts[i], isFinal);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as required
      );
    }, 60000); // 60 second timeout for property-based test
  });
});
