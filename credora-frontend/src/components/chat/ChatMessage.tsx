"use client";

/**
 * Chat Message Component
 * Renders individual chat messages with markdown support and source attribution
 * Requirements: 12.4, 12.6
 */

import { User, MessageSquare, ExternalLink, FileText } from "lucide-react";
import type { ChatMessage as ChatMessageType, DataSource } from "@/lib/api/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 hover:scale-110 ${
          isUser ? "bg-gray-100" : "bg-gradient-to-br from-primary to-secondary"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-gray-600" />
        ) : (
          <MessageSquare className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm transition-all duration-300 hover:shadow-md ${
            isUser
              ? "bg-gradient-to-r from-primary to-secondary text-white"
              : "bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-900"
          }`}
        >
          <MessageContent content={message.content} isUser={isUser} />
        </div>

        {/* Source Attribution - Requirements: 12.6 */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceAttribution sources={message.sources} />
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1.5">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

/**
 * Message content with basic markdown rendering
 */
function MessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  // Simple markdown-like rendering for assistant messages
  if (isUser) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  // Parse and render markdown-like content
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = "";

  lines.forEach((line, index) => {
    // Code block handling
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
        codeContent = [];
      } else {
        elements.push(
          <pre
            key={`code-${index}`}
            className="bg-gray-800 text-gray-100 rounded p-3 my-2 overflow-x-auto text-xs"
          >
            <code>{codeContent.join("\n")}</code>
          </pre>
        );
        inCodeBlock = false;
        codeContent = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={index} className="font-semibold text-sm mt-3 mb-1">
          {line.slice(4)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={index} className="font-semibold text-base mt-3 mb-1">
          {line.slice(3)}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={index} className="font-bold text-lg mt-3 mb-1">
          {line.slice(2)}
        </h2>
      );
      return;
    }

    // Bullet points
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={index} className="text-sm ml-4 list-disc">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
      return;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <li key={index} className="text-sm ml-4 list-decimal">
          {renderInlineFormatting(line.slice(numberedMatch[0].length))}
        </li>
      );
      return;
    }

    // Empty lines
    if (line.trim() === "") {
      elements.push(<br key={index} />);
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={index} className="text-sm">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Render inline formatting (bold, italic, code)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Simple inline code
  const parts = text.split(/(`[^`]+`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // Bold text
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, boldIndex) => {
      if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
        return (
          <strong key={`${index}-${boldIndex}`}>
            {boldPart.slice(2, -2)}
          </strong>
        );
      }
      return boldPart;
    });
  });
}

/**
 * Source Attribution Component - Requirements: 12.6
 */
function SourceAttribution({ sources }: { sources: DataSource[] }) {
  const getSourceIcon = (type: DataSource["type"]) => {
    switch (type) {
      case "pnl":
        return "📊";
      case "forecast":
        return "📈";
      case "sku":
        return "📦";
      case "campaign":
        return "📣";
      default:
        return "📄";
    }
  };

  const getSourceLink = (type: DataSource["type"]) => {
    switch (type) {
      case "pnl":
        return "/pnl";
      case "forecast":
        return "/forecast";
      case "sku":
        return "/sku-analysis";
      case "campaign":
        return "/campaigns";
      default:
        return "#";
    }
  };

  return (
    <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/10 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
        <FileText className="h-3 w-3" />
        <span className="font-medium">Sources</span>
      </div>
      <div className="space-y-1.5">
        {sources.map((source, index) => (
          <a
            key={index}
            href={getSourceLink(source.type)}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary transition-colors duration-200 group"
          >
            <span>{getSourceIcon(source.type)}</span>
            <span className="group-hover:underline">{source.summary || source.reference}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
