/**
 * Floating Voice Button
 * Always-visible button to trigger voice agent (like ChatGPT voice)
 */

'use client';

import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { detectBrowserSupport } from '@/lib/voice/browserSupport';

interface FloatingVoiceButtonProps {
  onClick: () => void;
}

export function FloatingVoiceButton({ onClick }: FloatingVoiceButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const support = detectBrowserSupport();
    setIsSupported(support.speechRecognition && support.speechSynthesis);
  }, []);

  // Don't render on server
  if (!isMounted || !isSupported) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl shadow-primary/50 hover:shadow-primary/70 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      aria-label="Open voice assistant"
      title="Talk to Credora (Click or say 'Hey Credora' / 'Hey CFO')"
    >
      {/* Pulsing ring animation */}
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      
      {/* Icon */}
      <Mic className="h-7 w-7 relative z-10 group-hover:scale-110 transition-transform" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Say "Hey Credora" or "Hey CFO"
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
      </div>
    </button>
  );
}
