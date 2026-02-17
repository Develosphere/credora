/**
 * Voice Agent Modal
 * Full-screen voice interface with fast direct API integration
 * Optimized for 1-2 second response time
 */

'use client';

import { useEffect, useRef } from 'react';
import { X, Mic, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceAgentModalProps {
  isOpen: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing?: boolean;
  transcript: string;
  response: string;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking?: () => void;
}

export function VoiceAgentModal({
  isOpen,
  isListening,
  isSpeaking,
  isProcessing = false,
  transcript,
  response,
  onClose,
  onStartListening,
  onStopListening,
  onStopSpeaking,
}: VoiceAgentModalProps) {
  const hasAutoStartedRef = useRef(false);
  const hasPrimedSpeechRef = useRef(false);

  // Prime speech synthesis on first open (Chrome requires user interaction)
  useEffect(() => {
    if (isOpen && !hasPrimedSpeechRef.current && typeof window !== 'undefined') {
      console.log('[VoiceAgentModal] Priming speech synthesis...');
      hasPrimedSpeechRef.current = true;
      
      // Trigger voice loading
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[VoiceAgentModal] Available voices:', voices.length);
        
        if (voices.length === 0) {
          console.log('[VoiceAgentModal] Waiting for voices to load...');
          // Voices will load async
        } else {
          console.log('[VoiceAgentModal] Voices already loaded');
        }
      };
      
      // Load voices
      loadVoices();
      
      // Also listen for voices changed event
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Speak empty utterance to prime the system (Chrome requirement)
      const primeUtterance = new SpeechSynthesisUtterance('');
      primeUtterance.volume = 0; // Silent
      window.speechSynthesis.speak(primeUtterance);
      
      console.log('[VoiceAgentModal] ✅ Speech synthesis primed');
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, [isOpen]);

  // Auto-start listening when modal opens (only once)
  useEffect(() => {
    if (isOpen && !hasAutoStartedRef.current) {
      console.log('[VoiceAgentModal] Modal opened, auto-starting listening in 300ms...');
      hasAutoStartedRef.current = true;
      
      const timer = setTimeout(() => {
        console.log('[VoiceAgentModal] Calling onStartListening()');
        onStartListening();
      }, 300);
      
      return () => {
        console.log('[VoiceAgentModal] Cleaning up timer');
        clearTimeout(timer);
      };
    }
    
    // Reset flag when modal closes
    if (!isOpen) {
      hasAutoStartedRef.current = false;
    }
  }, [isOpen, onStartListening]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
        aria-label="Close voice agent"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main content - scrollable */}
      <div className="flex flex-col items-center justify-center max-w-2xl w-full px-8 py-8 max-h-screen overflow-y-auto">
        {/* Animated microphone icon */}
        <div className="relative mb-8 flex-shrink-0">
          {/* Pulsing rings */}
          {(isListening || isProcessing) && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
            </>
          )}
          
          {/* Icon */}
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening 
              ? 'bg-gradient-to-br from-primary to-secondary shadow-2xl shadow-primary/50 scale-110' 
              : isProcessing
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-2xl shadow-yellow-500/50'
              : isSpeaking
              ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-2xl shadow-blue-500/50'
              : 'bg-white/10'
          }`}>
            {isListening ? (
              <Mic className="h-16 w-16 text-white animate-pulse" />
            ) : isProcessing ? (
              <Loader2 className="h-16 w-16 text-white animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="h-16 w-16 text-white animate-pulse" />
            ) : (
              <Mic className="h-16 w-16 text-white/60" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center mb-6 flex-shrink-0">
          {isListening && (
            <>
              <p className="text-2xl font-semibold text-white mb-2">
                Listening...
              </p>
              <p className="text-sm text-white/60">
                Speak your question
              </p>
            </>
          )}
          {isProcessing && (
            <>
              <p className="text-2xl font-semibold text-white mb-2">
                Processing...
              </p>
              <p className="text-sm text-white/60">
                Getting your answer
              </p>
            </>
          )}
          {isSpeaking && (
            <>
              <p className="text-2xl font-semibold text-white mb-2">
                Speaking...
              </p>
              <p className="text-sm text-white/60">
                AI is responding
              </p>
            </>
          )}
          {!isListening && !isSpeaking && !isProcessing && (
            <>
              <p className="text-2xl font-semibold text-white mb-2">
                Ready
              </p>
              <p className="text-sm text-white/60">
                Click to start or say your question
              </p>
            </>
          )}
        </div>

        {/* Transcript display - scrollable */}
        {transcript && (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-4 border border-white/20 animate-in slide-in-from-bottom max-h-48 overflow-y-auto">
            <p className="text-sm text-white/60 mb-2">You said:</p>
            <p className="text-lg text-white whitespace-pre-wrap break-words">{transcript}</p>
          </div>
        )}

        {/* Response display - scrollable */}
        {response && (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 animate-in slide-in-from-bottom max-h-64 overflow-y-auto">
            <p className="text-sm text-white/60 mb-2">Credora:</p>
            <p className="text-lg text-white whitespace-pre-wrap break-words">{response}</p>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-4 mt-8 flex-shrink-0">
          {isListening ? (
            <Button
              onClick={onStopListening}
              variant="secondary"
              size="lg"
              className="px-8"
            >
              Stop Listening
            </Button>
          ) : isSpeaking && onStopSpeaking ? (
            <Button
              onClick={onStopSpeaking}
              variant="secondary"
              size="lg"
              className="px-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            >
              Stop Speaking
            </Button>
          ) : !isProcessing && (
            <Button
              onClick={onStartListening}
              variant="primary"
              size="lg"
              className="px-8"
            >
              Start Listening
            </Button>
          )}
        </div>

        {/* Hint */}
        <p className="text-xs text-white/40 mt-8 flex-shrink-0">
          Press ESC to close • Say "Hey Credora" or "Hey CFO" anytime • Chat history saved automatically
        </p>
      </div>
    </div>
  );
}
