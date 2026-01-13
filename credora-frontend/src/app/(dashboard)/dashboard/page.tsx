"use client";

import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Package,
  Megaphone,
  AlertCircle,
  Link2,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatCompactCurrency, formatDays, formatROAS } from "@/lib/utils/formatters";

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDashboard();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  // Check if user has connected platforms
  const hasConnectedPlatforms = data?.hasConnectedPlatforms ?? false;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your business at a glance
        </p>
      </div>

      {/* No Platforms Connected Banner */}
      {!isLoading && !hasConnectedPlatforms && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">No platforms connected</p>
            <p className="text-sm text-amber-700 mt-1">
              Connect your e-commerce platforms to see your real business metrics. 
              All values will show as zero until you connect at least one platform.
            </p>
            <button
              onClick={() => handleNavigate("/settings")}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Connect Platforms
            </button>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Revenue"
          value={data ? formatCurrency(data.revenue || 0) : undefined}
          subtitle="Last 30 days"
          icon={DollarSign}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onClick={() => handleNavigate("/pnl")}
        />

        <MetricCard
          title="Net Profit"
          value={data ? formatCurrency(data.netProfit || 0) : undefined}
          subtitle="Last 30 days"
          icon={TrendingUp}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onClick={() => handleNavigate("/pnl")}
          valueClassName={data && data.netProfit < 0 ? "text-red-500" : "text-green-500"}
        />

        <MetricCard
          title="Cash Runway"
          value={data ? formatDays(data.cashRunway || 0) : undefined}
          subtitle="At current burn rate"
          icon={Clock}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onClick={() => handleNavigate("/forecast")}
          valueClassName={data && data.cashRunway < 30 ? "text-red-500" : undefined}
        />

        <MetricCard
          title="Top SKU"
          value={data?.topSku?.name || "No data"}
          subtitle={data?.topSku ? formatCompactCurrency(data.topSku.profit) + " profit" : "Connect platforms"}
          icon={Package}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onClick={() => handleNavigate("/sku-analysis")}
        />

        <MetricCard
          title="Worst Campaign"
          value={data?.worstCampaign?.name || "No data"}
          subtitle={data?.worstCampaign ? formatROAS(data.worstCampaign.roas) + " ROAS" : "Connect platforms"}
          icon={Megaphone}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          onClick={() => handleNavigate("/campaigns")}
          valueClassName="text-red-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => handleNavigate("/pnl")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
          >
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">View P&L</p>
              <p className="text-sm text-muted-foreground">Full statement</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate("/forecast")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Cash Forecast</p>
              <p className="text-sm text-muted-foreground">90-day projection</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate("/whatif")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">What-If</p>
              <p className="text-sm text-muted-foreground">Run simulation</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate("/chat")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
          >
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Ask AI</p>
              <p className="text-sm text-muted-foreground">Get insights</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
