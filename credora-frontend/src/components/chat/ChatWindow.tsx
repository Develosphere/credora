"use client";

/**
 * Chat Window Component
 * Displays message history with auto-scroll to latest message
 */

import { useEffect, useRef } from "react";
import { MessageSquare, Loader2, Sparkles } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useChatStore } from "@/lib/store/chatStore";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  className?: string;
}

export function ChatWindow({ className = "" }: ChatWindowProps) {
  const { messages, isLoading, isHistoryLoaded } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!isHistoryLoaded) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-credora-orange to-credora-red text-white shadow-glow animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 mt-4">Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full px-4 ${className}`}>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center mb-6 shadow-glow animate-float">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Start a conversation</h3>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
          Ask me anything about your business finances. I can help with P&L analysis,
          cash flow forecasting, SKU performance, and more.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center max-w-lg">
          <SuggestionChip text="How is my business performing?" />
          <SuggestionChip text="What's my cash runway?" />
          <SuggestionChip text="Which SKUs are most profitable?" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col overflow-y-auto ${className}`}
    >
      <div className="flex-1 space-y-4 p-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ChatMessage message={message} />
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center flex-shrink-0 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-credora-orange animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-credora-orange animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-credora-orange animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-500 ml-2">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  const { addMessage } = useChatStore();

  const handleClick = () => {
    addMessage({
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-xl",
        "bg-white border border-gray-200",
        "text-gray-700 hover:text-credora-orange",
        "hover:border-credora-orange/30 hover:bg-primary-light",
        "transition-all duration-200 hover:translate-y-[-2px] hover:shadow-card"
      )}
    >
      {text}
    </button>
  );
}
