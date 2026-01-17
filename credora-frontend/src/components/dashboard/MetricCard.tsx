"use client";

import { LucideIcon, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value?: string;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onClick?: () => void;
  valueClassName?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading = false,
  error = null,
  onRetry,
  onClick,
  valueClassName,
  delay = 0,
}: MetricCardProps) {
  // Error state
  if (error) {
    return (
      <div className="glass-card rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Error loading data</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-credora-orange transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {error.message || "Unable to load metrics"}
        </p>
      </div>
    );
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded-lg skeleton" />
          <div className="h-10 w-10 rounded-xl skeleton" />
        </div>
        <div className="mt-4 h-8 w-32 rounded-lg skeleton" />
        <div className="mt-2 h-3 w-20 rounded-lg skeleton" />
      </div>
    );
  }

  // Normal state
  const CardWrapper = onClick ? "button" : "div";

  return (
    <CardWrapper
      onClick={onClick}
      className={cn(
        "glass-card rounded-xl p-6 text-left transition-all duration-300",
        "animate-fade-in-up",
        onClick && "cursor-pointer hover:translate-y-[-4px] hover:shadow-card-hover hover:border-credora-orange/30 group"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          "bg-gradient-to-br from-primary-light to-secondary-light",
          "transition-all duration-300",
          onClick && "group-hover:from-credora-orange group-hover:to-credora-red group-hover:shadow-glow"
        )}>
          <Icon className={cn(
            "h-5 w-5 text-credora-orange transition-colors duration-300",
            onClick && "group-hover:text-white"
          )} />
        </div>
      </div>
      <div className={cn(
        "mt-4 text-2xl font-bold transition-all duration-300",
        valueClassName,
        onClick && "group-hover:text-credora-orange"
      )}>
        {value || "-"}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </CardWrapper>
  );
}

/**
 * Skeleton loader for metric cards
 */
export function MetricCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="glass-card rounded-xl p-6 animate-fade-in-up" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-lg skeleton" />
        <div className="h-10 w-10 rounded-xl skeleton" />
      </div>
      <div className="mt-4 h-8 w-32 rounded-lg skeleton" />
      <div className="mt-2 h-3 w-20 rounded-lg skeleton" />
    </div>
  );
}
