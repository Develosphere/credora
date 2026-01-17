"use client";

/**
 * TrustedBrands Component
 * Infinite horizontal scroll with brand logos
 * Grayscale by default, orange on hover, pauses on hover
 */

import { useState } from "react";

const brands = [
  { src: "/images/brands (1).png", name: "Brand 1" },
  { src: "/images/brands (2).png", name: "Brand 2" },
  { src: "/images/brands (3).png", name: "Brand 3" },
  { src: "/images/brands (4).png", name: "Brand 4" },
  { src: "/images/brands (5).png", name: "Brand 5" },
];

export function TrustedBrands() {
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate brands for seamless infinite scroll
  const duplicatedBrands = [...brands, ...brands, ...brands, ...brands];

  return (
    <div className="w-full overflow-hidden">
      {/* Scroll container */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div
          className="flex items-center gap-20 py-6"
          style={{
            animation: `scroll 18s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            width: "fit-content",
          }}
        >
          {duplicatedBrands.map((brand, index) => (
            <div
              key={index}
              className="flex-shrink-0 group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.src}
                alt={brand.name}
                className="h-12 md:h-14 w-auto object-contain transition-all duration-300"
                style={{
                  filter: "brightness(0) invert(1) opacity(0.6)",
                  transition: "filter 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  // Orange color #ff6d06
                  e.currentTarget.style.filter = "invert(48%) sepia(98%) saturate(2000%) hue-rotate(360deg) brightness(100%) contrast(105%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(0) invert(1) opacity(0.6)";
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CSS for infinite scroll animation */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
