"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, TrendingUp, FileText, DollarSign, Package, Megaphone, MessageSquare, Search, Sparkles, Command, X, Zap, Users, PlaySquare, Settings, Activity, ShoppingCart, Box, UsersIcon, BarChart3, HelpCircle, ChevronLeft, ChevronRight, Menu } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Insights", href: "/insights", icon: TrendingUp },
  { name: "P&L Statement", href: "/pnl", icon: FileText },
  { name: "Cash Forecast", href: "/forecast", icon: DollarSign },
  { name: "SKU Analysis", href: "/sku-analysis", icon: Package },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "AI CFO Chat", href: "/chat", icon: MessageSquare },
  { name: "Competitor", href: "/competitor", icon: Users },
  { name: "What-If", href: "/whatif", icon: PlaySquare },
];

const system = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help Center", href: "/help", icon: HelpCircle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`flex h-full flex-col bg-[#1a1a1a] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo Section with Toggle Button */}
      <div className={`flex items-center justify-between px-5 py-6 ${isCollapsed ? 'flex-col gap-4' : ''}`}>
        <Link href="/dashboard" className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
          <div className="relative w-10 h-10 flex-shrink-0">
            {!logoError ? (
              <Image 
                src="/images/circlelogo.png" 
                alt="Credora" 
                fill 
                className="object-contain rounded-xl" 
                onError={() => setLogoError(true)} 
                priority 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6d06] to-[#ff3d00] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                C
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-lg font-semibold text-white whitespace-nowrap">Credora</span>
          )}
        </Link>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all duration-200 group flex-shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 group relative ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive 
                    ? "bg-gradient-to-r from-[#ff6d06]/90 to-[#ff5500]/90 text-white shadow-lg shadow-[#ff6d06]/20" 
                    : "text-gray-400 hover:text-white hover:bg-[#252525]"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[#2a2a2a] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-[#3a3a3a]">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-[#2a2a2a]" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-[#252525]">
        <div className="space-y-1">
          {system.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 group relative ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive 
                    ? "bg-gradient-to-r from-[#ff6d06]/90 to-[#ff5500]/90 text-white shadow-lg shadow-[#ff6d06]/20" 
                    : "text-gray-400 hover:text-white hover:bg-[#252525]"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[#2a2a2a] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-[#3a3a3a]">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-[#2a2a2a]" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
