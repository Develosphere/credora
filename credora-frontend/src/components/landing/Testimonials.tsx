"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles, TrendingUp, X } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Founder",
    company: "StyleHouse",
    revenue: "$2.4M ARR",
    content: "Credora transformed how we understand our finances. We went from guessing our margins to knowing exactly which products drive profit. Our margins improved by 23% in just 3 months.",
    avatar: "SC",
  },
  {
    name: "Michael Torres",
    role: "CEO",
    company: "FitGear Pro",
    revenue: "$890K ARR",
    content: "The AI CFO feature is incredible. It's like having a financial advisor available 24/7. We've cut our ad waste by 40% and finally understand our true ROAS.",
    avatar: "MT",
  },
  {
    name: "Emma Williams",
    role: "Co-founder",
    company: "PetLux",
    revenue: "$1.8M ARR",
    content: "Before Credora, I spent hours in spreadsheets trying to figure out our P&L. Now I get real-time insights and can focus on growing the business instead.",
    avatar: "EW",
  },
  {
    name: "David Park",
    role: "Owner",
    company: "TechAccessories",
    revenue: "$3.2M ARR",
    content: "The cash flow forecasting saved us from a major inventory mistake. We now plan purchases with confidence knowing exactly when cash will be tight.",
    avatar: "DP",
  },
  {
    name: "Lisa Anderson",
    role: "Founder",
    company: "GlowSkin",
    revenue: "$1.5M ARR",
    content: "Switching to Credora was the best decision for our DTC brand. The integration with Shopify and Meta Ads gives us a complete picture of profitability.",
    avatar: "LA",
  },
  {
    name: "James Wilson",
    role: "CEO",
    company: "HomeEssentials",
    revenue: "$4.1M ARR",
    content: "We scaled from $500K to $4M in revenue and Credora grew with us. The insights helped us identify our best-performing SKUs and double down on winners.",
    avatar: "JW",
  },
];

const testimonials2 = [
  {
    name: "Rachel Kim",
    role: "Founder",
    company: "BeautyBox",
    revenue: "$2.1M ARR",
    content: "As a beginner in e-commerce, I struggled with financial tracking. Credora's AI-driven system provided me with data-backed insights that turned my business around.",
    avatar: "RK",
  },
  {
    name: "Alex Martinez",
    role: "Co-founder",
    company: "OutdoorGear",
    revenue: "$1.2M ARR",
    content: "Managing finances used to be frustrating. Since using Credora, my profit margins have increased by 35%, and I'm finally seeing the results I always hoped for.",
    avatar: "AM",
  },
  {
    name: "Jennifer Lee",
    role: "Owner",
    company: "KidsWorld",
    revenue: "$950K ARR",
    content: "I was skeptical at first, but Credora has exceeded my expectations. My success rate has gone up by 45%, and I feel much more confident making business decisions.",
    avatar: "JL",
  },
  {
    name: "Robert Brown",
    role: "CEO",
    company: "GadgetHub",
    revenue: "$2.8M ARR",
    content: "The real-time P&L tracking is a game-changer. I can see exactly how each product performs and make quick decisions to optimize our catalog.",
    avatar: "RB",
  },
  {
    name: "Amanda Foster",
    role: "Founder",
    company: "EcoLiving",
    revenue: "$1.6M ARR",
    content: "Credora helped us understand our true customer acquisition costs. We've reduced CAC by 30% while maintaining growth. Absolutely essential for any DTC brand.",
    avatar: "AF",
  },
  {
    name: "Chris Taylor",
    role: "Co-founder",
    company: "SportStyle",
    revenue: "$3.5M ARR",
    content: "The team collaboration features are fantastic. Our whole team can now access financial insights, making everyone more aligned on our growth goals.",
    avatar: "CT",
  },
];

interface TestimonialCardProps {
  testimonial: typeof testimonials[0];
  onClick: () => void;
  isSelected: boolean;
}

function TestimonialCard({ testimonial, onClick, isSelected }: TestimonialCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`flex-shrink-0 w-[350px] p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm cursor-pointer transition-all duration-500 group
        ${isSelected ? "scale-105 border-primary/50 bg-white/[0.06] shadow-xl shadow-primary/10" : "hover:border-primary/30 hover:bg-white/[0.05]"}
      `}
    >
      <p className="text-gray-300 text-sm leading-relaxed mb-6">
        &ldquo;{testimonial.content}&rdquo;
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
            {testimonial.avatar}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{testimonial.name}</div>
            <div className="text-gray-500 text-xs">{testimonial.role}, {testimonial.company}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-primary text-xs font-medium">{testimonial.revenue}</span>
        </div>
      </div>
    </div>
  );
}

function TestimonialModal({ testimonial, onClose }: { testimonial: typeof testimonials[0]; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/20 backdrop-blur-xl shadow-2xl animate-scale-in"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">
            {testimonial.avatar}
          </div>
          <div>
            <div className="text-white font-semibold text-lg">{testimonial.name}</div>
            <div className="text-gray-400 text-sm">{testimonial.role}, {testimonial.company}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">{testimonial.revenue}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-200 text-lg leading-relaxed">
          &ldquo;{testimonial.content}&rdquo;
        </p>

        <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2">
          <div className="flex -space-x-1">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-gray-400 text-sm">Verified Customer</span>
        </div>
      </div>
    </div>
  );
}

function Globe({ mousePosition }: { mousePosition: { x: number; y: number } }) {
  const offsetX = (mousePosition.x - 0.5) * 30;
  const offsetY = (mousePosition.y - 0.5) * 30;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      <div 
        className="relative w-[800px] h-[800px] transition-transform duration-300 ease-out"
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
      >
        {/* Globe circles with cursor-reactive opacity */}
        <div 
          className="absolute inset-0 rounded-full border border-primary/30 animate-[spin_60s_linear_infinite] transition-opacity duration-500"
          style={{ opacity: 0.15 + mousePosition.x * 0.15 }}
        />
        <div 
          className="absolute inset-[10%] rounded-full border border-primary/20 animate-[spin_50s_linear_infinite_reverse] transition-opacity duration-500"
          style={{ opacity: 0.12 + mousePosition.y * 0.12 }}
        />
        <div 
          className="absolute inset-[20%] rounded-full border border-primary/15 animate-[spin_40s_linear_infinite] transition-opacity duration-500"
          style={{ opacity: 0.1 + (1 - mousePosition.x) * 0.1 }}
        />
        <div 
          className="absolute inset-[30%] rounded-full border border-primary/10 animate-[spin_30s_linear_infinite_reverse] transition-opacity duration-500"
          style={{ opacity: 0.08 + (1 - mousePosition.y) * 0.08 }}
        />
        
        {/* Horizontal lines */}
        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        
        {/* Vertical arc lines */}
        <svg className="absolute inset-0 w-full h-full animate-[spin_80s_linear_infinite]" viewBox="0 0 400 400">
          <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="rgba(255,109,6,0.15)" strokeWidth="1" transform="rotate(0)" />
          <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="rgba(255,109,6,0.1)" strokeWidth="1" transform="rotate(60)" />
          <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="rgba(255,109,6,0.1)" strokeWidth="1" transform="rotate(120)" />
        </svg>
        
        {/* Glowing dots that react to cursor */}
        <div 
          className="absolute w-3 h-3 rounded-full bg-primary/60 blur-[2px] animate-pulse transition-all duration-300"
          style={{ 
            top: `${20 + mousePosition.y * 10}%`, 
            left: `${30 + mousePosition.x * 10}%`,
          }} 
        />
        <div 
          className="absolute w-2 h-2 rounded-full bg-secondary/50 blur-[1px] animate-pulse transition-all duration-300"
          style={{ 
            top: `${40 - mousePosition.y * 5}%`, 
            right: `${25 + mousePosition.x * 5}%`,
            animationDelay: "0.5s"
          }} 
        />
        <div 
          className="absolute w-3 h-3 rounded-full bg-primary/40 blur-[2px] animate-pulse transition-all duration-300"
          style={{ 
            bottom: `${30 + mousePosition.y * 8}%`, 
            left: `${40 - mousePosition.x * 8}%`,
            animationDelay: "1s"
          }} 
        />
        <div 
          className="absolute w-2 h-2 rounded-full bg-secondary/40 blur-[1px] animate-pulse transition-all duration-300"
          style={{ 
            top: `${60 - mousePosition.y * 6}%`, 
            right: `${35 - mousePosition.x * 6}%`,
            animationDelay: "1.5s"
          }} 
        />
      </div>
    </div>
  );
}

export function Testimonials() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<typeof testimonials[0] | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  }, []);

  const handleCardClick = (testimonial: typeof testimonials[0]) => {
    setSelectedTestimonial(testimonial);
    setIsPaused(true);
  };

  const handleCloseModal = () => {
    setSelectedTestimonial(null);
    setIsPaused(false);
  };

  return (
    <section 
      id="testimonials"
      ref={sectionRef} 
      className="relative py-32 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#080810] to-[#0a0a0a]" />
      
      {/* Globe background */}
      <Globe mousePosition={mousePosition} />
      
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className={`text-center mb-16 px-4 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Trusted by Brands
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Success Stories
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            See how e-commerce brands are transforming their financial clarity with Credora.
          </p>
        </div>

        {/* Row 1 - Scrolling Left */}
        <div 
          className={`mb-6 overflow-hidden transition-all duration-700 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
        >
          <div className={`flex gap-6 scroll-left ${isPaused ? "scroll-paused" : ""}`}>
            {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
              <TestimonialCard 
                key={`row1-${index}`} 
                testimonial={testimonial} 
                onClick={() => handleCardClick(testimonial)}
                isSelected={selectedTestimonial?.name === testimonial.name}
              />
            ))}
          </div>
        </div>

        {/* Row 2 - Scrolling Right */}
        <div 
          className={`overflow-hidden transition-all duration-700 delay-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
        >
          <div className={`flex gap-6 scroll-right ${isPaused ? "scroll-paused" : ""}`}>
            {[...testimonials2, ...testimonials2, ...testimonials2].map((testimonial, index) => (
              <TestimonialCard 
                key={`row2-${index}`} 
                testimonial={testimonial} 
                onClick={() => handleCardClick(testimonial)}
                isSelected={selectedTestimonial?.name === testimonial.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedTestimonial && (
        <TestimonialModal testimonial={selectedTestimonial} onClose={handleCloseModal} />
      )}
    </section>
  );
}
