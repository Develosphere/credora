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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Campaign Performance</h1>
        <p className="text-gray-400 mt-1">
          Analyze marketing campaign profitability and attribution
        </p>
      </div>

      {/* Summary Stats */}
      {data && !isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1.5">
              <Target className="h-4 w-4 text-credora-orange" />
              <span>Total Ad Spend</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(data.totalSpend)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(data.totalRevenue)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1.5">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span>Overall ROAS</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatROAS(data.overallRoas)}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <CampaignRankingSkeleton />}

      {/* Error State */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-400 font-semibold">
                Failed to load campaign data
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors duration-200 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Campaign Rankings */}
      {data && !isLoading && !isError && (
        <div className="animate-slide-up">
          <CampaignRanking data={data} />
        </div>
      )}
    </div>
  );
}
