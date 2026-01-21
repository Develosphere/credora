"use client";

/**
 * Premium Platform Card Component
 * Glassmorphism design matching landing page theme
 */

import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
  Facebook,
  Chrome,
  RefreshCw,
  ArrowRight,
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

const platformColors: Record<PlatformType, { bg: string; border: string; icon: string; glow: string }> = {
  shopify: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    icon: "text-green-400",
    glow: "shadow-green-500/20",
  },
  meta: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    glow: "shadow-blue-500/20",
  },
  google: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: "text-red-400",
    glow: "shadow-red-500/20",
  },
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
  const colors = platformColors[platform];
  const isConnected = status.status === "connected";
  const isFailed = status.status === "failed";
  const isPending = status.status === "pending";

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm",
        isConnected
          ? "bg-emerald-500/10 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
          : "bg-white/[0.02] border-2 border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
      )}
    >
      {/* Glow effect on hover */}
      {!isConnected && (
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10",
          colors.bg
        )}></div>
      )}

      <div className="flex items-start gap-5">
        {/* Platform Icon */}
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all duration-300",
            isConnected
              ? "bg-emerald-500/20 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
              : cn(colors.bg, colors.border, "group-hover:shadow-lg", colors.glow)
          )}
        >
          <Icon
            className={cn(
              "h-8 w-8 transition-all duration-300",
              isConnected ? "text-emerald-400" : colors.icon
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg text-white">{name}</h3>
            {isRequired && (
              <span className="rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Required
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{description}</p>

          {/* Status Message */}
          {status.lastSync && isConnected && (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Last synced: {new Date(status.lastSync).toLocaleString()}</span>
            </div>
          )}
          {status.error && isFailed && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              <span>{status.error}</span>
            </div>
          )}
        </div>

        {/* Action Button / Status */}
        <div className="flex items-center">
          {isConnecting || isPending ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-gray-300">Connecting...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Connected</span>
            </div>
          ) : isFailed ? (
            <button
              onClick={onConnect}
              className="group/btn flex items-center gap-2 rounded-xl border-2 border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-500" />
              Retry
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="group/btn relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white overflow-hidden hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span className="relative z-10">Connect</span>
              <ArrowRight className="h-4 w-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
