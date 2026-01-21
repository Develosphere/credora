"use client";

/**
 * Chat Input Component - Modern Design
 * Handles message submission with loading state
 * Requirements: 12.2
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Paperclip, FileText, Sparkles } from "lucide-react";

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
      <div className="relative bg-[#2a2a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-primary/20">
        {/* Glow effect on focus */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        
        <div className="relative flex items-end gap-3 p-4">
          {/* Attach Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2.5 text-gray-400 hover:text-primary hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: "200px" }}
          />

          {/* Import Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2.5 text-gray-400 hover:text-primary hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
            title="Import data"
          >
            <FileText className="h-5 w-5" />
          </button>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`group relative flex-shrink-0 p-3 rounded-xl transition-all duration-300 overflow-hidden ${
              canSubmit
                ? "bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95"
                : "bg-white/5 text-gray-600 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            {/* Shine effect */}
            {canSubmit && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            )}
            
            <div className="relative z-10">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </div>
          </button>

          {/* Public Toggle */}
          <button
            type="button"
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
            title="Toggle public"
          >
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className="text-xs font-medium">Public</span>
          </button>
        </div>
      </div>
      
      {/* Helper text */}
      <div className="mt-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI-powered responses with real-time data</span>
        </div>
        <span className="text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">Enter</kbd> to send
        </span>
      </div>
    </form>
  );
}
