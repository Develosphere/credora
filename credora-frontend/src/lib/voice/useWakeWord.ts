/**
 * Wake Word Detection Hook
 * Listens for "Hey Credora" or "Hey CFO" to trigger voice agent
 * Optimized for reliability and low false positives
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSpeechRecognition } from './browserSupport';

interface UseWakeWordProps {
  enabled: boolean;
  onWakeWordDetected: () => void;
}

const WAKE_WORDS = [
  'hey credora',
  'hey cfo',
  'credora',
  'cfo',
  // Common misheard variations
  'hey corridor',
  'a credora',
  'hey ceo',
];

/**
 * Hook for continuous wake word detection
 * Listens for wake words in the background
 */
export function useWakeWord({ enabled, onWakeWordDetected }: UseWakeWordProps) {
  const [isListening, setIsListening] = useState(false);
  const [lastDetection, setLastDetection] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isUnmountedRef = useRef(false);
  const cooldownRef = useRef<boolean>(false);

  const startListening = useCallback(() => {
    // Don't check isListening here - let it restart if needed
    if (!enabled) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.error('[WakeWord] Speech recognition not supported');
      return;
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim for faster detection
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (isUnmountedRef.current) return;
      setIsListening(true);
      console.log('[WakeWord] 🎤 Listening for: "Hey Credora" or "Hey CFO"');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isUnmountedRef.current || cooldownRef.current) return;

      // Check both interim and final results for faster detection
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase().trim();
        
        // Log for debugging
        console.log('[WakeWord] Heard:', transcript, result.isFinal ? '(final)' : '(interim)');

        // Check if transcript contains any wake word
        const detected = WAKE_WORDS.some((word) => {
          const normalizedWord = word.toLowerCase();
          // Check for exact match or word at start/middle of sentence
          return transcript === normalizedWord || 
                 transcript.startsWith(normalizedWord + ' ') ||
                 transcript.includes(' ' + normalizedWord + ' ') ||
                 transcript.includes(' ' + normalizedWord) ||
                 transcript.endsWith(' ' + normalizedWord);
        });

        if (detected) {
          console.log('[WakeWord] ✅ Wake word detected!', transcript);
          setLastDetection(transcript);
          
          // Set cooldown to prevent multiple triggers
          cooldownRef.current = true;
          setTimeout(() => {
            cooldownRef.current = false;
          }, 3000); // 3 second cooldown
          
          // Trigger callback
          onWakeWordDetected();
          
          // Stop and restart recognition to clear buffer
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (err) {
              // Ignore
            }
          }
          break;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (isUnmountedRef.current) return;
      
      console.error('[WakeWord] ❌ Error:', event.error);
      
      // Don't restart on permission errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        return;
      }
      
      // Restart on recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (!isUnmountedRef.current && recognitionRef.current && enabled) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.warn('[WakeWord] Failed to restart:', err);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isUnmountedRef.current) return;
      
      setIsListening(false);
      console.log('[WakeWord] 🛑 Recognition ended');
      
      // Auto-restart for continuous listening (unless in cooldown)
      if (enabled && !cooldownRef.current) {
        setTimeout(() => {
          if (!isUnmountedRef.current && enabled) {
            console.log('[WakeWord] 🔄 Auto-restarting...');
            try {
              recognition.start();
              setIsListening(true);
            } catch (err) {
              console.warn('[WakeWord] Failed to restart:', err);
            }
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    try {
      console.log('[WakeWord] 🚀 Starting speech recognition...');
      recognition.start();
      console.log('[WakeWord] ✅ Speech recognition started successfully');
    } catch (err) {
      console.error('[WakeWord] ❌ Failed to start recognition:', err);
      // Try again after delay
      setTimeout(() => {
        if (!isUnmountedRef.current && enabled) {
          console.log('[WakeWord] 🔄 Retrying start...');
          startListening();
        }
      }, 2000);
    }
  }, [enabled, onWakeWordDetected]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
        cooldownRef.current = false;
        console.log('[WakeWord] ⏸️ Stopped listening');
      } catch (err) {
        console.warn('[WakeWord] Error stopping:', err);
      }
    }
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    console.log('[WakeWord] enabled prop changed:', enabled);
    
    if (enabled) {
      console.log('[WakeWord] 🚀 Wake word detection enabled');
      // Small delay to avoid React strict mode double-mount issues
      const timer = setTimeout(() => {
        if (!isUnmountedRef.current) {
          startListening();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      console.log('[WakeWord] ⏸️ Wake word detection disabled');
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    lastDetection,
    stopListening,
  };
}
