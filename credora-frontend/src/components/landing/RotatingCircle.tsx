"use client";

/**
 * Rotating Circle Component
 * Half circle with white outline, rotating bubble icons around FULL circle, and center logo
 */

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  BarChart3,
  PieChart,
  Wallet,
  Receipt,
  Store,
  Zap,
  Target,
  LineChart,
  Percent,
  BadgeDollarSign,
  ShoppingBag,
} from "lucide-react";

// Icons placed around the FULL circle (360 degrees)
const icons = [
  { Icon: ShoppingCart },
  { Icon: DollarSign },
  { Icon: TrendingUp },
  { Icon: Package },
  { Icon: CreditCard },
  { Icon: BarChart3 },
  { Icon: PieChart },
  { Icon: Wallet },
  { Icon: Receipt },
  { Icon: Store },
  { Icon: Zap },
  { Icon: Target },
  { Icon: LineChart },
  { Icon: Percent },
  { Icon: BadgeDollarSign },
  { Icon: ShoppingBag },
];

export function RotatingCircle() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.15) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const circleSize = 650;
  const outerRadius = circleSize / 2 - 30;
  const innerRadius = circleSize / 2 - 100;
  const iconCount = 16; // Full circle of icons
  const dotCount = 24; // More dots around inner ring

  return (
    <div className="relative w-full h-[380px] flex items-end justify-center overflow-visible">
      {/* Gradient glow behind circle */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-t-full"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(255, 109, 6, 0.3) 0%, rgba(255, 61, 0, 0.15) 40%, transparent 70%)',
        }}
      />
      
      {/* Main container positioned at bottom - half visible */}
      <div 
        className="absolute bottom-0 left-1/2"
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          transform: 'translateX(-50%) translateY(50%)',
        }}
      >
        {/* Outer white outline circle */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 0 60px rgba(255, 255, 255, 0.2), 0 0 100px rgba(255, 109, 6, 0.25)',
          }}
        />
        
        {/* Second white outline */}
        <div 
          className="absolute rounded-full"
          style={{
            inset: '40px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        />
        
        {/* Third inner outline */}
        <div 
          className="absolute rounded-full"
          style={{
            inset: '80px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        />

        {/* Rotating icons container - FULL 360 degrees */}
        <div 
          className="absolute inset-0"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.03s linear',
          }}
        >
          {icons.slice(0, iconCount).map((item, index) => {
            // Position icons around the FULL circle (360 degrees)
            const angle = (360 / iconCount) * index;
            const x = Math.cos((angle * Math.PI) / 180) * outerRadius + circleSize / 2;
            const y = Math.sin((angle * Math.PI) / 180) * outerRadius + circleSize / 2;
            
            return (
              <div
                key={index}
                className="absolute"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                }}
              >
                {/* Bubble icon */}
                <div 
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-white/25"
                  style={{
                    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <item.Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Inner rotating dots - FULL 360 degrees, opposite direction */}
        <div 
          className="absolute inset-0"
          style={{ 
            transform: `rotate(${-rotation * 0.6}deg)`,
            transition: 'transform 0.03s linear',
          }}
        >
          {[...Array(dotCount)].map((_, i) => {
            const angle = (360 / dotCount) * i;
            const x = Math.cos((angle * Math.PI) / 180) * innerRadius + circleSize / 2;
            const y = Math.sin((angle * Math.PI) / 180) * innerRadius + circleSize / 2;
            
            return (
              <div
                key={i}
                className="absolute w-2 h-2 md:w-2.5 md:h-2.5 bg-white/60 rounded-full"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Center logo - positioned OUTSIDE the circle container to overlap sections */}
      <div 
        className="absolute left-1/2 bottom-0"
        style={{
          transform: 'translateX(-50%) translateY(50%)',
          zIndex: 9999,
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-[-30px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 109, 6, 0.6) 0%, transparent 70%)',
          }}
        />
        
        {/* Logo container */}
        <div 
          className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white/60 flex items-center justify-center bg-gradient-to-br from-primary to-secondary cursor-pointer transition-all duration-300 hover:scale-110 hover:border-white"
          style={{
            boxShadow: '0 0 60px rgba(255, 109, 6, 0.7), 0 0 120px rgba(255, 109, 6, 0.4), 0 10px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/circlelogo.png"
            alt="Credora Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(25)].map((_, i) => {
          const left = 5 + (i * 3.8);
          const top = 15 + ((i * 13) % 55);
          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full animate-pulse"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: '2.5s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
