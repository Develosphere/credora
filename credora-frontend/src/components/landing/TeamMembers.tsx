"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

const teamMembers = [
  {
    id: 1,
    name: "Laraib Ashraf",
    role: "Full Stack Developer",
    description: "His role is to make this project more attractive and up to the mark.",
    image: "/images/member 1.png",
  },
  {
    id: 2,
    name: "Nathan Asif",
    role: "Backend Developer",
    description: "Responsible for building robust APIs and server-side logic.",
    image: "/images/member 2.png",
  },
  {
    id: 3,
    name: "Hasnain Saleem",
    role: "Creative Head & Frontend Developer",
    description: "Bridges the gap between frontend and backend development.",
    image: "/images/member 3.png",
  },
  {
    id: 4,
    name: "Anas Aqeel",
    role: "AI Engineer",
    description: "Ensures smooth deployment and infrastructure management.",
    image: "/images/member 4.png",
  },
];

export function TeamMembers() {
  const [selectedMember, setSelectedMember] = useState(teamMembers[0]);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<typeof teamMembers[0] | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isInGrid, setIsInGrid] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Custom cursor tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section id="team" ref={sectionRef} className="relative py-32 px-4 overflow-hidden bg-[#0a0a0a]">
      {/* Custom Cursor */}
      <div
        className={`fixed pointer-events-none z-[9999] transition-all duration-300 ease-out ${
          isInGrid && hoveredMember ? "opacity-100 scale-100" : "opacity-0 scale-0"
        }`}
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-primary to-secondary animate-spin-slow opacity-50 blur-sm" />
          <div className="w-20 h-20 rounded-full bg-black/90 border-2 border-primary flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-xs font-bold text-center px-2 leading-tight">
              {hoveredMember?.name.split(" ")[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse-slow" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,109,6,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,109,6,0.3) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        
        {/* Animated particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 container mx-auto max-w-6xl">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6 animate-glow">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Our Team
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Meet the <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-gradient">Experts</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">The brilliant minds behind Credora&apos;s success</p>
        </div>

        {/* Team Grid */}
        <div className={`flex flex-col lg:flex-row gap-8 items-stretch transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          {/* Left - Featured Member */}
          <div className="lg:w-1/2 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-3xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500 animate-gradient-shift" />
            <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-b from-primary/20 to-transparent border border-white/5">
              <Image
                src={selectedMember.image}
                alt={selectedMember.name}
                fill
                className="object-cover object-top transition-all duration-700 group-hover:scale-105"
              />
              {/* Animated overlay lines */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                <div className="overflow-hidden">
                  <h3 
                    key={selectedMember.id + "-name"} 
                    className="text-3xl font-bold text-white mb-2 animate-slide-up"
                  >
                    {selectedMember.name}
                  </h3>
                </div>
                <div className="overflow-hidden">
                  <p 
                    key={selectedMember.id + "-role"} 
                    className="text-primary font-semibold uppercase tracking-wider text-sm mb-3 animate-slide-up-delayed"
                  >
                    {selectedMember.role}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <p 
                    key={selectedMember.id + "-desc"} 
                    className="text-gray-400 italic animate-slide-up-more-delayed"
                  >
                    {selectedMember.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Member Columns */}
          <div 
            ref={gridRef}
            className="lg:w-1/2 grid grid-cols-4 gap-3"
            onMouseEnter={() => setIsInGrid(true)}
            onMouseLeave={() => {
              setIsInGrid(false);
              setHoveredMember(null);
            }}
            style={{ cursor: isInGrid ? "none" : "auto" }}
          >
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                onMouseEnter={() => setHoveredMember(member)}
                onMouseLeave={() => setHoveredMember(null)}
                className={`relative rounded-2xl overflow-hidden transition-all duration-500 h-[500px] group/card ${
                  selectedMember.id === member.id 
                    ? "ring-2 ring-primary shadow-lg shadow-primary/30 scale-[1.02]" 
                    : "opacity-70 hover:opacity-100 hover:scale-[1.01]"
                }`}
                style={{ 
                  cursor: "none",
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Animated border on hover */}
                <div className={`absolute inset-0 z-20 rounded-2xl transition-opacity duration-300 ${
                  hoveredMember?.id === member.id ? "opacity-100" : "opacity-0"
                }`}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-border-pulse" />
                </div>

                {/* Number with glow */}
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 ${
                  selectedMember.id === member.id ? "text-primary scale-110" : "text-white/50 group-hover/card:text-primary/70"
                }`}>
                  <span className="text-4xl font-bold relative">
                    0{index + 1}
                    {selectedMember.id === member.id && (
                      <span className="absolute inset-0 text-4xl font-bold text-primary blur-md animate-pulse">0{index + 1}</span>
                    )}
                  </span>
                </div>
                
                {/* Gradient overlay with animation */}
                <div className={`absolute inset-0 z-[5] transition-all duration-500 ${
                  selectedMember.id === member.id 
                    ? "bg-gradient-to-t from-primary/40 via-primary/10 to-transparent" 
                    : "bg-gradient-to-t from-black/80 via-black/30 to-black/20 group-hover/card:from-primary/30 group-hover/card:via-primary/5"
                }`} />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000" />
                </div>
                
                {/* Image with zoom effect */}
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover object-top transition-transform duration-700 group-hover/card:scale-110"
                />

                {/* Bottom name reveal on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10 translate-y-full group-hover/card:translate-y-0 transition-transform duration-500">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-primary/20">
                    <p className="text-white text-xs font-semibold text-center truncate">{member.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
