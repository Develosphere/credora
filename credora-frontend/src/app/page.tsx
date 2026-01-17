"use client";

/**
 * Landing Page
 * Premium hero with glassmorphism navbar, animated CTAs, rotating circle, and loading screen
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  FileText,
  TrendingUp,
  Package,
  Calculator,
  MessageSquare,
  Zap,
  BarChart3,
  DollarSign,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { FloatingCursors } from "@/components/landing/FloatingCursors";
import { RotatingCircle } from "@/components/landing/RotatingCircle";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TrustedBrands } from "@/components/landing/TrustedBrands";
import { BentoGrid } from "@/components/landing/BentoGrid";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { TeamMembers } from "@/components/landing/TeamMembers";
import { playScrollSound, playClickSound, enableAudio } from "@/lib/sounds";

const features = [
  {
    icon: FileText,
    title: "Automated P&L",
    description: "Real-time profit and loss statements from your Shopify and ad platforms.",
  },
  {
    icon: TrendingUp,
    title: "Cash Forecasting",
    description: "AI-powered forecasts across multiple scenarios.",
  },
  {
    icon: Package,
    title: "SKU Economics",
    description: "True profitability per product with ad attribution.",
  },
  {
    icon: Calculator,
    title: "What-If Simulations",
    description: "Model pricing changes and inventory decisions.",
  },
  {
    icon: MessageSquare,
    title: "AI CFO Chat",
    description: "Get instant, data-backed answers about your finances.",
  },
];

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Enable audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      enableAudio();
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setTimeout(() => setIsVisible(true), 100);
  };

  // Handle navigation click with sound
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      playScrollSound();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
    }
  };

  // Handle button click with sound
  const handleButtonClick = () => {
    playClickSound();
  };

  return (
    <>
      {/* Loading Screen */}
      <LoadingScreen onLoadingComplete={handleLoadingComplete} />

      <div className={`min-h-screen bg-[#0a0a0a] text-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
        {/* Animated Background Gradient */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a]"></div>
        </div>

        {/* Glassmorphism Navigation */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
          <div className="container mx-auto px-4 md:px-8">
            <nav className={`flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500 ${
              scrolled 
                ? 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20' 
                : 'bg-white/5 backdrop-blur-md border border-white/10'
            }`}>
              {/* Logo */}
              <Link href="/" className="group">
                <div className="relative w-32 h-12 group-hover:scale-105 transition-all duration-300">
                  <Image
                    src="/images/logo.png"
                    alt="Credora"
                    fill
                    className="object-contain"
                  />
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </a>
                <a href="#team" onClick={(e) => handleNavClick(e, '#team')} className="text-sm text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                  Team
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </a>
                <a href="#testimonials" onClick={(e) => handleNavClick(e, '#testimonials')} className="text-sm text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                  Testimonials
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </a>
                <a href="#pricing" onClick={(e) => handleNavClick(e, '#pricing')} className="text-sm text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                  Pricing
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </a>
                <a href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm text-gray-300 hover:text-white transition-colors relative group cursor-pointer">
                  How it Works
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </a>
              </div>

              {/* CTA Button */}
              <div className="hidden md:block">
                <Link
                  href="/signup"
                  onClick={handleButtonClick}
                  className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105"
                >
                  <span className="relative z-10">Get Started</span>
                  <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-white"
                onClick={() => {
                  playClickSound();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-2 p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">
                <div className="flex flex-col gap-4">
                  <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="text-gray-300 hover:text-white transition-colors cursor-pointer">Features</a>
                  <a href="#team" onClick={(e) => handleNavClick(e, '#team')} className="text-gray-300 hover:text-white transition-colors cursor-pointer">Team</a>
                  <a href="#testimonials" onClick={(e) => handleNavClick(e, '#testimonials')} className="text-gray-300 hover:text-white transition-colors cursor-pointer">Testimonials</a>
                  <a href="#pricing" onClick={(e) => handleNavClick(e, '#pricing')} className="text-gray-300 hover:text-white transition-colors cursor-pointer">Pricing</a>
                  <a href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-gray-300 hover:text-white transition-colors cursor-pointer">How it Works</a>
                  <Link href="/signup" onClick={handleButtonClick} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                    Get Started <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col pt-32 pb-0 overflow-hidden">
          {/* Floating Cursors */}
          <FloatingCursors />

          {/* Hero Content */}
          <div className="relative z-10 container mx-auto px-4 text-center flex-1 flex flex-col justify-center">
            {/* Main Headline */}
            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Maximize profits, outshine competitors,
              <br className="hidden md:block" />
              and scale with{" "}
              <span className="bg-gradient-to-r from-primary via-orange-400 to-secondary bg-clip-text text-transparent">
                AI-powered insights.
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Your AI CFO for e-commerce. Connect your Shopify store and ad accounts—Credora handles everything you need to boost profitability and make data-driven decisions.
            </p>

            {/* CTA Buttons */}
            <div className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Primary CTA */}
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">Get Started Now</span>
                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                {/* Animated shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
              </Link>

              {/* Secondary CTA */}
              <Link
                href="#features"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 text-white font-semibold text-lg hover:bg-white/5 hover:border-white/40 transition-all duration-300"
              >
                <span>Explore Features</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Rating */}
            <div className={`mt-8 flex items-center justify-center gap-2 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-gray-400">
                <span className="text-white font-semibold">4.9/5</span> Based on 500+ reviews on{" "}
                <span className="text-primary underline">G2</span>,{" "}
                <span className="text-primary underline">Capterra</span>, and{" "}
                <span className="text-primary underline">Trustpilot</span>
              </span>
            </div>
          </div>

          {/* Rotating Circle */}
          <div className={`relative mt-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`} style={{ zIndex: 9999 }}>
            <RotatingCircle />
          </div>
        </section>


        {/* Trusted By Section */}
        <section className="relative py-16 pt-24 border-t border-white/5 bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f]">
          <div className="container mx-auto px-4">
            <ScrollReveal direction="up" delay={0}>
              <p className="text-center text-gray-500 mb-10">
                Used daily by <span className="text-white font-semibold">10,000+</span> e-commerce brands, agencies, and growing businesses
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
              <TrustedBrands />
            </ScrollReveal>
          </div>
        </section>

        {/* Bento Grid Section */}
        <ScrollReveal direction="up" delay={0}>
          <BentoGrid />
        </ScrollReveal>

        {/* Features Section */}
        <section id="features" className="relative py-32 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#0a0a0a] to-[#0a0a0a]"></div>
          
          <div className="relative z-10 container mx-auto max-w-6xl">
            <ScrollReveal direction="up" delay={0}>
              <div className="text-center mb-16">
                <div className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
                  Powerful Features
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Everything you need to
                  <br />
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    understand your finances
                  </span>
                </h2>
                <p className="text-gray-400 max-w-xl mx-auto">
                  Stop guessing. Start knowing. Credora connects to your data sources and gives you clarity on what&apos;s working.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <ScrollReveal key={feature.title} direction="up" delay={index * 100}>
                  <div
                    className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/50 hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-2 h-full"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                        <feature.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team Members Section */}
        <ScrollReveal direction="up" delay={0}>
          <TeamMembers />
        </ScrollReveal>

        {/* Testimonials Section */}
        <ScrollReveal direction="up" delay={0}>
          <Testimonials />
        </ScrollReveal>

        {/* Pricing Section */}
        <ScrollReveal direction="up" delay={0}>
          <Pricing />
        </ScrollReveal>

        {/* How It Works Section */}
        <section id="how-it-works" className="relative py-32 px-4">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]"></div>
          </div>

          <div className="relative z-10 container mx-auto max-w-6xl">
            <ScrollReveal direction="up" delay={0}>
              <div className="text-center mb-16">
                <div className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
                  Simple Setup
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Get started in
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> 3 minutes</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  icon: Zap,
                  title: "Connect Your Store",
                  description: "Link your Shopify store with one click. We securely sync your sales, refunds, and product data.",
                },
                {
                  step: "02",
                  icon: BarChart3,
                  title: "Link Ad Accounts",
                  description: "Connect Meta and Google Ads to see true ROAS and attribute ad spend to actual profit.",
                },
                {
                  step: "03",
                  icon: DollarSign,
                  title: "Get Insights",
                  description: "Instantly see your P&L, cash forecast, and AI-powered recommendations to grow profitably.",
                },
              ].map((item, index) => (
                <ScrollReveal key={item.step} direction="up" delay={index * 150}>
                  <div className="relative group">
                    {index < 2 && (
                      <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                    )}
                    
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 group-hover:border-primary/50 group-hover:bg-white/[0.05] transition-all duration-300">
                        <span className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                          {item.step}
                        </span>
                        <item.icon className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-32 px-4">
          <div className="absolute inset-0">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          </div>

          <div className="relative z-10 container mx-auto max-w-3xl text-center">
            <ScrollReveal direction="up" delay={0}>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to take
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> control?</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
              <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
                Join 10,000+ e-commerce businesses using Credora to make smarter, data-driven decisions.
              </p>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-lg font-semibold text-white overflow-hidden hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <span className="relative z-10">Get Started for Free</span>
                  <ArrowRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 text-lg font-medium text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300"
                >
                  Sign In
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300}>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Cancel anytime</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-4 bg-[#050505]">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal direction="up" delay={0}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <Link href="/" className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                    <Image
                      src="/images/logo.png"
                      alt="Credora"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-white font-semibold">Credora</span>
                </Link>
                <div className="flex items-center gap-8 text-sm text-gray-500">
                  <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                  <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                  <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                </div>
                <p className="text-sm text-gray-500">
                  &copy; {new Date().getFullYear()} Credora. All rights reserved.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </footer>
      </div>
    </>
  );
}
