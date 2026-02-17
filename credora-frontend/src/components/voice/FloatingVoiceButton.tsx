/**
 * Floating Voice Button
 * Always-visible button to trigger voice agent (like ChatGPT voice)
 * Now draggable for user convenience
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { detectBrowserSupport } from '@/lib/voice/browserSupport';

interface FloatingVoiceButtonProps {
  onClick: () => void;
}

export function FloatingVoiceButton({ onClick }: FloatingVoiceButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const support = detectBrowserSupport();
    setIsSupported(support.speechRecognition && support.speechSynthesis);
    
    // Set initial position (bottom-right corner)
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - 120,
        y: window.innerHeight - 120
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep button within viewport bounds
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(16, Math.min(newX, maxX)),
        y: Math.max(16, Math.min(newY, maxY))
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(16, Math.min(newX, maxX)),
        y: Math.max(16, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not dragging
    if (!isDragging) {
      onClick();
    }
  };

  // Don't render on server
  if (!isMounted || !isSupported) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className="fixed z-40 h-16 w-16 rounded-full bg-gradient-to-br from-credora-orange to-credora-red text-white shadow-2xl shadow-credora-orange/50 hover:shadow-credora-orange/70 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      aria-label="Open voice assistant"
      title="Talk to Credora (Drag to move, Click to open)"
    >
      {/* Pulsing ring animation */}
      <div className="absolute inset-0 rounded-full bg-credora-orange/20 animate-ping" />
      
      {/* Icon */}
      <Mic className="h-7 w-7 relative z-10 group-hover:scale-110 transition-transform" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Drag to move • Say "Hey Credora"
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
      </div>
    </button>
  );
}
