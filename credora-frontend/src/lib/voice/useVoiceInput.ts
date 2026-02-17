/**
 * Voice-Controlled CFO - Voice Input Hook
 * 
 * Custom React hook that manages speech recognition lifecycle.
 * Validates: Requirements US-1.1, US-1.2, US-1.4
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  VoiceInputConfig,
  VoiceInputReturn,
  VoiceError,
  RecognitionState,
} from './types';
import {
  getSpeechRecognition,
  detectBrowserSupport,
} from './browserSupport';
import {
  createNotSupportedError,
  createErrorFromRecognitionEvent,
  logVoiceError,
  shouldRetry,
  getRetryDelay,
  MAX_RETRY_ATTEMPTS,
} from './errors';

/**
 * Custom hook for voice input using Web Speech API
 * 
 * Features:
 * - Browser compatibility detection
 * - Microphone permission handling
 * - Real-time transcript updates
 * - Automatic error recovery with exponential backoff
 * - Cleanup on unmount
 * 
 * @param config - Voice input configuration
 * @returns Voice input state and controls
 * 
 * @example
 * const { isListening, transcript, startListening, stopListening } = useVoiceInput({
 *   onTranscript: (text, isFinal) => {
 *     if (isFinal) {
 *       console.log('Final transcript:', text);
 *     }
 *   },
 * });
 */
export function useVoiceInput(config: VoiceInputConfig): VoiceInputReturn {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    onTranscript,
    onError,
  } = config;

  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');

  // Refs (don't trigger re-renders)
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Check browser support
  const browserSupport = detectBrowserSupport();
  const isSupported = browserSupport.speechRecognition;

  /**
   * Initializes the SpeechRecognition instance
   */
  const initializeRecognition = useCallback(() => {
    if (!isSupported) {
      return null;
    }

    const SpeechRecognitionConstructor = getSpeechRecognition();
    if (!SpeechRecognitionConstructor) {
      return null;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    return recognition;
  }, [isSupported, continuous, interimResults, language]);

  /**
   * Handles speech recognition start event
   */
  const handleStart = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    setRecognitionState('listening');
    setIsListening(true);
    setError(null);
    retryCountRef.current = 0; // Reset retry count on successful start
  }, []);

  /**
   * Handles speech recognition result event
   */
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    if (isUnmountedRef.current) return;

    const results = event.results;
    const lastResult = results[results.length - 1];
    const transcriptText = lastResult[0].transcript;
    const isFinal = lastResult.isFinal;
    const confidence = lastResult[0].confidence;

    // Update local transcript state
    setTranscript(transcriptText);

    // Notify parent component
    onTranscript(transcriptText, isFinal);

    // Update state based on result type
    if (isFinal) {
      setRecognitionState('processing');
    }
  }, [onTranscript]);

  /**
   * Handles speech recognition end event
   */
  const handleEnd = useCallback(() => {
    if (isUnmountedRef.current) return;

    setRecognitionState('idle');
    setIsListening(false);

    // If continuous mode and we were listening, restart
    if (continuous && recognitionState === 'listening') {
      // Automatic restart with retry logic
      if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = getRetryDelay(retryCountRef.current);
        retryCountRef.current++;
        
        retryTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Ignore errors on restart, will be handled by error event
            }
          }
        }, delay);
      }
    }
  }, [continuous, recognitionState]);

  /**
   * Handles speech recognition error event
   */
  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    if (isUnmountedRef.current) return;

    const voiceError = createErrorFromRecognitionEvent(event);
    
    setError(voiceError);
    setRecognitionState('error');
    setIsListening(false);
    
    logVoiceError(voiceError, 'Recognition');
    
    // Notify parent component
    if (onError) {
      onError(voiceError);
    }

    // Don't retry permission denied errors - user needs to manually grant permission
    if (voiceError.type === 'permission-denied') {
      return;
    }

    // Retry logic for recoverable errors only
    if (shouldRetry(voiceError) && retryCountRef.current < MAX_RETRY_ATTEMPTS) {
      const delay = getRetryDelay(retryCountRef.current);
      retryCountRef.current++;
      
      retryTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current && recognitionRef.current) {
          // Clear error state and attempt to restart
          setError(null);
          setRecognitionState('idle');
          
          // Attempt to restart recognition
          try {
            recognitionRef.current.start();
          } catch (err) {
            // If restart fails, just log it - the error handler will be called
            console.warn('Failed to restart recognition after error:', err);
          }
        }
      }, delay);
    }
  }, [onError]);

  /**
   * Sets up event listeners for the recognition instance
   */
  const setupEventListeners = useCallback((recognition: SpeechRecognition) => {
    recognition.onstart = handleStart;
    recognition.onresult = handleResult;
    recognition.onend = handleEnd;
    recognition.onerror = handleError;
  }, [handleStart, handleResult, handleEnd, handleError]);

  /**
   * Requests microphone permission explicitly
   * This ensures we have permission before starting speech recognition
   */
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return true; // Fallback to letting SpeechRecognition handle it
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Immediately stop the stream - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err) {
      // Permission denied or error
      const errorMessage = err instanceof Error ? err.message : 'Microphone access denied';
      const voiceError = createErrorFromRecognitionEvent({
        error: 'not-allowed',
        message: errorMessage,
      } as SpeechRecognitionErrorEvent);
      
      setError(voiceError);
      setRecognitionState('error');
      setIsListening(false);
      logVoiceError(voiceError, 'Permission');
      
      if (onError) {
        onError(voiceError);
      }
      
      return false;
    }
  }, [onError]);

  /**
   * Starts listening for speech input
   */
  const startListening = useCallback(async () => {
    // Check browser support
    if (!isSupported) {
      const notSupportedError = createNotSupportedError('Speech recognition');
      setError(notSupportedError);
      logVoiceError(notSupportedError, 'Recognition');
      if (onError) {
        onError(notSupportedError);
      }
      return;
    }

    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Request microphone permission first
    setRecognitionState('requesting-permission');
    const hasPermission = await requestMicrophonePermission();
    
    if (!hasPermission) {
      // Permission denied - error already set by requestMicrophonePermission
      return;
    }

    // Initialize recognition if needed
    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
      if (!recognitionRef.current) {
        const notSupportedError = createNotSupportedError('Speech recognition');
        setError(notSupportedError);
        logVoiceError(notSupportedError, 'Recognition');
        if (onError) {
          onError(notSupportedError);
        }
        return;
      }
      setupEventListeners(recognitionRef.current);
    }

    // Start recognition
    try {
      setTranscript(''); // Clear previous transcript
      recognitionRef.current.start();
    } catch (err) {
      // Handle case where recognition is already started
      if (err instanceof Error && err.message.includes('already started')) {
        // Ignore - already listening
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const voiceError = createErrorFromRecognitionEvent({
        error: 'aborted',
        message: errorMessage,
      } as SpeechRecognitionErrorEvent);
      
      setError(voiceError);
      setRecognitionState('error');
      logVoiceError(voiceError, 'Recognition');
      
      if (onError) {
        onError(voiceError);
      }
    }
  }, [isSupported, initializeRecognition, setupEventListeners, onError, requestMicrophonePermission]);

  /**
   * Stops listening for speech input
   */
  const stopListening = useCallback(() => {
    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
    }

    setRecognitionState('idle');
    setIsListening(false);
  }, []);

  /**
   * Clears the current error state
   * Useful for allowing retry after permission denial or other errors
   */
  const clearError = useCallback(() => {
    setError(null);
    setRecognitionState('idle');
    retryCountRef.current = 0; // Reset retry count
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Stop and cleanup recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
        } catch (err) {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    clearError,
    error,
  };
}
