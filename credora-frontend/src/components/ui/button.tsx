"use client";

/**
 * Button - Premium CTA button component with animations
 */

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium
    transition-all duration-300 ease-out
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    relative overflow-hidden
  `;

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-credora-orange to-credora-red text-white
      shadow-[0_4px_14px_rgba(255,109,6,0.25)]
      hover:shadow-[0_6px_20px_rgba(255,109,6,0.35)]
      hover:translate-y-[-2px]
      active:translate-y-0
      before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
      before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700
    `,
    secondary: `
      bg-transparent text-credora-orange border-2 border-credora-orange
      hover:bg-primary-light hover:translate-y-[-2px]
      active:translate-y-0
    `,
    ghost: `
      bg-transparent text-gray-700 
      hover:bg-gray-100 hover:text-gray-900
    `,
    outline: `
      bg-transparent text-gray-700 border border-gray-300
      hover:border-credora-orange hover:text-credora-orange hover:bg-primary-light
    `,
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
