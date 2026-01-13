"use client";

/**
 * CampaignRanking component
 * Displays top and bottom performing campaigns with expandable attribution details
 */

import { useState } from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { CampaignRanking as CampaignRankingType, Campaign } from "@/lib/api/types";
import { formatCurrency, formatROAS, formatNumber } from "@/lib/utils/formatters";

export interface CampaignRankingProps {
  data: CampaignRankingType;
}

/**
 * Get data quality indicator color and label
 */
export function getDataQualityIndicator(quality: Campaign["dataQuality"]): {
  color: string;
  bgColor: string;
  label: string;
  description: string;
} {
  switch (quality) {
    case "high":
      return {
        color: "text-green-700",
        bgColor: "bg-green-100",
        label: "High",
        description: "Sufficient data for reliable attribution",
      };
    case "medium":
      return {
        color: "text-yellow-700",
        bgColor: "bg-yellow-100",
        label: "Medium",
        description: "Limited data may affect accuracy",
      };
    case "low":
      return {
        color: "text-red-700",
        bgColor: "bg-red-100",
        label: "Low",
        description: "Insufficient data for reliable attribution",
      };
  }
}

/**
 * Get platform badge styling
 */
function getPlatformBadge(platform: Campaign["platform"]): {
  color: string;
  bgColor: string;
  label: string;
} {
  switch (platform) {
    case "meta":
      return {
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        label: "Meta",
      };
    case "google":
      return {
        color: "text-green-700",
        bgColor: "bg-green-100",
        label: "Google",
      };
  }
}

interface CampaignRowProps {
  campaign: Campaign;
  isExpanded: boolean;
  onToggle: () => void;
}

function CampaignRow({ campaign, isExpanded, onToggle }: CampaignRowProps) {
  const platformBadge = getPlatformBadge(campaign.platform);
  const qualityIndicator = getDataQualityIndicator(campaign.dataQuality);
  const isPositiveRoas = campaign.effectiveRoas >= 1;

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-3 py-4">
          <ChevronRight
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{campaign.name}</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${platformBadge.bgColor} ${platformBadge.color}`}
            >
              {platformBadge.label}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">
          {formatCurrency(campaign.spend)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">
          {formatCurrency(campaign.revenue)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-700">
          {formatNumber(campaign.conversions)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-2">
            <span
              className={`font-mono font-medium ${
                isPositiveRoas ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatROAS(campaign.effectiveRoas)}
            </span>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <p className="font-medium mb-1">Effective ROAS Calculation</p>
                <p>
                  Revenue attributed to this campaign divided by total ad spend,
                  accounting for multi-touch attribution and refund adjustments.
                </p>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${qualityIndicator.bgColor} ${qualityIndicator.color}`}
            >
              {qualityIndicator.label}
            </span>
            {campaign.dataQuality === "low" && (
              <div className="group relative">
                <AlertTriangle className="h-4 w-4 text-amber-500 cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {qualityIndicator.description}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && <ExpandedCampaignRow campaign={campaign} />}
    </>
  );
}

interface ExpandedCampaignRowProps {
  campaign: Campaign;
}

function ExpandedCampaignRow({ campaign }: ExpandedCampaignRowProps) {
  const qualityIndicator = getDataQualityIndicator(campaign.dataQuality);
  const profit = campaign.revenue - campaign.spend;
  const profitMargin = campaign.revenue > 0 ? (profit / campaign.revenue) * 100 : 0;

  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-6 py-4">
        <div className="space-y-4">
          {/* Attribution Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Attribution Details
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Campaign ID:</span>
                <span className="ml-2 font-mono text-gray-900">{campaign.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Platform:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">
                  {campaign.platform === "meta" ? "Meta Ads" : "Google Ads"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Conversions:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formatNumber(campaign.conversions)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cost per Conversion:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {campaign.conversions > 0
                    ? formatCurrency(campaign.spend / campaign.conversions)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Profitability Breakdown */}
          <div className="p-3 bg-white rounded border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Profitability Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Revenue:</span>
                <span className="font-mono">{formatCurrency(campaign.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ad Spend:</span>
                <span className="font-mono text-red-600">
                  -{formatCurrency(campaign.spend)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Net Profit:</span>
                <span
                  className={`font-mono ${
                    profit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Profit Margin:</span>
              <span
                className={`font-mono ${
                  profitMargin >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Data Quality Note */}
          {campaign.dataQuality !== "high" && (
            <div
              className={`p-3 rounded border ${
                campaign.dataQuality === "low"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 ${
                    campaign.dataQuality === "low"
                      ? "text-red-500"
                      : "text-yellow-500"
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      campaign.dataQuality === "low"
                        ? "text-red-800"
                        : "text-yellow-800"
                    }`}
                  >
                    {qualityIndicator.label} Data Quality
                  </p>
                  <p
                    className={`text-sm ${
                      campaign.dataQuality === "low"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {qualityIndicator.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

interface CampaignTableProps {
  campaigns: Campaign[];
  title: string;
  icon: React.ReactNode;
  emptyMessage: string;
}

function CampaignTable({ campaigns, title, icon, emptyMessage }: CampaignTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (campaignId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">({campaigns.length})</span>
      </div>

      {campaigns.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective ROAS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Quality
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  isExpanded={expandedRows.has(campaign.id)}
                  onToggle={() => toggleRow(campaign.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CampaignRanking({ data }: CampaignRankingProps) {
  return (
    <div className="space-y-6">
      {/* Top Performers */}
      <CampaignTable
        campaigns={data.topCampaigns}
        title="Top Performers"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        emptyMessage="No top performing campaigns found"
      />

      {/* Bottom Performers */}
      <CampaignTable
        campaigns={data.bottomCampaigns}
        title="Underperformers"
        icon={<TrendingDown className="h-5 w-5 text-red-600" />}
        emptyMessage="No underperforming campaigns found"
      />
    </div>
  );
}

/**
 * Skeleton loader for campaign ranking
 */
export function CampaignRankingSkeleton() {
  const SkeletonTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Campaign
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Spend
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Conversions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Effective ROAS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data Quality
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(3)].map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-4">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SkeletonTable />
      <SkeletonTable />
    </div>
  );
}
