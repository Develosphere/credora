/**
 * Integration tests for useVoiceInput permission handling
 * 
 * Tests the microphone permission request flow and error recovery
 * Validates: Requirements TR-3.3, NFR-1.3, NFR-2.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInput } from './useVoiceInput';

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  
  onstart: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  
  start() {
    setTimeout(() => {
      if (this.onstart) {
        this.onstart(new Event('start'));
      }
    }, 0);
  }
  
  stop() {
    setTimeout(() => {
      if (this.onend) {
        this.onend(new Event('end'));
      }
    }, 0);
  }
  
  abort() {
    this.stop();
  }
}

describe('useVoiceInput - Permission Handling', () => {
  let mockRecognitionInstance: MockSpeechRecognition;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    // Setup mock SpeechRecognition
    mockRecognitionInstance = new MockSpeechRecognition();
    
    const MockConstructor = function(this: any) {
      return mockRecognitionInstance;
    } as any;
    
    // @ts-expect-error - Mocking browser API
    global.SpeechRecognition = MockConstructor;
    // @ts-expect-error - Mocking browser API
    global.webkitSpeechRecognition = MockConstructor;
    
    // Mock navigator.mediaDevices.getUserMedia
    mockGetUserMedia = vi.fn();
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
    });
    
    // Mock navigator.userAgent
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true,
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Permission Request Flow', () => {
    it('should request microphone permission before starting recognition', async () => {
      // Mock successful permission grant
      const mockStop = vi.fn();
      const mockStream = {
        getTracks: () => [
          {
            stop: mockStop,
          },
        ],
      };
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      // Should have requested permission
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      
      // Should have stopped the stream immediately
      expect(mockStop).toHaveBeenCalled();
      
      // Should be listening
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
    });
    
    it('should handle permission denial gracefully', async () => {
      // Mock permission denial
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      // Should have requested permission
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      
      // Should have error
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
        expect(result.current.error?.type).toBe('permission-denied');
      });
      
      // Should not be listening
      expect(result.current.isListening).toBe(false);
      
      // Should have called error callback
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'permission-denied',
        })
      );
    });
    
    it('should allow retry after permission denial', async () => {
      // Mock permission denial first, then grant
      mockGetUserMedia
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce({
          getTracks: () => [{ stop: vi.fn() }],
        });
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      // First attempt - denied
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('permission-denied');
      });
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
      
      // Second attempt - granted
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
        expect(result.current.error).toBe(null);
      });
    });
    
    it('should not request permission on page load', () => {
      const onTranscript = vi.fn();
      renderHook(() => useVoiceInput({ onTranscript }));
      
      // Should not have requested permission yet
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
    
    it('should only request permission when user clicks microphone button', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      // Initially no permission request
      expect(mockGetUserMedia).not.toHaveBeenCalled();
      
      // Mock successful permission
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      
      // User clicks microphone button (calls startListening)
      await act(async () => {
        await result.current.startListening();
      });
      
      // Now permission should be requested
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });
  
  describe('Error Recovery', () => {
    it('should implement exponential backoff for network errors', async () => {
      // Mock successful permission
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      const startTime = Date.now();
      const retryTimes: number[] = [];
      
      // Track when retries happen
      startSpy.mockImplementation(() => {
        retryTimes.push(Date.now() - startTime);
        // Simulate error on each retry
        setTimeout(() => {
          if (mockRecognitionInstance.onerror) {
            mockRecognitionInstance.onerror({
              error: 'network',
              message: 'Network error',
            } as SpeechRecognitionErrorEvent);
          }
        }, 0);
      });
      
      // Trigger initial error
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: 'network',
            message: 'Network error',
          } as SpeechRecognitionErrorEvent);
        }
      });
      
      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should have attempted 3 retries
      expect(startSpy).toHaveBeenCalledTimes(3);
      
      // Verify exponential backoff timing (approximately)
      // First retry: ~100ms, Second: ~500ms, Third: ~1000ms
      if (retryTimes.length >= 2) {
        expect(retryTimes[0]).toBeGreaterThanOrEqual(80);
        expect(retryTimes[0]).toBeLessThan(200);
      }
      if (retryTimes.length >= 3) {
        expect(retryTimes[1]).toBeGreaterThanOrEqual(400);
        expect(retryTimes[1]).toBeLessThan(700);
      }
    });
    
    it('should not retry non-recoverable errors', async () => {
      // Mock successful permission
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      // Trigger permission denied error
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: 'not-allowed',
            message: 'Permission denied',
          } as SpeechRecognitionErrorEvent);
        }
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('permission-denied');
      });
      
      // Wait to ensure no retry happens
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should not have attempted to restart
      expect(startSpy).not.toHaveBeenCalled();
    });
    
    it('should clear retry timeout when stopListening is called', async () => {
      // Mock successful permission
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      // Trigger network error
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: 'network',
            message: 'Network error',
          } as SpeechRecognitionErrorEvent);
        }
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('network');
      });
      
      // Stop listening before retry happens
      act(() => {
        result.current.stopListening();
      });
      
      // Wait for potential retry
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not have attempted to restart
      expect(startSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Error State Management', () => {
    it('should maintain error state until cleared', async () => {
      // Mock permission denial
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('permission-denied');
      });
      
      // Error should persist
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(result.current.error?.type).toBe('permission-denied');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
    
    it('should reset retry count when clearError is called', async () => {
      // Mock successful permission
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      // Trigger multiple errors to increment retry count
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: 'network',
            message: 'Network error',
          } as SpeechRecognitionErrorEvent);
        }
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('network');
      });
      
      // Clear error (should reset retry count)
      act(() => {
        result.current.clearError();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
      
      // Start again and trigger error - should retry from 0
      await act(async () => {
        await result.current.startListening();
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      act(() => {
        if (mockRecognitionInstance.onerror) {
          mockRecognitionInstance.onerror({
            error: 'network',
            message: 'Network error',
          } as SpeechRecognitionErrorEvent);
        }
      });
      
      // Wait for first retry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should have attempted retry (retry count was reset)
      expect(startSpy).toHaveBeenCalled();
    });
  });
});
