"use client";

/**
 * Chat Window Component
 * Displays message history with auto-scroll to latest message
 * Requirements: 12.1
 */

import { useEffect, useRef } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useChatStore } from "@/lib/store/chatStore";

interface ChatWindowProps {
  className?: string;
}

export function ChatWindow({ className = "" }: ChatWindowProps) {
  const { messages, isLoading, isHistoryLoaded } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Empty state
  if (!isHistoryLoaded) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        <p className="text-sm text-gray-500 mt-2">Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Start a conversation</h3>
        <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">
          Ask me anything about your business finances. I can help with P&L analysis,
          cash flow forecasting, SKU performance, and more.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
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
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {/* Loading indicator for pending response */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

/**
 * Suggestion chip for empty state
 */
function SuggestionChip({ text }: { text: string }) {
  const { addMessage } = useChatStore();

  const handleClick = () => {
    // This would typically trigger sending the message
    // For now, just add it as a user message
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
      className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
    >
      {text}
    </button>
  );
}
