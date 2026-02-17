"use client";

/**
 * Chat Input Component - Modern Design
 * Handles message submission with loading state
 * Voice input now available globally via floating button
 * Requirements: 12.2, US-1.3, US-3.2
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Ask about your business finances...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSend(trimmedMessage);
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSubmit = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Main Input Container */}
      <div className="relative bg-[#2a2a2a]/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 focus-within:shadow-credora-orange/20 focus-within:ring-2 focus-within:ring-credora-orange/30">
        {/* Glow effect on focus */}
        <div className="absolute inset-0 bg-gradient-to-r from-credora-orange/5 to-credora-red/5 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        
        <div className="relative flex items-center gap-3 p-3">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-2 min-h-[44px] max-h-[200px]"
          />

          {/* Send Button with Animation */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`group relative flex-shrink-0 w-11 h-11 rounded-xl transition-all duration-300 overflow-hidden ${
              canSubmit
                ? "bg-gradient-to-r from-credora-orange to-credora-red text-white hover:shadow-lg hover:shadow-credora-orange/50 hover:scale-110 active:scale-95 animate-pulse-slow"
                : "bg-[#1e1e1e] text-gray-600 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            {/* Animated gradient background */}
            {canSubmit && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-credora-orange via-credora-red to-credora-orange bg-[length:200%_100%] animate-gradient"></div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-xl bg-credora-orange/30 animate-ping-slow"></div>
              </>
            )}
            
            <div className="relative z-10 flex items-center justify-center h-full">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </div>
          </button>
        </div>
      </div>
      
      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-credora-orange animate-pulse" />
          <span>AI-powered responses</span>
        </div>
        <span className="text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-[10px] font-mono">Enter</kbd> to send
        </span>
      </div>
    </form>
  );
}
