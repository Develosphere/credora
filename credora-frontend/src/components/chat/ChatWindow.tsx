"use client";

/**
 * Chat Window Component - Modern Design
 * Displays message history with auto-scroll to latest message
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageSquare, Loader2, Sparkles, Zap, TrendingUp, DollarSign } from "lucide-react";
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="text-sm text-gray-400 mt-4">Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full px-4 ${className}`}>
        {/* AI Icon with Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-2xl shadow-primary/30 animate-float p-4">
            <div className="relative w-full h-full">
              <Image
                src="/images/circlelogo.png"
                alt="Credora AI"
                fill
                className="object-contain"
              />
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary blur-2xl opacity-50 animate-pulse"></div>
        </div>

        {/* Welcome Text */}
        <h3 className="text-2xl font-bold text-white mb-2">Welcome to AI CFO</h3>
        <p className="text-sm text-gray-400 text-center max-w-md mb-8">
          I'm your AI-powered financial assistant. Ask me anything about your business finances, and I'll provide insights backed by real data.
        </p>

        {/* Suggestion Chips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
          <SuggestionChip 
            icon={<TrendingUp className="h-4 w-4" />}
            text="How is my business performing?" 
          />
          <SuggestionChip 
            icon={<DollarSign className="h-4 w-4" />}
            text="What's my cash runway?" 
          />
          <SuggestionChip 
            icon={<Zap className="h-4 w-4" />}
            text="Which SKUs are most profitable?" 
          />
          <SuggestionChip 
            icon={<MessageSquare className="h-4 w-4" />}
            text="Analyze my ad campaign performance" 
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col overflow-y-auto ${className}`}
    >
      <div className="flex-1 space-y-6 p-6">
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
          <div className="flex items-start gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 p-2">
              <div className="relative w-full h-full">
                <Image
                  src="/images/circlelogo.png"
                  alt="AI"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div className="bg-[#2a2a2a]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-400 ml-2">AI is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function SuggestionChip({ text, icon }: { text: string; icon: React.ReactNode }) {
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
        "group relative px-5 py-4 text-sm font-medium rounded-xl overflow-hidden",
        "bg-white/5 backdrop-blur-sm border border-white/10",
        "text-gray-300 hover:text-white",
        "hover:border-primary/50 hover:bg-white/10",
        "transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/20",
        "text-left"
      )}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <span>{text}</span>
      </div>
    </button>
  );
}
