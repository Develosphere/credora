"use client";

/**
 * InsightCard component
 * Displays AI-generated recommendations with reasoning, links to data pages, and dismiss functionality
 */

import { useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Undo2,
} from "lucide-react";
import type { Insight } from "@/lib/api/types";

export interface InsightCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
  onRestore?: (insightId: string) => void;
  isLoading?: boolean;
}

/**
 * Get impact indicator styling and icon
 */
export function getImpactIndicator(impact: Insight["impact"]): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: React.ReactNode;
} {
  switch (impact) {
    case "high":
      return {
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        label: "High Impact",
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    case "medium":
      return {
        color: "text-credora-orange",
        bgColor: "bg-credora-orange/10",
        borderColor: "border-credora-orange/30",
        label: "Medium Impact",
        icon: <TrendingUp className="h-4 w-4" />,
      };
    case "low":
      return {
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        label: "Low Impact",
        icon: <Lightbulb className="h-4 w-4" />,
      };
  }
}

/**
 * Get category styling
 */
export function getCategoryBadge(category: Insight["category"]): {
  color: string;
  bgColor: string;
  label: string;
} {
  switch (category) {
    case "revenue":
      return {
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        label: "Revenue",
      };
    case "cost":
      return {
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        label: "Cost",
      };
    case "efficiency":
      return {
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        label: "Efficiency",
      };
    case "risk":
      return {
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        label: "Risk",
      };
  }
}

/**
 * Get the link path for a related page
 */
export function getRelatedPageLink(relatedPage: string | undefined): {
  href: string;
  label: string;
} | null {
  if (!relatedPage) return null;

  const pageMap: Record<string, { href: string; label: string }> = {
    pnl: { href: "/pnl", label: "P&L Statement" },
    forecast: { href: "/forecast", label: "Cash Flow Forecast" },
    sku: { href: "/sku-analysis", label: "SKU Analytics" },
    "sku-analysis": { href: "/sku-analysis", label: "SKU Analytics" },
    campaigns: { href: "/campaigns", label: "Campaign Performance" },
    whatif: { href: "/whatif", label: "What-If Simulator" },
  };

  return pageMap[relatedPage.toLowerCase()] || null;
}

export function InsightCard({
  insight,
  onDismiss,
  onRestore,
  isLoading = false,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const impactIndicator = getImpactIndicator(insight.impact);
  const categoryBadge = getCategoryBadge(insight.category);
  const relatedPageLink = getRelatedPageLink(insight.relatedPage);

  return (
    <div
      className={`rounded-2xl border bg-[#1e1e1e] ${impactIndicator.borderColor} overflow-hidden transition-all duration-300 hover:border-credora-orange/50 ${
        insight.dismissed ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`mt-0.5 ${impactIndicator.color} transition-transform duration-300 hover:scale-110`}>
              {impactIndicator.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full ${impactIndicator.bgColor} ${impactIndicator.color}`}
                >
                  {impactIndicator.label}
                </span>
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full ${categoryBadge.bgColor} ${categoryBadge.color}`}
                >
                  {categoryBadge.label}
                </span>
              </div>
              <h3 className="font-semibold text-white text-lg">{insight.title}</h3>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{insight.description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {insight.dismissed ? (
              <button
                onClick={() => onRestore?.(insight.id)}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-credora-orange hover:bg-credora-orange/10 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Restore insight"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => onDismiss?.(insight.id)}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-white hover:bg-[#333] rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Dismiss insight"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-credora-orange transition-colors duration-200"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide reasoning
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show reasoning
            </>
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[#2a2a2a]">
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Reasoning</h4>
            <p className="text-sm text-gray-400 leading-relaxed">{insight.reasoning}</p>

            {/* Related Page Link */}
            {relatedPageLink && (
              <div className="mt-4">
                <Link
                  href={relatedPageLink.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-credora-orange hover:text-credora-red transition-colors duration-200 group"
                >
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  View {relatedPageLink.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for InsightCard
 */
export function InsightCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#1e1e1e] p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-4 w-4 bg-[#333] rounded mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-24 bg-[#333] rounded-full" />
            <div className="h-6 w-20 bg-[#333] rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-[#333] rounded mb-2" />
          <div className="h-4 w-full bg-[#2a2a2a] rounded" />
          <div className="h-4 w-2/3 bg-[#2a2a2a] rounded mt-2" />
        </div>
      </div>
    </div>
  );
}
