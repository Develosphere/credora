"use client";

/**
 * AI Chat Page - Premium Modern Design
 * Full chat interface with history, input, and RAG-powered responses
 * Requirements: 12.1, 12.2, 12.4, 12.6
 */

import Image from "next/image";
import { MessageSquare, Trash2, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { ChatWindow, ChatInput } from "@/components/chat";
import { useChat } from "@/lib/hooks/useChat";

export default function ChatPage() {
  const {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    clearHistory,
    refetchHistory,
  } = useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Page Header */}
      <div className="relative z-10 flex items-center justify-between pb-6">
        <div className="flex items-center gap-4">
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
            <div className="relative w-8 h-8">
              <Image
                src="/images/circlelogo.png"
                alt="Credora"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              AI CFO Assistant
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Get instant insights about your business finances powered by AI
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refetchHistory}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
            title="Refresh history"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={clearHistory}
            className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
            title="Clear history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="relative z-10 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm flex-1">{error.message}</span>
          <button
            onClick={refetchHistory}
            className="text-sm font-medium hover:underline px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat Window */}
      <div className="relative z-10 flex-1 bg-[#1a1a1a]/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <ChatWindow className="h-full" />
      </div>

      {/* Chat Input */}
      <div className="relative z-10 mt-4">
        <ChatInput
          onSend={sendMessage}
          isLoading={isSending}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
