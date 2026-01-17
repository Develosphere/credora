"use client";

/**
 * AnimatedNumber - Animated number display for KPIs
 */

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  className,
  duration = 600,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={cn(
        "inline-block transition-all duration-300",
        isAnimating && "opacity-0 translate-y-2",
        !isAnimating && "opacity-100 translate-y-0",
        className
      )}
    >
      {displayValue}
    </span>
  );
}
