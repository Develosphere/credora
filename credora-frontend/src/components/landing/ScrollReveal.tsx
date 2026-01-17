"use client";

/**
 * ScrollReveal Component
 * Provides scroll-based reveal animations for elements with sound effects
 */

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { playRevealSound } from "@/lib/sounds";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number;
  threshold?: number;
  playSound?: boolean;
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 600,
  threshold = 0.1,
  playSound = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasPlayedSound = useRef(false);

  const handleVisibility = useCallback((visible: boolean) => {
    if (visible && !hasPlayedSound.current && playSound && delay === 0) {
      hasPlayedSound.current = true;
      playRevealSound();
    }
    setIsVisible(visible);
  }, [playSound, delay]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleVisibility(true);
        } else {
          // Reset when scrolling back up (element leaves viewport)
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, handleVisibility]);

  const getInitialTransform = () => {
    switch (direction) {
      case "up":
        return "translateY(40px)";
      case "down":
        return "translateY(-40px)";
      case "left":
        return "translateX(40px)";
      case "right":
        return "translateX(-40px)";
      case "fade":
      default:
        return "translateY(0)";
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate(0)" : getInitialTransform(),
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * ScrollRevealGroup - For staggered animations of multiple children
 */
interface ScrollRevealGroupProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number;
  threshold?: number;
}

export function ScrollRevealGroup({
  children,
  className = "",
  staggerDelay = 100,
  direction = "up",
  duration = 600,
  threshold = 0.1,
}: ScrollRevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);

  const getInitialTransform = () => {
    switch (direction) {
      case "up":
        return "translateY(40px)";
      case "down":
        return "translateY(-40px)";
      case "left":
        return "translateX(40px)";
      case "right":
        return "translateX(-40px)";
      case "fade":
      default:
        return "translateY(0)";
    }
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translate(0)" : getInitialTransform(),
            transition: `opacity ${duration}ms ease-out ${index * staggerDelay}ms, transform ${duration}ms ease-out ${index * staggerDelay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
