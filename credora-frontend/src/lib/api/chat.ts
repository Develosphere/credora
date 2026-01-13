/**
 * Chat API module
 * Handles AI chat with RAG capabilities via Python API
 */

import { pythonApi } from "./client";
import type { ChatMessage, ChatResponse } from "./types";

/**
 * Send a message to the AI assistant
 * User ID is automatically included from the session
 */
export async function sendMessage(message: string): Promise<ChatResponse> {
  return pythonApi.post<ChatResponse>("/chat/message", { message });
}

/**
 * Get chat history for the current user
 */
export async function getHistory(): Promise<ChatMessage[]> {
  return pythonApi.get<ChatMessage[]>("/chat/history");
}

/**
 * Clear chat history for the current user
 */
export async function clearHistory(): Promise<void> {
  await pythonApi.delete("/chat/history");
}

/**
 * Chat API object for convenience
 */
export const chatApi = {
  sendMessage,
  getHistory,
  clearHistory,
};
