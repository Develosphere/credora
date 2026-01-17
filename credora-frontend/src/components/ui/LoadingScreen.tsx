"use client";

/**
 * Loading Screen Component
 * Attractive loading animation with rotating circular logo
 */

import { useEffect, useState, useCallback } from "react";
import { playIntroSound, enableAudio } from "@/lib/sounds";

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [soundPlayed, setSoundPlayed] = useState(false);

  // Enable audio on any user interaction
  useEffect(() => {
    const handleInteraction = () => {
      enableAudio();
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);  const handleComplete = useCallback(() => {
    if (!soundPlayed) {
      setSoundPlayed(true);
      playIntroSound();
    }
    setIsComplete(true);
    onLoadingComplete?.();
  }, [soundPlayed, onLoadingComplete]);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            handleComplete();
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Rotation animation
    const rotationInterval = setInterval(() => {
      setRotation((prev) => (prev + 2) % 360);
    }, 20);

    return () => {
      clearInterval(progressInterval);
      clearInterval(rotationInterval);
    };
  }, [handleComplete]);

  if (isComplete) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0a0a0a] transition-all duration-700 ${
        progress >= 100 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background gradient animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-secondary/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Rotating logo with rings */}
        <div className="relative w-40 h-40">
          {/* Outer rotating ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              boxShadow: '0 0 30px rgba(255, 109, 6, 0.3)',
            }}
          >
            {/* Dots on outer ring */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-secondary rounded-full shadow-lg shadow-secondary/50"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
          </div>
          
          {/* Middle rotating ring - opposite direction */}
          <div 
            className="absolute inset-4 rounded-full border border-white/20"
            style={{ 
              transform: `rotate(${-rotation * 0.7}deg)`,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white/60 rounded-full"></div>
          </div>

          {/* Inner glow ring */}
          <div 
            className="absolute inset-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 109, 6, 0.3) 0%, transparent 70%)',
            }}
          />
          
          {/* Rotating circular logo */}
          <div 
            className="absolute inset-8 rounded-full overflow-hidden border-2 border-white/30"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              boxShadow: '0 0 40px rgba(255, 109, 6, 0.5), 0 0 80px rgba(255, 109, 6, 0.3)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/circlelogo.png"
              alt="Credora"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Outer glow effect */}
          <div 
            className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl animate-pulse"
            style={{ transform: 'scale(1.2)' }}
          ></div>
        </div>

        {/* Brand name */}
        <h1 className="mt-10 text-3xl font-bold text-white tracking-wider">
          <span className="bg-gradient-to-r from-primary via-orange-400 to-secondary bg-clip-text text-transparent">
            CREDORA
          </span>
        </h1>
        <p className="mt-2 text-sm text-gray-400">AI-Powered CFO for E-commerce</p>

        {/* Progress bar */}
        <div className="mt-8 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500 font-mono">{progress}%</p>
      </div>

      {/* Bottom text */}
      <p className="absolute bottom-8 text-xs text-gray-600">
        Loading your financial intelligence...
      </p>
    </div>
  );
}
