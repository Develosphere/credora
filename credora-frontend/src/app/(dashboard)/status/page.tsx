"use client";

/**
 * System Status Page
 * Displays health status of Python API and Java FPA Engine,
 * plus platform sync status with auto-refresh polling
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { useState } from "react";
import {
  Activity,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShoppingBag,
  Facebook,
  Chrome,
  Loader2,
} from "lucide-react";
import { useStatus } from "@/lib/hooks/useStatus";
import { getHealthIndicatorColor } from "@/lib/api/status";
import type { ServiceHealth, PlatformStatus, PlatformType, ServiceHealthStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Platform icons mapping
const platformIcons: Record<PlatformType, React.ComponentType<{ className?: string }>> = {
  shopify: ShoppingBag,
  meta: Facebook,
  google: Chrome,
};

// Platform display names
const platformNames: Record<PlatformType, string> = {
  shopify: "Shopify",
  meta: "Meta Ads",
  google: "Google Ads",
};

// Service display names
const serviceNames: Record<string, string> = {
  python_api: "Python API",
  java_engine: "Java FPA Engine",
};


/**
 * Service Health Indicator Component
 * Displays green/red indicator based on service health
 * Requirements: 15.2, 15.3
 */
function ServiceHealthIndicator({ health }: { health: ServiceHealth }) {
  const color = getHealthIndicatorColor(health.status);
  
  const StatusIcon = health.status === "healthy" 
    ? CheckCircle2 
    : health.status === "unhealthy" 
      ? XCircle 
      : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        health.status === "healthy" && "border-green-500/30 bg-green-500/5",
        health.status === "unhealthy" && "border-red-500/30 bg-red-500/5",
        health.status === "unknown" && "border-gray-500/30 bg-gray-500/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            health.status === "healthy" && "bg-green-500/10",
            health.status === "unhealthy" && "bg-red-500/10",
            health.status === "unknown" && "bg-gray-500/10"
          )}
        >
          <Server
            className={cn(
              "h-5 w-5",
              health.status === "healthy" && "text-green-500",
              health.status === "unhealthy" && "text-red-500",
              health.status === "unknown" && "text-gray-500"
            )}
          />
        </div>
        <div>
          <h4 className="font-medium">{serviceNames[health.service]}</h4>
          {health.responseTime !== undefined && (
            <p className="text-sm text-muted-foreground">
              Response time: {health.responseTime}ms
            </p>
          )}
          {health.error && (
            <p className="text-sm text-red-500">{health.error}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn(
            "h-5 w-5",
            health.status === "healthy" && "text-green-500",
            health.status === "unhealthy" && "text-red-500",
            health.status === "unknown" && "text-gray-500"
          )}
        />
        <span
          className={cn(
            "text-sm font-medium capitalize",
            health.status === "healthy" && "text-green-500",
            health.status === "unhealthy" && "text-red-500",
            health.status === "unknown" && "text-gray-500"
          )}
        >
          {health.status}
        </span>
      </div>
    </div>
  );
}


/**
 * Platform Sync Status Component
 * Displays last sync time for each platform
 * Requirements: 15.4
 */
function PlatformSyncStatus({ platform }: { platform: PlatformStatus }) {
  const Icon = platformIcons[platform.platform];
  const name = platformNames[platform.platform];
  const isConnected = platform.status === "connected";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        isConnected && "border-green-500/30 bg-green-500/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isConnected ? "bg-green-500/10" : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isConnected ? "text-green-500" : "text-muted-foreground"
            )}
          />
        </div>
        <div>
          <h4 className="font-medium">{name}</h4>
          {platform.lastSync ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last synced: {new Date(platform.lastSync).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isConnected ? "Sync pending" : "Not connected"}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <span className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            {platform.status === "failed" ? "Failed" : "Not Connected"}
          </span>
        )}
      </div>
    </div>
  );
}


/**
 * Main Status Page Component
 */
export default function StatusPage() {
  const [pollInterval] = useState(30000); // 30 seconds
  const { data: status, isLoading, error, refetch, isFetching, dataUpdatedAt } = useStatus({
    pollInterval,
    enablePolling: true,
  });

  const handleManualRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-muted-foreground">
            Monitor the health of Credora services
          </p>
        </div>
        <div className="flex items-center gap-4">
          {dataUpdatedAt && (
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" />
        <span>Auto-refreshing every {pollInterval / 1000} seconds</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="font-medium text-red-500">Failed to load status</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/50 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}


      {/* Service Health Section - Requirements 15.2, 15.3 */}
      {status && (
        <>
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Service Health</h2>
            </div>
            <div className="space-y-3">
              {status.services.map((service) => (
                <ServiceHealthIndicator key={service.service} health={service} />
              ))}
            </div>
          </section>

          {/* Platform Sync Status Section - Requirements 15.4 */}
          <section className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Platform Sync Status</h2>
            </div>
            {status.platforms.length > 0 ? (
              <div className="space-y-3">
                {status.platforms.map((platform) => (
                  <PlatformSyncStatus key={platform.platform} platform={platform} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No platforms connected. Connect platforms in Settings to see sync status.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
