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
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            AI Assistant
          </h1>
          <p className="text-gray-500 mt-1">
            Ask questions about your business finances
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refetchHistory}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh history"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={clearHistory}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
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
      <div className="flex-1 mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
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
