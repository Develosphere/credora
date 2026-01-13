/**
 * Chat Store with Zustand
 * Manages chat messages, loading state, and error state
 * Requirements: 12.1
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, DataSource } from "@/lib/api/types";

interface ChatState {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  isHistoryLoaded: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateLastMessage: (content: string, sources?: DataSource[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setHistoryLoaded: (loaded: boolean) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  isLoading: false,
  error: null,
  isHistoryLoaded: false,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      ...initialState,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
          error: null,
        })),

      setMessages: (messages) =>
        set({
          messages,
          error: null,
        }),

      updateLastMessage: (content, sources) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            messages[messages.length - 1] = {
              ...lastMessage,
              content,
              sources: sources || lastMessage.sources,
            };
          }
          return { messages };
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      setHistoryLoaded: (isHistoryLoaded) => set({ isHistoryLoaded }),

      clearMessages: () =>
        set({
          messages: [],
          error: null,
          isHistoryLoaded: false,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "credora-chat-store",
      partialize: (state) => ({
        // Only persist messages, not loading/error state
        messages: state.messages,
        isHistoryLoaded: state.isHistoryLoaded,
      }),
    }
  )
);

/**
 * Helper to generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to create a user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create an assistant message
 */
export function createAssistantMessage(
  content: string,
  sources?: DataSource[]
): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    sources,
  };
}
