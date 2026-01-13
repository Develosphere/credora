"use client";

/**
 * Campaign Performance Page
 * Displays ranked campaigns by performance with top and bottom performers
 */

import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useCampaigns } from "@/lib/hooks/useCampaigns";
import {
  CampaignRanking,
  CampaignRankingSkeleton,
} from "@/components/financial/CampaignRanking";
import { formatCurrency, formatROAS } from "@/lib/utils/formatters";

export default function CampaignsPage() {
  const { data, isLoading, isError, error, refetch } = useCampaigns();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Performance</h1>
        <p className="text-gray-500 mt-1">
          Analyze marketing campaign profitability and attribution
        </p>
      </div>

      {/* Summary Stats */}
      {data && !isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target className="h-4 w-4" />
              <span>Total Ad Spend</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalSpend)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              <span>Overall ROAS</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatROAS(data.overallRoas)}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <CampaignRankingSkeleton />}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load campaign data
              </h3>
              <p className="text-red-600 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Campaign Rankings */}
      {data && !isLoading && !isError && <CampaignRanking data={data} />}
    </div>
  );
}
