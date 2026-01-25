/**
 * Voice Agent Hook
 * Handles full voice conversation flow with optimized speed
 * Target: 1-2 second response time
 */

import { useState, useCallback, useRef } from 'react';
import { getSpeechRecognition } from './browserSupport';

interface UseVoiceAgentProps {
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
}

export function useVoiceAgent({ onTranscript, onResponse }: UseVoiceAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFinalTranscriptRef = useRef<string>('');

  /**
   * Start listening for user input
   * Optimized for fast response
   */
  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.error('[VoiceAgent] Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1; // Optimize for speed

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      lastFinalTranscriptRef.current = '';
      console.log('[VoiceAgent] Started listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcriptText = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;

      setTranscript(transcriptText);

      // Clear existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If final result, wait shorter time for silence (optimized for speed)
      if (isFinal) {
        lastFinalTranscriptRef.current = transcriptText;
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          onTranscript(transcriptText);
        }, 800); // Reduced to 0.8 seconds for faster response
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceAgent] Recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[VoiceAgent] Recognition ended');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('[VoiceAgent] Failed to start recognition:', err);
    }
  }, [onTranscript]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (err) {
        console.warn('[VoiceAgent] Error stopping recognition:', err);
      }
    }
    setIsListening(false);
  }, []);

  /**
   * Speak response text
   * Optimized for fast playback
   */
  const speak = useCallback((text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for quicker response
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
      setResponse(text);
      console.log('[VoiceAgent] Started speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('[VoiceAgent] Finished speaking');
      onResponse(text);
      // Auto-restart listening after response for continuous conversation
      setTimeout(() => {
        if (!isListening) {
          startListening();
        }
      }, 500);
    };

    utterance.onerror = (event) => {
      console.error('[VoiceAgent] Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [onResponse, isListening, startListening]);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopListening();
    stopSpeaking();
    setTranscript('');
    setResponse('');
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    transcript,
    response,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    reset,
  };
}
