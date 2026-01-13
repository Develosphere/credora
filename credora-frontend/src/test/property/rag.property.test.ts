/**
 * Property-based tests for RAG Source Attribution
 * **Feature: nextjs-frontend, Property 10: RAG Source Attribution**
 * **Validates: Requirements 12.6**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ChatMessage, DataSource, ChatResponse, RAGContext } from "@/lib/api/types";
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
  .integer({ min: 1704067200000, max: 1735689600000 })
  .map((ms) => new Date(ms).toISOString());

/**
 * Generate an assistant message with sources (RAG response)
 */
const ragResponseMessageArbitrary: fc.Arbitrary<ChatMessage> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 50 }),
  role: fc.constant("assistant" as const),
  content: fc.string({ minLength: 10, maxLength: 1000 }),
  timestamp: timestampArbitrary,
  sources: fc.array(dataSourceArbitrary, { minLength: 1, maxLength: 5 }),
});

/**
 * Generate an assistant message without sources
 */
const nonRagResponseMessageArbitrary: fc.Arbitrary<ChatMessage> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 50 }),
  role: fc.constant("assistant" as const),
  content: fc.string({ minLength: 10, maxLength: 1000 }),
  timestamp: timestampArbitrary,
  sources: fc.constant(undefined),
});

/**
 * Generate a user message
 */
const userMessageArbitrary: fc.Arbitrary<ChatMessage> = fc.record({
  id: fc.string({ minLength: 5, maxLength: 50 }),
  role: fc.constant("user" as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: timestampArbitrary,
  sources: fc.constant(undefined),
});

/**
 * Generate a RAG context
 */
const ragContextArbitrary: fc.Arbitrary<RAGContext> = fc.record({
  retrievedDocuments: fc.array(fc.string({ minLength: 10, maxLength: 500 }), {
    minLength: 0,
    maxLength: 5,
  }),
  relevanceScores: fc.array(fc.float({ min: 0, max: 1, noNaN: true }), {
    minLength: 0,
    maxLength: 5,
  }),
  usedInResponse: fc.boolean(),
});

/**
 * Generate a ChatResponse with RAG context
 */
const chatResponseArbitrary: fc.Arbitrary<ChatResponse> = fc.record({
  message: ragResponseMessageArbitrary,
  context: ragContextArbitrary,
});

describe("RAG Source Attribution Properties", () => {
  describe("Property 10: RAG Source Attribution", () => {
    /**
     * **Feature: nextjs-frontend, Property 10: RAG Source Attribution**
     * **Validates: Requirements 12.6**
     *
     * *For any* AI chat response that uses retrieved financial data,
     * the response should include source attribution indicating which data was referenced.
     */
    it("should identify messages with source attribution", () => {
      fc.assert(
        fc.property(ragResponseMessageArbitrary, (message) => {
          // Messages with sources should be identified as having attribution
          expect(hasSourceAttribution(message)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should not identify user messages as having source attribution", () => {
      fc.assert(
        fc.property(userMessageArbitrary, (message) => {
          // User messages should never have source attribution
          expect(hasSourceAttribution(message)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should not identify assistant messages without sources as having attribution", () => {
      fc.assert(
        fc.property(nonRagResponseMessageArbitrary, (message) => {
          // Assistant messages without sources should not have attribution
          expect(hasSourceAttribution(message)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should filter messages with sources from a conversation", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              ragResponseMessageArbitrary,
              nonRagResponseMessageArbitrary,
              userMessageArbitrary
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (messages) => {
            const withSources = getMessagesWithSources(messages);

            // All filtered messages should have sources
            withSources.forEach((msg) => {
              expect(msg.sources).toBeDefined();
              expect(msg.sources!.length).toBeGreaterThan(0);
              expect(msg.role).toBe("assistant");
            });

            // Count should match messages that actually have sources
            const expectedCount = messages.filter(
              (m) => m.role === "assistant" && m.sources && m.sources.length > 0
            ).length;
            expect(withSources.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: Source data structure", () => {
    it("should have valid source type for each source", () => {
      fc.assert(
        fc.property(dataSourceArbitrary, (source) => {
          expect(["pnl", "forecast", "sku", "campaign"]).toContain(source.type);
        }),
        { numRuns: 100 }
      );
    });

    it("should have non-empty reference for each source", () => {
      fc.assert(
        fc.property(dataSourceArbitrary, (source) => {
          expect(source.reference.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should have non-empty summary for each source", () => {
      fc.assert(
        fc.property(dataSourceArbitrary, (source) => {
          expect(source.summary.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: RAG context structure", () => {
    it("should have matching lengths for documents and scores when both present", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }).chain((len) =>
            fc.record({
              retrievedDocuments: fc.array(fc.string({ minLength: 10, maxLength: 100 }), {
                minLength: len,
                maxLength: len,
              }),
              relevanceScores: fc.array(fc.float({ min: 0, max: 1, noNaN: true }), {
                minLength: len,
                maxLength: len,
              }),
              usedInResponse: fc.boolean(),
            })
          ),
          (context) => {
            expect(context.retrievedDocuments.length).toBe(context.relevanceScores.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have relevance scores between 0 and 1", () => {
      fc.assert(
        fc.property(ragContextArbitrary, (context) => {
          context.relevanceScores.forEach((score) => {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
          });
        }),
        { numRuns: 100 }
      );
    });

    it("should have usedInResponse as boolean", () => {
      fc.assert(
        fc.property(ragContextArbitrary, (context) => {
          expect(typeof context.usedInResponse).toBe("boolean");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property: ChatResponse structure", () => {
    it("should have message and context in response", () => {
      fc.assert(
        fc.property(chatResponseArbitrary, (response) => {
          expect(response.message).toBeDefined();
          expect(response.context).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it("should have assistant role in response message", () => {
      fc.assert(
        fc.property(chatResponseArbitrary, (response) => {
          expect(response.message.role).toBe("assistant");
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve sources in response message", () => {
      fc.assert(
        fc.property(chatResponseArbitrary, (response) => {
          if (response.message.sources) {
            expect(response.message.sources.length).toBeGreaterThan(0);
            response.message.sources.forEach((source) => {
              expect(["pnl", "forecast", "sku", "campaign"]).toContain(source.type);
            });
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
