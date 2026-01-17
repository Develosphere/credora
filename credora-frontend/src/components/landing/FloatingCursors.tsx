"use client";

/**
 * Floating Cursors Component
 * Animated cursor pointers with labels floating in background
 */

import { useEffect, useState } from "react";

interface FloatingCursor {
  id: number;
  x: number;
  y: number;
  label: string;
  color: string;
  delay: number;
}

const cursorData: Omit<FloatingCursor, "id">[] = [
  { x: 15, y: 25, label: "Analytics", color: "bg-emerald-500", delay: 0 },
  { x: 85, y: 20, label: "Revenue", color: "bg-primary", delay: 0.5 },
  { x: 10, y: 60, label: "Insights", color: "bg-violet-500", delay: 1 },
  { x: 88, y: 55, label: "Growth", color: "bg-primary", delay: 1.5 },
  { x: 20, y: 80, label: "Profit", color: "bg-emerald-500", delay: 2 },
  { x: 80, y: 75, label: "Forecast", color: "bg-secondary", delay: 2.5 },
];

export function FloatingCursors() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {cursorData.map((cursor, index) => (
        <div
          key={index}
          className="absolute animate-float-slow"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            animationDelay: `${cursor.delay}s`,
          }}
        >
          {/* Cursor pointer */}
          <div className="relative">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white drop-shadow-lg"
            >
              <path
                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
                fill="currentColor"
              />
            </svg>
            
            {/* Label */}
            <div
              className={`absolute left-6 top-4 px-3 py-1.5 rounded-lg ${cursor.color} text-white text-xs font-medium shadow-lg whitespace-nowrap`}
            >
              {cursor.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
