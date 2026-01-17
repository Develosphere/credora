"use client";

/**
 * Logo Component
 * Displays the Credora logo with fallback to text
 * Place your logo at: public/images/logo.svg or public/images/logo.png
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface LogoProps {
  variant?: "default" | "white" | "dark";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: "text-base" },
  md: { icon: 36, text: "text-lg" },
  lg: { icon: 48, text: "text-2xl" },
};

export function Logo({
  variant = "default",
  size = "md",
  showText = true,
  href = "/",
  className = "",
}: LogoProps) {
  const [imageError, setImageError] = useState(false);
  const dimensions = sizeMap[size];

  // Determine which logo file to use based on variant
  const logoSrc =
    variant === "white"
      ? "/images/logo-white.svg"
      : variant === "dark"
      ? "/images/logo-dark.svg"
      : "/images/logo.svg";

  // Fallback logo (gradient box with C)
  const FallbackLogo = () => (
    <div
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-bold shadow-lg shadow-primary/25"
      style={{
        width: dimensions.icon,
        height: dimensions.icon,
        fontSize: dimensions.icon * 0.45,
      }}
    >
      C
    </div>
  );

  const LogoContent = () => (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {imageError ? (
        <FallbackLogo />
      ) : (
        <div className="relative" style={{ width: dimensions.icon, height: dimensions.icon }}>
          <Image
            src={logoSrc}
            alt="Credora Logo"
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        </div>
      )}
      {showText && (
        <span
          className={`font-bold ${dimensions.text} ${
            variant === "white" ? "text-white" : variant === "dark" ? "text-gray-900" : "gradient-text"
          }`}
        >
          Credora
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition-transform hover:scale-[1.02]">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
