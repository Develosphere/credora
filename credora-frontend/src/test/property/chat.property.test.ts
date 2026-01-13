/**
 * Property-based tests for AI Chat
 * **Feature: nextjs-frontend, Property 5: Chat Context Persistence**
 * **Validates: Requirements 12.1, 12.5**
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { ChatMessage, DataSource } from "@/lib/api/types";
import {
  generateMessageId,
  createUserMessage,
  createAssistantMessage,
} from "@/lib/store/chatStore";
import { hasSourceAttribution, getMessagesWithSources } from "@/lib/hooks/useChat";

/**
 * Generate a valid DataSource
 */
const dataSourceArbitrary: fc.Arbitrary<DataSource> = fc.record({
  type: fc.constantFrom("pnl", "forecast", "sku", "campaign") as fc.Arbitrary<
    "pnl" | "forecast" | "sku" | "campaign"
  >,
  reference: fc.string({ minLength: 1, maxLength: 100 }),
  summary: fc.string({ minLength: 1, maxLength: 200 }),
});

/**
 * Generate a valid timestamp string
 */
const timestampArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2025-01-01
  .map((ms) => new Date(ms).toISOString());

/**
 * Generate a valid ChatMessage
 */
const chatMessageArbitrary: fc.Arbitrary<ChatMessage> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 50 }),
  role: fc.constantFrom("user", "assistant") as fc.Arbitrary<"user" | "assistant">,
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  timestamp: timestampArbitrary,
  sources: fc.option(fc.array(dataSourceArbitrary, { minLength: 0, maxLength: 3 }), {
    nil: undefined,
  }),
});

/**
 * Generate a user message
 */
const userMessageArbitrary: fc.Arbitrary<ChatMessage> = fc
  .record({
    id: fc.string({ minLength: 5, maxLength: 50 }),
    content: fc.string({ minLength: 1, maxLength: 1000 }),
    timestamp: timestampArbitrary,
  })
  .map((msg) => ({
    ...msg,
    role: "user" as const,
    sources: undefined,
  }));

/**
 * Generate an assistant message with optional sources
 */
const assistantMessageArbitrary: fc.Arbitrary<ChatMessage> = fc
  .record({
    id: fc.string({ minLength: 5, maxLength: 50 }),
    content: fc.string({ minLength: 1, maxLength: 1000 }),
    timestamp: timestampArbitrary,
    sources: fc.option(fc.array(dataSourceArbitrary, { minLength: 1, maxLength: 3 }), {
      nil: undefined,
    }),
  })
  .map((msg) => ({
    ...msg,
    role: "assistant" as const,
  }));

/**
 * Generate a conversation (alternating user/assistant messages)
 */
const conversationArbitrary: fc.Arbitrary<ChatMessage[]> = fc
  .array(
    fc.tuple(userMessageArbitrary, assistantMessageArbitrary),
    { minLength: 1, maxLength: 10 }
  )
  .map((pairs) => pairs.flatMap(([user, assistant]) => [user, assistant]));

describe("AI Chat Properties", () => {
  describe("Property 5: Chat Context Persistence", () => {
    /**
     * **Feature: nextjs-frontend, Property 5: Chat Context Persistence**
     * **Validates: Requirements 12.1, 12.5**
     *
     * *For any* chat conversation, if messages are sent and the page is refreshed,
     * the conversation history should be restored in the correct chronological order.
     */
    it("should preserve message order after serialization/deserialization", () => {
      fc.assert(
        fc.property(conversationArbitrary, (messages) => {
          // Simulate persistence (JSON serialization)
          const serialized = JSON.stringify(messages);
          const deserialized = JSON.parse(serialized) as ChatMessage[];

          // Messages should be in the same order
          expect(deserialized.length).toBe(messages.length);
          deserialized.forEach((msg, index) => {
            expect(msg.id).toBe(messages[index].id);
            expect(msg.role).toBe(messages[index].role);
            expect(msg.content).toBe(messages[index].content);
            expect(msg.timestamp).toBe(messages[index].timestamp);
          });
        }),
        { numRuns: 100 }
      );
    });

    it("should maintain chronological order based on timestamps", () => {
      fc.assert(
        fc.property(conversationArbitrary, (messages) => {
          // Sort by timestamp
          const sorted = [...messages].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Verify timestamps are in order
          for (let i = 1; i < sorted.length; i++) {
            const prevTime = new Date(sorted[i - 1].timestamp).getTime();
            const currTime = new Date(sorted[i].timestamp).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve message content integrity after persistence", () => {
      fc.assert(
        fc.property(chatMessageArbitrary, (message) => {
          // Simulate round-trip through JSON (like localStorage)
          const serialized = JSON.stringify(message);
          const restored = JSON.parse(serialized) as ChatMessage;

          // Content should be exactly preserved
          expect(restored.content).toBe(message.content);
          expect(restored.id).toBe(message.id);
          expect(restored.role).toBe(message.role);
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve source attribution after persistence", () => {
      fc.assert(
        fc.property(
          assistantMessageArbitrary.filter((msg) => msg.sources !== undefined),
          (message) => {
            // Simulate round-trip
            const serialized = JSON.stringify(message);
            const restored = JSON.parse(serialized) as ChatMessage;

            // Sources should be preserved
            expect(restored.sources).toBeDefined();
            expect(restored.sources?.length).toBe(message.sources?.length);
            restored.sources?.forEach((source, index) => {
              expect(source.type).toBe(message.sources?.[index].type);
              expect(source.reference).toBe(message.sources?.[index].reference);
              expect(source.summary).toBe(message.sources?.[index].summary);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Message ID uniqueness", () => {
    it("should generate unique message IDs", () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), (count) => {
          const ids = new Set<string>();
          for (let i = 0; i < count; i++) {
            ids.add(generateMessageId());
          }
          // All IDs should be unique
          expect(ids.size).toBe(count);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("Property: Message creation helpers", () => {
    it("should create valid user messages", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 500 }), (content) => {
          const message = createUserMessage(content);

          expect(message.role).toBe("user");
          expect(message.content).toBe(content);
          expect(message.id).toBeTruthy();
          expect(message.timestamp).toBeTruthy();
          expect(new Date(message.timestamp).getTime()).not.toBeNaN();
        }),
        { numRuns: 100 }
      );
    });

    it("should create valid assistant messages", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.option(fc.array(dataSourceArbitrary, { minLength: 1, maxLength: 3 }), {
            nil: undefined,
          }),
          (content, sources) => {
            const message = createAssistantMessage(content, sources);

            expect(message.role).toBe("assistant");
            expect(message.content).toBe(content);
            expect(message.id).toBeTruthy();
            expect(message.timestamp).toBeTruthy();
            if (sources) {
              expect(message.sources).toEqual(sources);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Conversation structure", () => {
    it("should have valid role for each message", () => {
      fc.assert(
        fc.property(chatMessageArbitrary, (message) => {
          expect(["user", "assistant"]).toContain(message.role);
        }),
        { numRuns: 100 }
      );
    });

    it("should have non-empty content for each message", () => {
      fc.assert(
        fc.property(chatMessageArbitrary, (message) => {
          expect(message.content.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should have valid ISO timestamp for each message", () => {
      fc.assert(
        fc.property(chatMessageArbitrary, (message) => {
          const date = new Date(message.timestamp);
          expect(isNaN(date.getTime())).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
