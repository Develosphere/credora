/**
 * Voice-Controlled CFO - Voice Output Hook
 * 
 * Custom React hook that manages speech synthesis lifecycle.
 * Validates: Requirements US-2.1, US-2.4, US-2.5, US-5.2, US-5.3
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  VoiceOutputConfig,
  VoiceOutputReturn,
  VoiceError,
  SynthesisState,
} from './types';
import { detectBrowserSupport } from './browserSupport';
import { createNotSupportedError, logVoiceError } from './errors';

/**
 * Maximum length for a single utterance (characters)
 * Long text is split into chunks to avoid browser limitations
 */
const MAX_UTTERANCE_LENGTH = 200;

/**
 * Custom hook for voice output using Web Speech Synthesis API
 * 
 * Features:
 * - Browser compatibility detection
 * - Text-to-speech with configurable voice settings
 * - Playback controls (speak, pause, resume, stop)
 * - Automatic chunking for long text
 * - Queue management for multiple utterances
 * - Voice selection and caching
 * 
 * @param config - Voice output configuration
 * @returns Voice output state and controls
 * 
 * @example
 * const { isSpeaking, speak, stop } = useVoiceOutput({
 *   rate: 1.0,
 *   pitch: 1.0,
 *   volume: 1.0,
 *   onEnd: () => console.log('Finished speaking'),
 * });
 */
export function useVoiceOutput(config: VoiceOutputConfig = {}): VoiceOutputReturn {
  const {
    autoPlay = false,
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    voice = null,
    onStart,
    onEnd,
    onError,
  } = config;

  // State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const [synthesisState, setSynthesisState] = useState<SynthesisState>('idle');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Refs
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isUnmountedRef = useRef(false);

  // Check browser support
  const browserSupport = detectBrowserSupport();
  const isSupported = browserSupport.speechSynthesis;

  /**
   * Loads available voices from the browser
   * Some browsers load voices asynchronously, so we listen for the voiceschanged event
   */
  const loadVoices = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') {
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);
    }
  }, [isSupported]);

  /**
   * Initialize voices on mount and listen for changes
   */
  useEffect(() => {
    if (!isSupported) return;

    // Load voices immediately
    loadVoices();

    // Listen for voices changed event (some browsers load voices async)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported, loadVoices]);

  /**
   * Splits long text into chunks for better synthesis
   * Splits on sentence boundaries when possible
   */
  const chunkText = useCallback((text: string): string[] => {
    if (text.length <= MAX_UTTERANCE_LENGTH) {
      return [text];
    }

    const chunks: string[] = [];
    
    // Split on sentence boundaries (., !, ?)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= MAX_UTTERANCE_LENGTH) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }, []);

  /**
   * Creates a configured utterance with current settings
   */
  const createUtterance = useCallback((text: string): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply settings
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = Math.max(0, Math.min(2, pitch));
    utterance.volume = Math.max(0, Math.min(1, volume));
    
    // Apply voice if specified
    if (voice) {
      utterance.voice = voice;
    }
    
    return utterance;
  }, [rate, pitch, volume, voice]);

  /**
   * Processes the next utterance in the queue
   */
  const processQueue = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    if (utteranceQueueRef.current.length === 0) {
      setIsSpeaking(false);
      setSynthesisState('idle');
      currentUtteranceRef.current = null;
      
      // Notify end callback
      if (onEnd) {
        onEnd();
      }
      return;
    }

    const nextUtterance = utteranceQueueRef.current.shift();
    if (!nextUtterance) return;

    currentUtteranceRef.current = nextUtterance;
    
    try {
      window.speechSynthesis.speak(nextUtterance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech synthesis failed';
      const voiceError: VoiceError = {
        type: 'synthesis-failed',
        message: errorMessage,
        recoverable: true,
        timestamp: Date.now(),
      };
      
      setError(voiceError);
      setSynthesisState('error');
      setIsSpeaking(false);
      logVoiceError(voiceError, 'Synthesis');
      
      if (onError) {
        onError(voiceError);
      }
    }
  }, [onEnd, onError]);

  /**
   * Speaks the given text
   * Automatically chunks long text and queues utterances
   */
  const speak = useCallback((text: string) => {
    if (!isSupported) {
      const notSupportedError = createNotSupportedError('Speech synthesis');
      setError(notSupportedError);
      logVoiceError(notSupportedError, 'Synthesis');
      if (onError) {
        onError(notSupportedError);
      }
      return;
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    utteranceQueueRef.current = [];

    // Chunk the text
    const chunks = chunkText(text);

    // Create utterances for each chunk
    const utterances = chunks.map((chunk, index) => {
      const utterance = createUtterance(chunk);

      // Set up event handlers
      utterance.onstart = () => {
        if (isUnmountedRef.current) return;
        
        if (index === 0) {
          setIsSpeaking(true);
          setSynthesisState('speaking');
          setError(null);
          
          if (onStart) {
            onStart();
          }
        }
      };

      utterance.onend = () => {
        if (isUnmountedRef.current) return;
        processQueue();
      };

      utterance.onerror = (event) => {
        if (isUnmountedRef.current) return;
        
        const voiceError: VoiceError = {
          type: 'synthesis-failed',
          message: `Speech synthesis error: ${event.error}`,
          recoverable: true,
          timestamp: Date.now(),
        };
        
        setError(voiceError);
        setSynthesisState('error');
        setIsSpeaking(false);
        logVoiceError(voiceError, 'Synthesis');
        
        if (onError) {
          onError(voiceError);
        }
      };

      return utterance;
    });

    // Add to queue
    utteranceQueueRef.current = utterances;

    // Start processing
    processQueue();
  }, [isSupported, chunkText, createUtterance, processQueue, onStart, onError]);

  /**
   * Pauses speech synthesis
   */
  const pause = useCallback(() => {
    if (!isSupported) return;

    try {
      window.speechSynthesis.pause();
      setSynthesisState('paused');
    } catch (err) {
      console.warn('Failed to pause speech:', err);
    }
  }, [isSupported]);

  /**
   * Resumes paused speech synthesis
   */
  const resume = useCallback(() => {
    if (!isSupported) return;

    try {
      window.speechSynthesis.resume();
      setSynthesisState('speaking');
    } catch (err) {
      console.warn('Failed to resume speech:', err);
    }
  }, [isSupported]);

  /**
   * Stops speech synthesis and clears queue
   */
  const stop = useCallback(() => {
    if (!isSupported) return;

    try {
      window.speechSynthesis.cancel();
      utteranceQueueRef.current = [];
      currentUtteranceRef.current = null;
      setIsSpeaking(false);
      setSynthesisState('idle');
    } catch (err) {
      console.warn('Failed to stop speech:', err);
    }
  }, [isSupported]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Stop any ongoing speech
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          // Ignore cleanup errors
        }
      }
      
      // Clear queue
      utteranceQueueRef.current = [];
      currentUtteranceRef.current = null;
    };
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    availableVoices,
    speak,
    pause,
    resume,
    stop,
    error,
  };
}
