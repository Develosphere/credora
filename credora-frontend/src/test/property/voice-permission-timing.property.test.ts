/**
 * Property-based test for Permission Request Timing
 * 
 * **Feature: voice-controlled-cfo, Property 16: Permission Request Timing**
 * **Validates: Requirements TR-3.3, NFR-3.1**
 * 
 * For any page load, microphone permissions should not be requested until
 * the user explicitly clicks the microphone button.
 * 
 * This test verifies that:
 * 1. No permission request (getUserMedia) is made on page load/hook initialization
 * 2. Permission request only happens when startListening is explicitly called
 * 3. Permission request timing is consistent across multiple scenarios
 * 4. No background permission requests occur during idle state
 * 
 * IMPORTANT: This property test runs with minimum 100 iterations to ensure
 * the permission timing behavior is consistent across all scenarios.
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
}

describe("Property 16: Permission Request Timing", () => {
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
   * Core Property Test: No permission request on initialization
   * 
   * This is the most critical test - verifying that simply loading the page
   * and initializing the voice input hook does NOT trigger a microphone
   * permission request.
   */
  it("should never request microphone permission on hook initialization", () => {
    fc.assert(
      fc.property(
        fc.record({
          continuous: fc.boolean(),
          interimResults: fc.boolean(),
          language: fc.constantFrom("en-US", "en-GB", "es-ES", "fr-FR"),
        }),
        (config) => {
          const onTranscript = vi.fn();

          // Initialize the hook with various configurations
          const { unmount } = renderHook(() =>
            useVoiceInput({
              onTranscript,
              continuous: config.continuous,
              interimResults: config.interimResults,
              language: config.language,
            })
          );

          // CRITICAL ASSERTION: getUserMedia should NEVER be called on initialization
          const wasNotCalled = mockGetUserMedia.mock.calls.length === 0;

          unmount();
          return wasNotCalled;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Permission only requested on explicit user action
   * 
   * Verifies that permission is ONLY requested when the user explicitly
   * calls startListening (simulating a microphone button click).
   */
  it("should only request permission when startListening is explicitly called", async () => {
    const onTranscript = vi.fn();
    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onTranscript })
    );

    // Initially no permission should be requested
    expect(mockGetUserMedia).not.toHaveBeenCalled();

    // Now user explicitly clicks microphone button
    await act(async () => {
      await result.current.startListening();
    });

    // NOW permission should be requested (exactly once)
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    unmount();
  });

  /**
   * Property Test: No background permission requests
   * 
   * Verifies that no permission requests happen in the background
   * while the hook is idle (not listening).
   */
  it("should not make background permission requests while idle", async () => {
    const onTranscript = vi.fn();
    const { unmount } = renderHook(() => useVoiceInput({ onTranscript }));

    // Wait for idle time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // No permission requests should have been made
    expect(mockGetUserMedia).not.toHaveBeenCalled();

    unmount();
  });

  /**
   * Property Test: Permission request count consistency
   * 
   * Verifies that permission is requested exactly once per startListening call,
   * and not duplicated or called multiple times unexpectedly.
   * 
   * This is a critical property - each explicit user action (button click)
   * should result in exactly one permission request, no more, no less.
   */
  it("should request permission exactly once per startListening call", async () => {
    // Test with 1, 2, and 3 cycles
    for (const numCycles of [1, 2, 3]) {
      mockGetUserMedia.mockClear();
      
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() =>
        useVoiceInput({ onTranscript })
      );

      for (let i = 0; i < numCycles; i++) {
        const expectedCallCount = i + 1;

        // Start listening
        await act(async () => {
          await result.current.startListening();
        });

        // Verify permission was requested exactly once for this cycle
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalledTimes(expectedCallCount);
        });

        // Stop listening
        act(() => {
          result.current.stopListening();
        });

        await waitFor(() => {
          expect(result.current.isListening).toBe(false);
        });

        // Permission count should not increase after stopping
        expect(mockGetUserMedia).toHaveBeenCalledTimes(expectedCallCount);
      }

      unmount();
    }
  });

  /**
   * Property Test: No permission request on component unmount
   * 
   * Verifies that unmounting the component does not trigger any
   * permission requests.
   */
  it("should not request permission during cleanup/unmount", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const onTranscript = vi.fn();
        const { unmount } = renderHook(() => useVoiceInput({ onTranscript }));

        // Unmount the component
        unmount();

        // No permission requests should have been made
        const wasNotCalled = mockGetUserMedia.mock.calls.length === 0;
        return wasNotCalled;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Permission request timing with multiple hooks
   * 
   * Verifies that multiple instances of the hook don't interfere with
   * each other's permission request timing.
   */
  it("should maintain correct permission timing with multiple hook instances", async () => {
    const onTranscript = vi.fn();
    const hooks = [];

    // Create multiple hook instances
    for (let i = 0; i < 2; i++) {
      hooks.push(renderHook(() => useVoiceInput({ onTranscript })));
    }

    // No permissions should be requested yet
    expect(mockGetUserMedia).not.toHaveBeenCalled();

    // Start listening on first hook only
    await act(async () => {
      await hooks[0].result.current.startListening();
    });

    // Only one permission request should have been made
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    // Cleanup all hooks
    hooks.forEach((hook) => hook.unmount());
  });

  /**
   * Property Test: No permission request after error states
   * 
   * Verifies that entering an error state doesn't trigger unexpected
   * permission requests. This is important for security - errors should
   * not cause additional permission prompts.
   */
  it("should not request permission when entering error states", async () => {
    const errorTypes = ["no-speech", "aborted", "audio-capture", "network"];
    
    for (const errorType of errorTypes) {
      mockGetUserMedia.mockClear();
      
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result, unmount } = renderHook(() =>
        useVoiceInput({ onTranscript, onError })
      );

      // Start listening (this will request permission)
      await act(async () => {
        await result.current.startListening();
      });

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      });

      const initialCallCount = mockGetUserMedia.mock.calls.length;

      // Simulate error
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: errorType,
            message: `${errorType} error`,
          } as SpeechRecognitionErrorEvent);
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      // No additional permission requests should have been made
      expect(mockGetUserMedia).toHaveBeenCalledTimes(initialCallCount);

      unmount();
    }
  });

  /**
   * Property Test: Permission request parameters are correct
   * 
   * Verifies that when permission IS requested, it's requested with
   * the correct parameters (audio: true). This ensures we're only
   * requesting microphone access, not camera or other permissions.
   */
  it("should request permission with correct parameters when called", async () => {
    const onTranscript = vi.fn();
    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onTranscript })
    );

    // Start listening
    await act(async () => {
      await result.current.startListening();
    });

    // Verify permission was requested with correct parameters
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  /**
   * Property Test: No permission request during stopListening
   * 
   * Verifies that stopping listening doesn't trigger any permission requests.
   * This ensures we don't re-request permissions unnecessarily.
   */
  it("should not request permission when stopListening is called", async () => {
    const onTranscript = vi.fn();
    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onTranscript })
    );

    // Start listening
    await act(async () => {
      await result.current.startListening();
    });

    await waitFor(() => {
      expect(result.current.isListening).toBe(true);
    });

    const callCountAfterStart = mockGetUserMedia.mock.calls.length;

    // Stop listening
    act(() => {
      result.current.stopListening();
    });

    await waitFor(() => {
      expect(result.current.isListening).toBe(false);
    });

    // No additional permission requests
    expect(mockGetUserMedia).toHaveBeenCalledTimes(callCountAfterStart);

    unmount();
  });

  /**
   * Property Test: Permission timing with rapid start/stop
   * 
   * Verifies correct permission request timing even with rapid
   * start/stop toggling. This tests that the implementation handles
   * rapid user interactions correctly.
   */
  it("should maintain correct permission timing with rapid start/stop", async () => {
    // Test with 2, 3, 4, and 5 rapid toggles
    for (const numToggles of [2, 3, 4, 5]) {
      mockGetUserMedia.mockClear();
      
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() =>
        useVoiceInput({ onTranscript })
      );

      for (let i = 0; i < numToggles; i++) {
        // Start
        await act(async () => {
          await result.current.startListening();
        });

        // Immediately stop
        act(() => {
          result.current.stopListening();
        });

        // Small delay to let async operations complete
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Verify total permission requests match expected
      expect(mockGetUserMedia).toHaveBeenCalledTimes(numToggles);

      unmount();
    }
  });
});
