"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    title: "Smart Financial Insights",
    description: "AI-powered analytics for your e-commerce business",
    cursorText: "Discover Insights",
  },
  {
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
    title: "Automated Bookkeeping",
    description: "Effortless transaction management and reconciliation",
    cursorText: "Automate Now",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    title: "Real-time Cash Flow",
    description: "Live dashboards and predictive forecasting",
    cursorText: "Track Growth",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div className="relative flex min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Animated Background - Faded */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        {/* Moving gradient background */}
        <div className="absolute inset-0 opacity-20 animate-gradient-move" />

        {/* Animated grid lines */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px overflow-hidden"
              style={{ top: `${(i + 1) * 8}%` }}
            >
              <div className="h-full w-[200%] bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-slide-right" 
                style={{ animationDuration: `${8 + i * 0.5}s`, animationDelay: `${i * 0.3}s` }} />
            </div>
          ))}
          {[...Array(16)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-px overflow-hidden"
              style={{ left: `${(i + 1) * 6}%` }}
            >
              <div className="w-full h-[200%] bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-slide-down"
                style={{ animationDuration: `${10 + i * 0.4}s`, animationDelay: `${i * 0.2}s` }} />
            </div>
          ))}
        </div>

        {/* Traveling dots */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={`travel-dot-${i}`}
              className="absolute w-1.5 h-1.5 bg-primary/30 rounded-full shadow-md shadow-primary/20 animate-travel-down"
              style={{ left: `${5 + (i % 5) * 22}%`, animationDuration: `${6 + (i % 4) * 2}s`, animationDelay: `${i * 0.8}s` }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <div
              key={`travel-dot-h-${i}`}
              className="absolute w-1.5 h-1.5 bg-secondary/25 rounded-full shadow-md shadow-secondary/20 animate-travel-right"
              style={{ top: `${10 + (i % 4) * 25}%`, animationDuration: `${8 + (i % 3) * 2}s`, animationDelay: `${i * 1.2}s` }}
            />
          ))}
        </div>

        {/* Pulsing dots */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div key={`dot-${i}`} className="absolute" style={{ left: `${12 + (i % 5) * 18}%`, top: `${16 + Math.floor(i / 5) * 22}%` }}>
              <div className="w-1 h-1 bg-primary/25 rounded-full animate-dot-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              <div className="absolute inset-0 w-1 h-1 bg-primary/15 rounded-full animate-dot-ripple" style={{ animationDelay: `${i * 0.15}s` }} />
            </div>
          ))}
        </div>

        {/* Scan lines */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-scan-v" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent animate-scan-v-delayed" />
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-scan-h" />

        {/* Floating orbs */}
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-primary/8 via-primary/3 to-transparent rounded-full blur-[120px] animate-orb-1" />
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-secondary/6 via-purple-500/3 to-transparent rounded-full blur-[100px] animate-orb-2" />
        <div className="absolute w-[400px] h-[400px] bg-gradient-to-bl from-orange-500/5 via-red-500/2 to-transparent rounded-full blur-[80px] animate-orb-3" />
        
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <div key={`particle-${i}`} className="absolute animate-float-up" style={{ left: `${10 + i * 10}%`, animationDuration: `${8 + i * 2}s`, animationDelay: `${i * 0.7}s` }}>
            <div className="w-1 h-1 bg-primary/20 rounded-full shadow-sm shadow-primary/10" />
          </div>
        ))}
      </div>

      {/* Left Panel - Image Slider */}
      <div className="hidden lg:flex lg:w-[55%] items-center p-14 relative z-10">
        <div 
          ref={sliderRef}
          className="relative w-full h-[calc(100vh-112px)] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHoveringSlider(true)}
          onMouseLeave={() => setIsHoveringSlider(false)}
          style={{ cursor: isHoveringSlider ? 'none' : 'default' }}
        >
          {/* Custom circular cursor */}
          {isHoveringSlider && (
            <div className="pointer-events-none absolute z-50 transition-transform duration-75" style={{ left: mousePos.x - 50, top: mousePos.y - 50 }}>
              <div className="relative w-[100px] h-[100px]">
                <div className="absolute inset-0 rounded-full border-2 border-white/80 animate-spin-slow" />
                <div className="absolute inset-2 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xs font-medium text-center px-2">{slides[currentSlide].cursorText}</span>
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-gradient-to-br from-primary/40 via-purple-500/20 to-transparent rounded-full blur-[80px] z-10 opacity-50" />

          {slides.map((slide, index) => (
            <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}>
              <Image src={slide.image} alt={slide.title} fill className="object-cover" priority={index === 0} unoptimized />
            </div>
          ))}

          <div className="absolute top-6 left-6 z-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 transition-transform group-hover:scale-110">
                <Image src="/images/circlelogo.png" alt="Credora" fill className="object-contain" />
              </div>
              <span className="text-lg font-bold text-white">Credora</span>
            </Link>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
            <h2 className="text-2xl font-bold text-white mb-2">{slides[currentSlide].title}</h2>
            <p className="text-gray-300 text-base mb-5">{slides[currentSlide].description}</p>
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button key={index} onClick={() => setCurrentSlide(index)} className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? "w-8 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/60"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 lg:w-[45%] flex items-center justify-center px-12 py-14 lg:px-24 lg:py-14 relative z-10">
        <div className="w-full max-w-md relative">
          <div className="absolute -inset-8 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl blur-3xl" />
          <div className="relative">{children}</div>
        </div>
      </div>

      {/* Top right logo */}
      <div className="absolute top-14 right-14 z-20 lg:block hidden">
        <div className="relative w-9 h-9 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse-slow" />
          <Image src="/images/circlelogo.png" alt="Credora" fill className="object-contain" />
        </div>
      </div>
    </div>
  );
}
