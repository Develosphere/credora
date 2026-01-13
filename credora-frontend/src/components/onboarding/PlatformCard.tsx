"use client";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
  Facebook,
  Chrome,
  RefreshCw,
} from "lucide-react";
import type { PlatformStatus, PlatformType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PlatformCardProps {
  platform: PlatformType;
  name: string;
  description: string;
  status: PlatformStatus;
  isConnecting: boolean;
  onConnect: () => void;
  isRequired?: boolean;
}

const platformIcons: Record<PlatformType, React.ComponentType<{ className?: string }>> = {
  shopify: ShoppingBag,
  meta: Facebook,
  google: Chrome,
};

const statusColors: Record<PlatformStatus["status"], string> = {
  connected: "text-green-500",
  pending: "text-yellow-500",
  failed: "text-red-500",
  not_connected: "text-muted-foreground",
};

const statusBgColors: Record<PlatformStatus["status"], string> = {
  connected: "bg-green-500/10",
  pending: "bg-yellow-500/10",
  failed: "bg-red-500/10",
  not_connected: "bg-muted",
};

export function PlatformCard({
  platform,
  name,
  description,
  status,
  isConnecting,
  onConnect,
  isRequired = false,
}: PlatformCardProps) {
  const Icon = platformIcons[platform];
  const isConnected = status.status === "connected";
  const isFailed = status.status === "failed";
  const isPending = status.status === "pending";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isConnected && "border-green-500/50 bg-green-500/5"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Platform Icon */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            statusBgColors[status.status]
          )}
        >
          <Icon className={cn("h-6 w-6", statusColors[status.status])} />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{name}</h3>
            {isRequired && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Required
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

          {/* Status Message */}
          {status.lastSync && isConnected && (
            <p className="mt-2 text-xs text-muted-foreground">
              Last synced: {new Date(status.lastSync).toLocaleString()}
            </p>
          )}
          {status.error && isFailed && (
            <p className="mt-2 text-xs text-red-500">{status.error}</p>
          )}
        </div>

        {/* Action Button / Status */}
        <div className="flex items-center">
          {isConnecting || isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              Connected
            </div>
          ) : isFailed ? (
            <button
              onClick={onConnect}
              className="flex items-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
