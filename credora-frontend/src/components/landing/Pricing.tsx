"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Sparkles, TrendingUp, Users, Zap } from "lucide-react";

const plans = [
  {
    name: "Starter",
    icon: Zap,
    description: "Perfect for new stores",
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      "1 Shopify store",
      "Basic P&L dashboard",
      "7-day data history",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
    gradient: "from-gray-500 to-gray-600",
  },
  {
    name: "Growth",
    icon: TrendingUp,
    description: "Most popular plan",
    monthlyPrice: 79,
    annualPrice: 66,
    features: [
      "All Starter features",
      "3 Shopify stores",
      "Meta & Google Ads integration",
      "AI CFO insights",
      "90-day data history",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-primary to-secondary",
  },
  {
    name: "Scale",
    icon: Users,
    description: "For growing teams",
    monthlyPrice: 149,
    annualPrice: 124,
    features: [
      "All Growth features",
      "Unlimited stores",
      "Team collaboration",
      "Custom reports",
      "Unlimited data history",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
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

  return (
    <section ref={sectionRef} id="pricing" className="relative py-32 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
      
      {/* Floating orbs */}
      <div className="absolute top-40 left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-40 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,109,6,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,109,6,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 container mx-auto max-w-6xl">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Simple Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Flexible pricing for
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              businesses of all sizes
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Toggle */}
        <div className={`flex justify-center mb-16 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="relative inline-flex items-center p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            {/* Sliding background */}
            <div 
              className="absolute top-1.5 bottom-1.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out shadow-lg shadow-primary/30"
              style={{ 
                left: isAnnual ? "calc(50% + 3px)" : "6px",
                width: isAnnual ? "calc(50% - 9px)" : "calc(50% - 9px)"
              }}
            />
            
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative z-10 w-28 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 text-center ${
                !isAnnual ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative z-10 w-36 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 flex items-center justify-center gap-2 ${
                isAnnual ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Annual
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
                isAnnual ? "bg-white/20 text-white" : "bg-primary/20 text-primary"
              }`}>
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative group transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/30">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Card */}
              <div
                className={`relative h-full p-8 rounded-3xl transition-all duration-500 ${
                  plan.popular 
                    ? "bg-gradient-to-b from-primary/10 to-transparent border-2 border-primary/30 scale-105 lg:scale-110" 
                    : "bg-white/[0.03] border border-white/10 hover:border-primary/30"
                } ${hoveredCard === index ? "transform -translate-y-2" : ""}`}
                style={{
                  boxShadow: plan.popular 
                    ? "0 0 60px rgba(255,109,6,0.15), inset 0 1px 0 rgba(255,255,255,0.1)" 
                    : hoveredCard === index 
                      ? "0 20px 40px rgba(0,0,0,0.3)" 
                      : "none"
                }}
              >
                {/* Glow effect for popular */}
                {plan.popular && (
                  <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/20 to-transparent opacity-50 blur-xl" />
                )}

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 transition-transform duration-300 ${hoveredCard === index ? "scale-110 rotate-3" : ""}`}>
                    <plan.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Plan name & description */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white">
                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-gray-400 text-lg">/mo</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-primary mt-1">
                        Billed annually (${plan.annualPrice * 12}/year)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.popular ? "from-primary to-secondary" : "from-primary/20 to-secondary/20"} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className={`w-3 h-3 ${plan.popular ? "text-white" : "text-primary"}`} />
                        </div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]"
                        : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-primary/30"
                    }`}
                  >
                    <plan.icon className="w-5 h-5" />
                    {plan.cta}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className={`text-center mt-12 transition-all duration-700 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <p className="text-gray-500 text-sm">
            All plans include a <span className="text-primary">14-day free trial</span>. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
