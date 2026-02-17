/**
 * Voice-Controlled CFO - Voice Microphone Button Component
 * 
 * Button component for voice input with visual feedback and keyboard shortcuts.
 * Validates: Requirements US-1.1, US-1.4, US-4.4, TR-4.1
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput, useVoiceSettingsStore } from '@/lib/voice';
import type { VoiceMicrophoneButtonProps } from '@/lib/voice/types';

/**
 * Voice microphone button with state management and visual feedback
 * 
 * Features:
 * - Visual states: idle, listening, processing, error
 * - Keyboard shortcut: Ctrl/Cmd + Shift + M
 * - Touch-friendly (48x48px minimum)
 * - ARIA labels for accessibility
 * - Error handling with user feedback
 * 
 * @param props - Component props
 */
export function VoiceMicrophoneButton({
  onTranscript,
  disabled = false,
  className = '',
}: VoiceMicrophoneButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const voiceInputEnabled = useVoiceSettingsStore((state) => state.voiceInputEnabled);
  
  // Only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    error,
    clearError,
  } = useVoiceInput({
    continuous: false,
    interimResults: true,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        onTranscript(text);
        stopListening();
      }
    },
    onError: (err) => {
      console.error('Voice input error:', err);
    },
  });

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(() => {
    if (error) {
      clearError();
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, error, startListening, stopListening, clearError]);

  /**
   * Keyboard shortcut handler (Ctrl/Cmd + Shift + M)
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Shift + M
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'm'
      ) {
        event.preventDefault();
        
        if (!disabled && voiceInputEnabled && isSupported) {
          toggleListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, voiceInputEnabled, isSupported, toggleListening]);

  // Don't render on server or if not mounted
  if (!isMounted) {
    return null;
  }

  // Don't render if not supported or disabled in settings
  if (!isSupported) {
    console.log('[VoiceMicrophoneButton] Browser not supported for voice input');
    return null;
  }
  
  if (!voiceInputEnabled) {
    console.log('[VoiceMicrophoneButton] Voice input disabled in settings');
    return null;
  }
  
  console.log('[VoiceMicrophoneButton] Rendering button', { isSupported, voiceInputEnabled, isListening });

  // Determine button state
  const getButtonState = () => {
    if (error) return 'error';
    if (isListening) return 'listening';
    return 'idle';
  };

  const buttonState = getButtonState();

  // Button styling based on state
  const getButtonVariant = (): "primary" | "secondary" | "ghost" | "outline" => {
    switch (buttonState) {
      case 'listening':
        return 'primary';
      case 'error':
        return 'secondary'; // Use secondary for error state (orange/red)
      default:
        return 'outline';
    }
  };

  // Icon based on state
  const getIcon = () => {
    switch (buttonState) {
      case 'listening':
        return <Mic className="h-5 w-5 animate-pulse" />;
      case 'error':
        return <MicOff className="h-5 w-5" />;
      default:
        return <Mic className="h-5 w-5" />;
    }
  };

  // ARIA label based on state
  const getAriaLabel = () => {
    switch (buttonState) {
      case 'listening':
        return 'Stop voice input (Ctrl+Shift+M)';
      case 'error':
        return `Voice input error: ${error?.message}. Click to retry.`;
      default:
        return 'Start voice input (Ctrl+Shift+M)';
    }
  };

  return (
    <Button
      type="button"
      variant={getButtonVariant()}
      size="md"
      onClick={toggleListening}
      disabled={disabled}
      className={`min-h-[48px] min-w-[48px] transition-all bg-blue-500 hover:bg-blue-600 ${className}`}
      aria-label={getAriaLabel()}
      aria-pressed={isListening}
      title={getAriaLabel()}
    >
      {getIcon()}
    </Button>
  );
}
