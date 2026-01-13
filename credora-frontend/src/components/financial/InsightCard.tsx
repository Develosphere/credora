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
  TrendingDown,
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
        color: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "High Impact",
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    case "medium":
      return {
        color: "text-yellow-700",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        label: "Medium Impact",
        icon: <TrendingUp className="h-4 w-4" />,
      };
    case "low":
      return {
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
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
        color: "text-green-700",
        bgColor: "bg-green-100",
        label: "Revenue",
      };
    case "cost":
      return {
        color: "text-red-700",
        bgColor: "bg-red-100",
        label: "Cost",
      };
    case "efficiency":
      return {
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        label: "Efficiency",
      };
    case "risk":
      return {
        color: "text-orange-700",
        bgColor: "bg-orange-100",
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
      className={`rounded-lg border ${impactIndicator.borderColor} ${impactIndicator.bgColor} overflow-hidden transition-all ${
        insight.dismissed ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`mt-0.5 ${impactIndicator.color}`}>
              {impactIndicator.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${impactIndicator.bgColor} ${impactIndicator.color} border ${impactIndicator.borderColor}`}
                >
                  {impactIndicator.label}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${categoryBadge.bgColor} ${categoryBadge.color}`}
                >
                  {categoryBadge.label}
                </span>
              </div>
              <h3 className="font-medium text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {insight.dismissed ? (
              <button
                onClick={() => onRestore?.(insight.id)}
                disabled={isLoading}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors disabled:opacity-50"
                title="Restore insight"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => onDismiss?.(insight.id)}
                disabled={isLoading}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors disabled:opacity-50"
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
          className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
        <div className="px-4 pb-4 border-t border-gray-200/50">
          <div className="pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Reasoning</h4>
            <p className="text-sm text-gray-600">{insight.reasoning}</p>

            {/* Related Page Link */}
            {relatedPageLink && (
              <div className="mt-3">
                <Link
                  href={relatedPageLink.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-4 w-4 bg-gray-200 rounded mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded mt-1" />
        </div>
      </div>
    </div>
  );
}
