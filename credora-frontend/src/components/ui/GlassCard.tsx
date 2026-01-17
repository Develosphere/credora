"use client";

/**
 * GlassCard - Premium glassmorphism card component
 * Used for KPI cards, floating panels, and elevated content
 */

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle";
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false,
  glow = false,
  onClick,
}: GlassCardProps) {
  const baseStyles = "rounded-xl transition-all duration-300 ease-out";
  
  const variantStyles = {
    default: "glass-card",
    elevated: "glass-panel",
    subtle: "bg-white/60 backdrop-blur-sm border border-gray-100/50",
  };

  const hoverStyles = hover
    ? "cursor-pointer hover:translate-y-[-4px] hover:shadow-card-hover"
    : "";

  const glowStyles = glow ? "hover:shadow-glow" : "";

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        glowStyles,
        onClick && "text-left w-full",
        className
      )}
    >
      {children}
    </Component>
  );
}
