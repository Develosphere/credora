"use client";

/**
 * BentoGrid Component
 * Modern asymmetric grid with curved shapes, animations, and interactive elements
 */

import { useEffect, useState, useRef } from "react";
import { 
  TrendingUp, 
  Zap,
  MessageSquare,
  Sparkles,
  ArrowUpRight
} from "lucide-react";

// Animated counter hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [hasStarted, end, duration]);

  return { count, ref };
}


// Flickering number component for live effect
function FlickeringNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const variance = Math.floor(Math.random() * 5) - 2;
      setDisplayValue(value + variance);
    }, 100);
    
    return () => clearInterval(interval);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// Animated bar component
function AnimatedBar({ height, delay, index }: { height: number; delay: number; index: number }) {
  const [currentHeight, setCurrentHeight] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setCurrentHeight(height), delay);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [height, delay]);

  return (
    <div 
      ref={ref} 
      className="flex-1 h-full flex items-end cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="w-full bg-gradient-to-t from-primary/80 to-secondary rounded-t transition-all duration-700 ease-out relative group"
        style={{ 
          height: `${isHovered ? Math.min(currentHeight + 15, 100) : currentHeight}%`,
          boxShadow: isHovered ? '0 0 20px rgba(255,109,6,0.5)' : 'none'
        }}
      >
        {isHovered && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-bounce">
            ${(index + 1) * 1.2}K
          </div>
        )}
      </div>
    </div>
  );
}


// Pulsing dot component
function PulsingDot({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <span className="relative flex h-3 w-3">
      <span 
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
        style={{ animationDelay: `${delay}ms` }}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

export function BentoGrid() {
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const revenueCounter = useCountUp(2400000, 2500);
  const insightsCounter = useCountUp(10847, 2000);

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      
      <div className="relative z-10 container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Why Credora
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Your complete
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> financial toolkit</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-4 md:gap-5">

          {/* Card 1 - Large Left Card with Tags & Chart */}
          <div 
            className="col-span-12 md:col-span-5 md:row-span-2 group relative overflow-hidden p-6 md:p-8 transition-all duration-500 hover:scale-[1.02]"
            onMouseEnter={() => setIsHovered(1)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              borderRadius: "2rem 2rem 4rem 2rem",
              border: isHovered === 1 ? "1px solid rgba(255,109,6,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className={`absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl transition-opacity duration-500 ${isHovered === 1 ? "opacity-100" : "opacity-0"}`} />
            
            <div className="relative z-10">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-4 transition-transform duration-300 ${isHovered === 1 ? "translate-x-2" : ""}`}>
                <PulsingDot color="bg-green-400" />
                Live Tracking
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Real-time P&L Tracking.</h3>
              <p className="text-gray-400 text-sm mb-6">Monitor your profit margins across all channels instantly.</p>
              
              {/* Animated Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {["Shopify", "Meta Ads", "Google Ads", "TikTok", "Amazon"].map((tag, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 transition-all duration-300 hover:scale-110 hover:bg-primary/30 cursor-pointer"
                    style={{ 
                      transform: isHovered === 1 ? `translateY(-${(i % 3) * 3}px)` : "translateY(0)",
                      transitionDelay: `${i * 50}ms`
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Animated Chart */}
              <div className="flex items-end gap-1.5 h-28 mt-auto">
                {[35, 55, 40, 70, 50, 85, 60, 90, 55, 75, 65, 95].map((h, i) => (
                  <AnimatedBar key={i} height={h} delay={i * 80} index={i} />
                ))}
              </div>
            </div>
          </div>


          {/* Card 2 - Top Right with Avatars */}
          <div 
            className="col-span-12 md:col-span-7 group relative overflow-hidden p-6 md:p-8 transition-all duration-500 hover:scale-[1.02]"
            onMouseEnter={() => setIsHovered(2)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              borderRadius: "2rem 4rem 2rem 2rem",
              border: isHovered === 2 ? "1px solid rgba(255,109,6,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className={`absolute bottom-0 left-0 w-40 h-40 bg-secondary/20 rounded-full blur-3xl transition-opacity duration-500 ${isHovered === 2 ? "opacity-100" : "opacity-0"}`} />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">AI-Powered Insights.</h3>
                <p className="text-gray-400 text-sm">Get actionable recommendations from your AI CFO.</p>
              </div>
              
              {/* Animated Avatar Stack */}
              <div className="flex items-center">
                <div className="flex -space-x-3">
                  {["from-primary to-orange-400", "from-secondary to-red-400", "from-amber-500 to-orange-500", "from-orange-400 to-primary"].map((gradient, i) => (
                    <div 
                      key={i}
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} border-2 border-[#0a0a0a] flex items-center justify-center transition-all duration-300`}
                      style={{
                        transform: isHovered === 2 ? `translateY(-${i * 4}px) scale(1.1)` : "translateY(0) scale(1)",
                        transitionDelay: `${i * 50}ms`
                      }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  ))}
                </div>
                <div className="ml-4 text-sm text-gray-400" ref={insightsCounter.ref}>
                  <span className="text-white font-bold text-lg">
                    <FlickeringNumber value={insightsCounter.count} suffix="+" />
                  </span>
                  <br />insights
                </div>
              </div>
            </div>
          </div>


          {/* Card 3 - Chat Card */}
          <div 
            className="col-span-12 md:col-span-4 group relative overflow-hidden p-6 transition-all duration-500 hover:scale-[1.02]"
            onMouseEnter={() => setIsHovered(3)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              borderRadius: "2rem 2rem 2rem 3rem",
              border: isHovered === 3 ? "1px solid rgba(255,109,6,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="relative z-10">
              <div className={`flex items-start gap-3 mb-4 transition-all duration-500 ${isHovered === 3 ? "translate-y-[-4px]" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-gray-300 transition-all duration-300" style={{ transform: isHovered === 3 ? "scale(1.02)" : "scale(1)" }}>
                  What&apos;s my best performing SKU?
                </div>
              </div>
              
              <div className={`flex items-start gap-3 mb-4 ml-8 transition-all duration-500 ${isHovered === 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-tr-none px-4 py-2.5 text-sm text-primary">
                  SKU-2847 with $12.4K profit ↑
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white">AI CFO Chat</h3>
              <p className="text-gray-400 text-sm">Ask anything about your finances.</p>
            </div>
          </div>

          {/* Card 4 - Stats Card with Counter */}
          <div 
            className="col-span-6 md:col-span-3 group relative overflow-hidden p-6 flex flex-col items-center justify-center text-center transition-all duration-500 hover:scale-[1.02]"
            onMouseEnter={() => setIsHovered(4)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,109,6,0.15) 0%, rgba(255,61,0,0.08) 100%)",
              borderRadius: "3rem 2rem 2rem 2rem",
              border: isHovered === 4 ? "1px solid rgba(255,109,6,0.5)" : "1px solid rgba(255,109,6,0.2)",
            }}
            ref={revenueCounter.ref}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent transition-opacity duration-500 ${isHovered === 4 ? "opacity-100" : "opacity-0"}`} />
            
            <div className="relative z-10">
              <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1 transition-transform duration-300 ${isHovered === 4 ? "scale-110" : ""}`}>
                $<FlickeringNumber value={Math.floor(revenueCounter.count / 100000)} suffix=".4M" />
              </div>
              <div className="text-gray-400 text-xs flex items-center justify-center gap-1">
                Revenue tracked
                <ArrowUpRight className={`w-3 h-3 text-primary transition-transform duration-300 ${isHovered === 4 ? "translate-x-1 -translate-y-1" : ""}`} />
              </div>
            </div>
          </div>


          {/* Card 5 - Cash Forecasting */}
          <div 
            className="col-span-6 md:col-span-4 group relative overflow-hidden p-6 transition-all duration-500 hover:scale-[1.02]"
            onMouseEnter={() => setIsHovered(5)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              borderRadius: "2rem 2rem 3rem 2rem",
              border: isHovered === 5 ? "1px solid rgba(255,109,6,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 flex items-center justify-center mb-4 transition-all duration-300 ${isHovered === 5 ? "scale-110 rotate-6" : ""}`}>
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Cash Forecasting</h3>
              <p className="text-gray-400 text-sm">AI-powered runway projections</p>
              
              <div className={`mt-4 h-10 transition-all duration-500 ${isHovered === 5 ? "opacity-100" : "opacity-60"}`}>
                <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ff6d06" />
                      <stop offset="100%" stopColor="#ff3d00" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M0,25 Q20,20 30,22 T50,15 T70,18 T100,5" 
                    fill="none" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 150,
                      strokeDashoffset: isHovered === 5 ? 0 : 150,
                      transition: "stroke-dashoffset 1.5s ease-out"
                    }}
                  />
                  <circle cx="100" cy="5" r="4" fill="#ff6d06" className={`transition-all duration-500 ${isHovered === 5 ? "opacity-100" : "opacity-0"}`}>
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
            </div>
          </div>


          {/* Card 6 - Large Feature Card */}
          <div 
            className="col-span-12 md:col-span-8 group relative overflow-hidden p-6 md:p-8 transition-all duration-500 hover:scale-[1.01]"
            onMouseEnter={() => setIsHovered(6)}
            onMouseLeave={() => setIsHovered(null)}
            style={{
              background: "linear-gradient(145deg, rgba(255,109,6,0.12) 0%, rgba(255,61,0,0.05) 100%)",
              borderRadius: "2rem 3rem 3rem 2rem",
              border: isHovered === 6 ? "1px solid rgba(255,109,6,0.5)" : "1px solid rgba(255,109,6,0.2)",
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-50" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-500 ${isHovered === 6 ? "scale-110 rotate-[-8deg]" : ""}`}>
                <Zap className={`w-10 h-10 md:w-12 md:h-12 text-white transition-all duration-300 ${isHovered === 6 ? "scale-110" : ""}`} />
              </div>
              
              <div className="text-center md:text-left flex-1">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Scale your e-commerce <span className="text-primary">profitably</span>
                </h3>
                <p className="text-gray-400">Make data-driven decisions with real-time financial intelligence.</p>
                
                <div className={`flex items-center gap-6 mt-4 transition-all duration-500 ${isHovered === 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <div className="flex items-center gap-2">
                    <PulsingDot color="bg-green-400" />
                    <span className="text-sm text-gray-400">Live sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PulsingDot color="bg-primary" delay={500} />
                    <span className="text-sm text-gray-400">Auto-updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
