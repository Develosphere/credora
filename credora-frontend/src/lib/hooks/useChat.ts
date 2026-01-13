/**
 * useChat hook - Manages chat API integration
 * Loads history on mount and sends messages with user_id
 * Requirements: 12.1, 12.2
 */

import { useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api/chat";
import {
  useChatStore,
  createUserMessage,
  createAssistantMessage,
} from "@/lib/store/chatStore";
import type { ChatMessage } from "@/lib/api/types";

export interface UseChatResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  sendMessage: (content: string) => void;
  clearHistory: () => void;
  refetchHistory: () => void;
}

export function useChat(): UseChatResult {
  const queryClient = useQueryClient();
  const {
    messages,
    isLoading: storeLoading,
    error: storeError,
    isHistoryLoaded,
    setMessages,
    addMessage,
    setLoading,
    setError,
    setHistoryLoaded,
    clearMessages,
  } = useChatStore();

  // Fetch chat history on mount
  const historyQuery = useQuery({
    queryKey: ["chat", "history"],
    queryFn: chatApi.getHistory,
    enabled: !isHistoryLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Update store when history is fetched
  useEffect(() => {
    if (historyQuery.data && !isHistoryLoaded) {
      setMessages(historyQuery.data);
      setHistoryLoaded(true);
    }
  }, [historyQuery.data, isHistoryLoaded, setMessages, setHistoryLoaded]);

  // Handle history fetch error
  useEffect(() => {
    if (historyQuery.error) {
      setError(historyQuery.error as Error);
      // Still mark as loaded so user can start fresh
      setHistoryLoaded(true);
    }
  }, [historyQuery.error, setError, setHistoryLoaded]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onMutate: async (messageContent: string) => {
      // Optimistically add user message
      const userMessage = createUserMessage(messageContent);
      addMessage(userMessage);
      setLoading(true);
      return { userMessage };
    },
    onSuccess: (response) => {
      // Add assistant response
      addMessage(response.message);
      setLoading(false);
      
      // Invalidate history cache
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
    },
    onError: (error: Error) => {
      setError(error);
      setLoading(false);
    },
  });

  // Clear history mutation
  const clearMutation = useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () => {
      clearMessages();
      setHistoryLoaded(true);
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
    },
    onError: (error: Error) => {
      setError(error);
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      sendMutation.mutate(content);
    },
    [sendMutation]
  );

  const clearHistory = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  const refetchHistory = useCallback(() => {
    setHistoryLoaded(false);
    queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
  }, [queryClient, setHistoryLoaded]);

  return {
    messages,
    isLoading: storeLoading || historyQuery.isLoading,
    isSending: sendMutation.isPending,
    error: storeError || (historyQuery.error as Error | null),
    sendMessage,
    clearHistory,
    refetchHistory,
  };
}

/**
 * Hook to check if chat has source attribution
 * Used for testing Property 10: RAG Source Attribution
 */
export function hasSourceAttribution(message: ChatMessage): boolean {
  return (
    message.role === "assistant" &&
    message.sources !== undefined &&
    message.sources.length > 0
  );
}

/**
 * Get messages with source attribution
 */
export function getMessagesWithSources(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(hasSourceAttribution);
}
