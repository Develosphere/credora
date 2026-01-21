"use client";

/**
 * Chat Message Component - Modern Design
 * Renders individual chat messages with markdown support and source attribution
 * Requirements: 12.4, 12.6
 */

import Image from "next/image";
import { User, Bot, ExternalLink, FileText, Sparkles } from "lucide-react";
import type { ChatMessage as ChatMessageType, DataSource } from "@/lib/api/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-4 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-300 hover:scale-110 ${
          isUser 
            ? "bg-white/10 border border-white/20" 
            : "bg-gradient-to-br from-primary to-secondary shadow-primary/30 p-2"
        }`}
      >
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <div className="relative w-full h-full">
            <Image
              src="/images/circlelogo.png"
              alt="AI"
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Role Label */}
        <span className="text-xs font-medium text-gray-500 mb-2">
          {isUser ? "You" : "AI Assistant"}
        </span>

        <div
          className={`rounded-2xl px-5 py-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
            isUser
              ? "bg-gradient-to-br from-primary to-secondary text-white"
              : "bg-[#2a2a2a]/80 backdrop-blur-xl border border-white/10 text-white"
          }`}
        >
          <MessageContent content={message.content} isUser={isUser} />
        </div>

        {/* Source Attribution - Requirements: 12.6 */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceAttribution sources={message.sources} />
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-2">
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
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
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
            className="bg-black/40 border border-white/10 text-gray-100 rounded-xl p-4 my-3 overflow-x-auto text-xs font-mono"
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
        <h4 key={index} className="font-semibold text-sm mt-4 mb-2 text-primary">
          {line.slice(4)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={index} className="font-semibold text-base mt-4 mb-2 text-primary">
          {line.slice(3)}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={index} className="font-bold text-lg mt-4 mb-2 text-primary">
          {line.slice(2)}
        </h2>
      );
      return;
    }

    // Bullet points
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={index} className="text-sm ml-4 list-disc text-gray-300 leading-relaxed">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
      return;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <li key={index} className="text-sm ml-4 list-decimal text-gray-300 leading-relaxed">
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
      <p key={index} className="text-sm text-gray-300 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  return <div className="space-y-2">{elements}</div>;
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
          className="bg-primary/20 text-primary px-2 py-0.5 rounded-lg text-xs font-mono border border-primary/30"
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
          <strong key={`${index}-${boldIndex}`} className="font-semibold text-white">
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
    <div className="mt-3 p-4 bg-primary/10 backdrop-blur-xl rounded-xl border border-primary/20">
      <div className="flex items-center gap-2 text-xs text-primary mb-3">
        <FileText className="h-3.5 w-3.5" />
        <span className="font-semibold">Data Sources</span>
      </div>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={getSourceLink(source.type)}
            className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-primary transition-all duration-200 group p-2 rounded-lg hover:bg-white/5"
          >
            <span className="text-base">{getSourceIcon(source.type)}</span>
            <span className="group-hover:underline flex-1">{source.summary || source.reference}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
