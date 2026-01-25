/**
 * Voice Agent Modal
 * Full-screen voice interface with fast direct API integration
 * Optimized for 1-2 second response time
 */

'use client';

import { useEffect } from 'react';
import { X, Mic, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceAgentModalProps {
  isOpen: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  response: string;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
}

export function VoiceAgentModal({
  isOpen,
  isListening,
  isSpeaking,
  transcript,
  response,
  onClose,
  onStartListening,
  onStopListening,
}: VoiceAgentModalProps) {
  // Auto-start listening when modal opens
  useEffect(() => {
    if (isOpen && !isListening && !isSpeaking) {
      onStartListening();
    }
  }, [isOpen, isListening, isSpeaking, onStartListening]);

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

  // Determine if we're processing (transcript exists but no response yet and not speaking)
  const isProcessing = transcript && !response && !isSpeaking && !isListening;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
        aria-label="Close voice agent"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center max-w-2xl w-full px-8">
        {/* Animated microphone icon */}
        <div className="relative mb-8">
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
        <div className="text-center mb-6">
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

        {/* Transcript display */}
        {transcript && (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-4 border border-white/20 animate-in slide-in-from-bottom">
            <p className="text-sm text-white/60 mb-2">You said:</p>
            <p className="text-lg text-white">{transcript}</p>
          </div>
        )}

        {/* Response display */}
        {response && (
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 animate-in slide-in-from-bottom">
            <p className="text-sm text-white/60 mb-2">Credora:</p>
            <p className="text-lg text-white">{response}</p>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-4 mt-8">
          {isListening ? (
            <Button
              onClick={onStopListening}
              variant="secondary"
              size="lg"
              className="px-8"
            >
              Stop Listening
            </Button>
          ) : !isSpeaking && !isProcessing && (
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
        <p className="text-xs text-white/40 mt-8">
          Press ESC to close • Say "Hey Credora" or "Hey CFO" anytime • Chat history saved automatically
        </p>
      </div>
    </div>
  );
}
