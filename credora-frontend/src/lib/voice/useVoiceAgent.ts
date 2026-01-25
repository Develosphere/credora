/**
 * Voice Agent Hook
 * Handles full voice conversation flow with production-level optimizations
 * Features: Fast response, error recovery, retry logic, performance monitoring
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
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  /**
   * Start listening with automatic retry on failure
   */
  const startListening = useCallback(() => {
    console.log('[VoiceAgent] 🎤 startListening called, current state:', { isListening });
    
    // Prevent multiple simultaneous starts
    if (isListening) {
      console.log('[VoiceAgent] ⚠️ Already listening, ignoring start request');
      return;
    }
    
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.error('[VoiceAgent] ❌ Speech recognition not supported');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        console.log('[VoiceAgent] 🛑 Stopping existing recognition');
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore
      }
      recognitionRef.current = null;
    }

    console.log('[VoiceAgent] 🚀 Creating new recognition instance');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      lastFinalTranscriptRef.current = '';
      retryCountRef.current = 0;
      console.log('[VoiceAgent] 🎤 Started listening - recognition active');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcriptText = lastResult[0].transcript;
        const isFinal = lastResult.isFinal;
        const confidence = lastResult[0].confidence;

        // Log confidence for monitoring
        if (isFinal) {
          console.log(`[VoiceAgent] 📊 Confidence: ${(confidence * 100).toFixed(1)}%`);
        }

        setTranscript(transcriptText);

        // Clear existing silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // If final result with good confidence, process it
        if (isFinal && transcriptText.trim().length > 0) {
          lastFinalTranscriptRef.current = transcriptText;
          
          // Shorter timeout for better UX
          silenceTimerRef.current = setTimeout(() => {
            console.log('[VoiceAgent] ✅ Processing transcript:', transcriptText);
            // Stop listening BEFORE calling onTranscript
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
                recognitionRef.current = null;
              } catch (err) {
                console.warn('[VoiceAgent] ⚠️ Error stopping recognition:', err);
              }
            }
            setIsListening(false);
            
            // Wait a bit for recognition to fully stop before processing
            setTimeout(() => {
              onTranscript(transcriptText);
            }, 200);
          }, 800);
        }
      } catch (err) {
        console.error('[VoiceAgent] ❌ Error processing result:', err);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceAgent] ❌ Recognition error:', event.error);
      
      // Handle specific errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        speak("Microphone access denied. Please enable microphone permissions.");
        return;
      }

      if (event.error === 'network') {
        setIsListening(false);
        speak("Network error. Please check your internet connection.");
        return;
      }

      // Auto-retry on recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[VoiceAgent] 🔄 Retrying... (${retryCountRef.current}/${maxRetries})`);
          setTimeout(() => startListening(), 500);
        } else {
          setIsListening(false);
          speak("I'm having trouble hearing you. Please try again.");
        }
        return;
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[VoiceAgent] 🛑 Recognition ended');
    };

    recognitionRef.current = recognition;

    try {
      console.log('[VoiceAgent] 🚀 Calling recognition.start()...');
      recognition.start();
      console.log('[VoiceAgent] ✅ recognition.start() called successfully');
    } catch (err) {
      console.error('[VoiceAgent] ❌ Failed to start recognition:', err);
      setIsListening(false);
    }
  }, [onTranscript, isListening]);

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
        console.warn('[VoiceAgent] ⚠️ Error stopping recognition:', err);
      }
    }
    setIsListening(false);
  }, []);

  /**
   * Speak response with error handling and retry
   */
  const speak = useCallback((text: string) => {
    if (!text || text.trim().length === 0) {
      console.warn('[VoiceAgent] ⚠️ Empty text, skipping speech');
      return;
    }

    console.log('[VoiceAgent] 🔊 speak() called with text:', text.substring(0, 50) + '...');

    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.error('[VoiceAgent] ❌ Speech synthesis not available');
      return;
    }

    // CRITICAL: Stop recognition completely before speaking
    if (recognitionRef.current) {
      try {
        console.log('[VoiceAgent] 🛑 Stopping recognition before speaking');
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (err) {
        console.warn('[VoiceAgent] ⚠️ Error stopping recognition:', err);
      }
    }
    setIsListening(false);

    // Cancel any ongoing speech
    try {
      window.speechSynthesis.cancel();
      console.log('[VoiceAgent] ✅ Canceled existing speech');
    } catch (err) {
      console.warn('[VoiceAgent] ⚠️ Error canceling speech:', err);
    }

    // Function to actually speak (after voices are loaded)
    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('[VoiceAgent] 📢 Available voices:', voices.length);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      // Use first available English voice
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
        console.log('[VoiceAgent] 🎤 Using voice:', englishVoice.name);
      } else {
        console.log('[VoiceAgent] ⚠️ No English voice found, using default');
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setResponse(text);
        console.log('[VoiceAgent] 🔊 Started speaking - audio should be playing now');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[VoiceAgent] ✅ Finished speaking');
        onResponse(text);
      };

      utterance.onerror = (event) => {
        console.error('[VoiceAgent] ❌ Speech synthesis error:', event.error);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      
      try {
        console.log('[VoiceAgent] 🚀 Calling window.speechSynthesis.speak()...');
        
        // Force set speaking state immediately
        setIsSpeaking(true);
        setResponse(text);
        
        window.speechSynthesis.speak(utterance);
        
        // Chrome bug workaround - pause and resume to force it to work
        setTimeout(() => {
          console.log('[VoiceAgent] 🔄 Checking speech status...');
          console.log('[VoiceAgent] 📊 speaking:', window.speechSynthesis.speaking);
          console.log('[VoiceAgent] 📊 pending:', window.speechSynthesis.pending);
          console.log('[VoiceAgent] 📊 paused:', window.speechSynthesis.paused);
          
          if (window.speechSynthesis.paused) {
            console.log('[VoiceAgent] 🔄 Resuming paused speech...');
            window.speechSynthesis.resume();
          }
          
          // If still not speaking, try to force it
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            console.warn('[VoiceAgent] ⚠️ Speech not starting, forcing restart...');
            window.speechSynthesis.cancel();
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
              // Try resume again
              setTimeout(() => {
                if (window.speechSynthesis.paused) {
                  window.speechSynthesis.resume();
                }
              }, 100);
            }, 100);
          }
        }, 100);
        
        console.log('[VoiceAgent] ✅ window.speechSynthesis.speak() called');
        
      } catch (err) {
        console.error('[VoiceAgent] ❌ Failed to speak:', err);
        setIsSpeaking(false);
      }
    };

    // Chrome-specific: Load voices first (they load async)
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      console.log('[VoiceAgent] ⏳ Waiting for voices to load...');
      
      // Set up one-time listener for voices
      const voicesChangedHandler = () => {
        console.log('[VoiceAgent] ✅ Voices loaded, speaking now');
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        
        // Wait a bit then speak
        setTimeout(() => {
          doSpeak();
        }, 500);
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Fallback: if voices don't load in 2 seconds, try anyway
      setTimeout(() => {
        const voicesNow = window.speechSynthesis.getVoices();
        if (voicesNow.length === 0) {
          console.warn('[VoiceAgent] ⚠️ Voices still not loaded, trying anyway...');
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          doSpeak();
        }
      }, 2000);
      
    } else {
      // Voices already loaded, speak after delay
      console.log('[VoiceAgent] ✅ Voices already loaded');
      setTimeout(() => {
        doSpeak();
      }, 500);
    }
  }, [onResponse]);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('[VoiceAgent] ⚠️ Error stopping speech:', err);
    }
    setIsSpeaking(false);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    console.log('[VoiceAgent] 🔄 Resetting...');
    stopListening();
    stopSpeaking();
    setTranscript('');
    setResponse('');
    retryCountRef.current = 0;
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
