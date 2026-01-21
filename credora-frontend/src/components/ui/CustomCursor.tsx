"use client";

/**
 * Custom Cursor Component
 * Ultra-optimized cursor with instant response and smooth trailing
 * Uses CSS transforms and requestAnimationFrame for 60fps performance
 */

import { useEffect, useState, useCallback, useRef } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

export function CustomCursor() {
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Use refs to avoid re-renders on every mouse move
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  
  const positionRef = useRef<CursorPosition>({ x: 0, y: 0 });
  const trailPositionRef = useRef<CursorPosition>({ x: 0, y: 0 });
  const rafRef = useRef<number>();
  const lastCheckTime = useRef<number>(0);

  const updateCursorPosition = useCallback((e: MouseEvent) => {
    positionRef.current = { x: e.clientX, y: e.clientY };
    
    // Update main cursor INSTANTLY via transform (no re-render, no delay)
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    }
  }, []);

  const updateCursorType = useCallback((e: MouseEvent) => {
    // Throttle cursor type checks to every 100ms for better performance
    const now = Date.now();
    if (now - lastCheckTime.current < 100) return;
    lastCheckTime.current = now;

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

  // Animate trail with requestAnimationFrame - faster interpolation
  useEffect(() => {
    const animateTrail = () => {
      const trail = trailPositionRef.current;
      const target = positionRef.current;
      
      // Faster interpolation for more responsive trail (0.25 instead of 0.15)
      trail.x += (target.x - trail.x) * 0.25;
      trail.y += (target.y - trail.y) * 0.25;
      
      // Update trail position via transform with hardware acceleration
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%)`;
      }
      
      // Update text position
      if (textRef.current) {
        textRef.current.style.transform = `translate3d(${trail.x}px, ${trail.y + 35}px, 0) translate(-50%, 0)`;
      }
      
      rafRef.current = requestAnimationFrame(animateTrail);
    };
    
    rafRef.current = requestAnimationFrame(animateTrail);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Use passive listeners for better scroll performance
    document.addEventListener("mousemove", updateCursorPosition, { passive: true });
    document.addEventListener("mouseover", updateCursorType, { passive: true });
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
      {/* Main cursor dot - positioned via ref for instant response */}
      <div
        ref={cursorRef}
        className={`fixed pointer-events-none z-[9999] will-change-transform transition-opacity duration-150 ${
          isHidden ? "opacity-0" : "opacity-100"
        }`}
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`rounded-full bg-gradient-to-br from-primary to-secondary transition-all duration-150 ${
            isPointer ? "w-4 h-4" : "w-3 h-3"
          } ${isClicking ? "scale-75" : "scale-100"}`}
          style={{
            boxShadow: "0 0 20px rgba(255, 109, 6, 0.5), 0 0 40px rgba(255, 109, 6, 0.3)",
          }}
        />
      </div>

      {/* Trailing ring - positioned via ref for smooth follow */}
      <div
        ref={trailRef}
        className={`fixed pointer-events-none z-[9998] will-change-transform transition-opacity duration-200 ${
          isHidden ? "opacity-0" : "opacity-100"
        }`}
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`rounded-full border-2 transition-all duration-200 ${
            isPointer
              ? "w-12 h-12 border-primary bg-primary/10"
              : "w-8 h-8 border-primary/50 bg-transparent"
          } ${isClicking ? "scale-90" : "scale-100"}`}
          style={{
            boxShadow: isPointer ? "0 0 30px rgba(255, 109, 6, 0.3)" : "none",
          }}
        />
      </div>

      {/* Cursor text for interactive elements - positioned via ref */}
      {isPointer && (
        <div
          ref={textRef}
          className="fixed pointer-events-none z-[9997] will-change-transform transition-opacity duration-150"
          style={{
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
