/**
 * Unit tests for useVoiceInput hook
 * 
 * Tests the voice input hook functionality including:
 * - Browser support detection
 * - Start/stop recording
 * - Transcript capture
 * - Error handling
 * - Cleanup on unmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInput } from './useVoiceInput';
import type { VoiceInputConfig } from './types';

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
  
  // Helper method for testing
  simulateResult(transcript: string, isFinal: boolean, confidence: number = 0.9) {
    if (this.onresult) {
      const event = {
        results: [
          [
            {
              transcript,
              confidence,
            }
          ]
        ],
        resultIndex: 0,
      } as unknown as SpeechRecognitionEvent;
      
      // Set isFinal property
      (event.results[0] as any).isFinal = isFinal;
      
      this.onresult(event);
    }
  }
  
  // Helper method for testing
  simulateError(errorType: string, message: string = '') {
    if (this.onerror) {
      const event = {
        error: errorType,
        message,
      } as SpeechRecognitionErrorEvent;
      
      this.onerror(event);
    }
  }
}

describe('useVoiceInput', () => {
  let mockRecognitionInstance: MockSpeechRecognition;
  
  beforeEach(() => {
    // Setup mock SpeechRecognition
    mockRecognitionInstance = new MockSpeechRecognition();
    
    // Create a proper constructor function
    const MockConstructor = function(this: any) {
      return mockRecognitionInstance;
    } as any;
    
    // @ts-expect-error - Mocking browser API
    global.SpeechRecognition = MockConstructor;
    // @ts-expect-error - Mocking browser API
    global.webkitSpeechRecognition = MockConstructor;
    
    // Mock navigator
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true,
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      expect(result.current.isListening).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBe(null);
    });
    
    it('should detect browser support correctly', () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      expect(result.current.isSupported).toBe(true);
    });
    
    it('should handle unsupported browser', () => {
      // Remove SpeechRecognition
      // @ts-expect-error - Mocking browser API
      delete global.SpeechRecognition;
      // @ts-expect-error - Mocking browser API
      delete global.webkitSpeechRecognition;
      
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      expect(result.current.isSupported).toBe(false);
    });
  });
  
  describe('Start/Stop Recording', () => {
    it('should start listening when startListening is called', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
    });
    
    it('should stop listening when stopListening is called', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
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
    });
    
    it('should clear transcript when starting new recording', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      // Start and simulate result
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateResult('test transcript', false);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('test transcript');
      });
      
      // Stop
      act(() => {
        result.current.stopListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(false);
      });
      
      // Start again - transcript should be cleared
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('');
      });
    });
  });
  
  describe('Transcript Capture', () => {
    it('should capture interim results', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, interimResults: true })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateResult('hello', false);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('hello');
        expect(onTranscript).toHaveBeenCalledWith('hello', false);
      });
    });
    
    it('should capture final results', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoiceInput({ onTranscript }));
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateResult('hello world', true);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('hello world');
        expect(onTranscript).toHaveBeenCalledWith('hello world', true);
      });
    });
    
    it('should update transcript multiple times', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, interimResults: true })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      // Simulate multiple interim results
      act(() => {
        mockRecognitionInstance.simulateResult('hello', false);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('hello');
      });
      
      act(() => {
        mockRecognitionInstance.simulateResult('hello world', false);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('hello world');
      });
      
      act(() => {
        mockRecognitionInstance.simulateResult('hello world!', true);
      });
      
      await waitFor(() => {
        expect(result.current.transcript).toBe('hello world!');
        expect(onTranscript).toHaveBeenCalledTimes(3);
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle permission denied error', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateError('not-allowed');
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
        expect(result.current.error?.type).toBe('permission-denied');
        expect(result.current.isListening).toBe(false);
        expect(onError).toHaveBeenCalled();
      });
    });
    
    it('should not retry permission denied errors', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      act(() => {
        mockRecognitionInstance.simulateError('not-allowed');
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('permission-denied');
      });
      
      // Wait a bit to ensure no retry happens
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not have attempted to restart
      expect(startSpy).not.toHaveBeenCalled();
    });
    
    it('should retry network errors with exponential backoff', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      act(() => {
        mockRecognitionInstance.simulateError('network');
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('network');
      });
      
      // Wait for first retry (100ms)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should have attempted to restart
      expect(startSpy).toHaveBeenCalledTimes(1);
    });
    
    it('should clear error state with clearError method', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateError('not-allowed');
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
    
    it('should handle no speech error', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateError('no-speech');
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
        expect(result.current.error?.type).toBe('no-speech');
        expect(onError).toHaveBeenCalled();
      });
    });
    
    it('should handle network error', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      act(() => {
        mockRecognitionInstance.simulateError('network');
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
        expect(result.current.error?.type).toBe('network');
        expect(onError).toHaveBeenCalled();
      });
    });
    
    it('should handle unsupported browser error', async () => {
      // Remove SpeechRecognition
      // @ts-expect-error - Mocking browser API
      delete global.SpeechRecognition;
      // @ts-expect-error - Mocking browser API
      delete global.webkitSpeechRecognition;
      
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
        expect(result.current.error?.type).toBe('not-supported');
        expect(onError).toHaveBeenCalled();
      });
    });
    
    it('should stop retrying after max attempts', async () => {
      const onTranscript = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, onError })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const startSpy = vi.spyOn(mockRecognitionInstance, 'start');
      
      // Simulate network error
      act(() => {
        mockRecognitionInstance.simulateError('network');
      });
      
      await waitFor(() => {
        expect(result.current.error?.type).toBe('network');
      });
      
      // Wait for first retry and simulate error again
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await act(async () => {
        mockRecognitionInstance.simulateError('network');
      });
      
      // Wait for second retry and simulate error again
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await act(async () => {
        mockRecognitionInstance.simulateError('network');
      });
      
      // Wait for third retry
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should have attempted 3 retries (MAX_RETRY_ATTEMPTS)
      expect(startSpy).toHaveBeenCalledTimes(3);
      
      // Wait a bit more to ensure no additional retries
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should still be 3 retries
      expect(startSpy).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Configuration', () => {
    it('should apply continuous mode configuration', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, continuous: true })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(mockRecognitionInstance.continuous).toBe(true);
      });
    });
    
    it('should apply interimResults configuration', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, interimResults: false })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(mockRecognitionInstance.interimResults).toBe(false);
      });
    });
    
    it('should apply language configuration', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => 
        useVoiceInput({ onTranscript, language: 'es-ES' })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(mockRecognitionInstance.lang).toBe('es-ES');
      });
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => 
        useVoiceInput({ onTranscript })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      const stopSpy = vi.spyOn(mockRecognitionInstance, 'stop');
      
      unmount();
      
      expect(stopSpy).toHaveBeenCalled();
    });
    
    it('should not update state after unmount', async () => {
      const onTranscript = vi.fn();
      const { result, unmount } = renderHook(() => 
        useVoiceInput({ onTranscript })
      );
      
      await act(async () => {
        await result.current.startListening();
      });
      
      await waitFor(() => {
        expect(result.current.isListening).toBe(true);
      });
      
      unmount();
      
      // Try to simulate result after unmount - should not cause errors
      expect(() => {
        mockRecognitionInstance.simulateResult('test', true);
      }).not.toThrow();
    });
  });
});
