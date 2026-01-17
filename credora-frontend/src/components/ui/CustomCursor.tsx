"use client";

/**
 * Custom Cursor Component
 * Animated cursor with trailing effect for premium feel
 */

import { useEffect, useState, useCallback } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

export function CustomCursor() {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [trailPosition, setTrailPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const updateCursorPosition = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const updateCursorType = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isClickable =
      target.tagName === "A" ||
      target.tagName === "BUTTON" ||
      target.closest("a") ||
      target.closest("button") ||
      target.style.cursor === "pointer" ||
      window.getComputedStyle(target).cursor === "pointer";
    
    setIsPointer(!!isClickable);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsClicking(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsClicking(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHidden(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHidden(true);
  }, []);

  useEffect(() => {
    // Trail follows main cursor with delay
    const trailInterval = setInterval(() => {
      setTrailPosition((prev) => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15,
      }));
    }, 16);

    return () => clearInterval(trailInterval);
  }, [position]);

  useEffect(() => {
    document.addEventListener("mousemove", updateCursorPosition);
    document.addEventListener("mouseover", updateCursorType);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", updateCursorPosition);
      document.removeEventListener("mouseover", updateCursorType);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [updateCursorPosition, updateCursorType, handleMouseDown, handleMouseUp, handleMouseEnter, handleMouseLeave]);

  // Don't render on touch devices
  if (typeof window !== "undefined" && "ontouchstart" in window) {
    return null;
  }

  return (
    <>
      {/* Main cursor dot */}
      <div
        className={`fixed pointer-events-none z-[9999] transition-transform duration-75 ${
          isHidden ? "opacity-0" : "opacity-100"
        }`}
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.8 : 1})`,
        }}
      >
        <div
          className={`rounded-full bg-gradient-to-br from-primary to-secondary transition-all duration-200 ${
            isPointer ? "w-4 h-4" : "w-3 h-3"
          }`}
          style={{
            boxShadow: "0 0 20px rgba(255, 109, 6, 0.5), 0 0 40px rgba(255, 109, 6, 0.3)",
          }}
        />
      </div>

      {/* Trailing ring */}
      <div
        className={`fixed pointer-events-none z-[9998] transition-opacity duration-300 ${
          isHidden ? "opacity-0" : "opacity-100"
        }`}
        style={{
          left: trailPosition.x,
          top: trailPosition.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`rounded-full border-2 transition-all duration-300 ${
            isPointer
              ? "w-12 h-12 border-primary bg-primary/10"
              : "w-8 h-8 border-primary/50 bg-transparent"
          } ${isClicking ? "scale-90" : "scale-100"}`}
          style={{
            boxShadow: isPointer ? "0 0 30px rgba(255, 109, 6, 0.3)" : "none",
          }}
        />
      </div>

      {/* Cursor text for interactive elements */}
      {isPointer && (
        <div
          className="fixed pointer-events-none z-[9997] transition-all duration-200"
          style={{
            left: trailPosition.x,
            top: trailPosition.y + 35,
            transform: "translate(-50%, 0)",
          }}
        >
          <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
            Click
          </span>
        </div>
      )}
    </>
  );
}
