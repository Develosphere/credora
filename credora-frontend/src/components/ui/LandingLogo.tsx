"use client";

/**
 * Landing Logo Component (Client-side)
 * For use in server components like the landing page
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface LandingLogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export function LandingLogo({ variant = "dark", size = "md" }: LandingLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: { container: "w-7 h-7", text: "text-base" },
    md: { container: "w-9 h-9", text: "text-lg" },
    lg: { container: "w-12 h-12", text: "text-2xl" },
  };

  const textColor = variant === "dark" ? "text-white" : "text-gray-900";

  return (
    <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
      <div className={`relative ${sizeClasses[size].container} flex-shrink-0`}>
        {!imageError ? (
          <Image
            src="/images/logo.svg"
            alt="Credora"
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-bold text-sm">
            C
          </div>
        )}
      </div>
      <span className={`${sizeClasses[size].text} font-semibold ${textColor}`}>
        Credora
      </span>
    </Link>
  );
}
