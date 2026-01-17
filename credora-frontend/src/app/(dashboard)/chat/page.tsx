"use client";

/**
 * AI Chat Page
 * Full chat interface with history, input, and RAG-powered responses
 * Requirements: 12.1, 12.2, 12.4, 12.6
 */

import { MessageSquare, Trash2, RefreshCw, AlertCircle } from "lucide-react";
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-credora-orange" />
            AI Assistant
          </h1>
          <p className="text-gray-400 mt-1">
            Ask questions about your business finances
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refetchHistory}
            className="p-2 text-gray-500 hover:text-credora-orange hover:bg-[#282828] rounded-lg transition-colors"
            title="Refresh history"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={clearHistory}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error.message}</span>
          <button
            onClick={refetchHistory}
            className="ml-auto text-sm font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat Window */}
      <div className="flex-1 mt-4 bg-[#1e1e1e] rounded-lg border border-[#2a2a2a] overflow-hidden">
        <ChatWindow className="h-full" />
      </div>

      {/* Chat Input */}
      <div className="mt-4">
        <ChatInput
          onSend={sendMessage}
          isLoading={isSending}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
