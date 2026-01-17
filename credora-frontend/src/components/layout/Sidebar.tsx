"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Package,
  Megaphone,
  Calculator,
  MessageSquare,
  Lightbulb,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "P&L Statement", href: "/pnl", icon: FileText },
  { name: "Cash Forecast", href: "/forecast", icon: TrendingUp },
  { name: "SKU Analytics", href: "/sku-analysis", icon: Package },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "What-If", href: "/whatif", icon: Calculator },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Insights", href: "/insights", icon: Lightbulb },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "System Status", href: "/status", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-100 bg-white/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-100 px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {/* Logo image - falls back to gradient box */}
          <div className="relative w-9 h-9 flex-shrink-0">
            {!logoError ? (
              <Image
                src="/images/logo.svg"
                alt="Credora"
                fill
                className="object-contain"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-credora-orange to-credora-red text-white font-bold shadow-glow transition-all duration-300 group-hover:shadow-glow-lg group-hover:scale-105">
                C
              </div>
            )}
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-credora-orange to-credora-red bg-clip-text text-transparent">
            Credora
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "animate-fade-in-up",
                  isActive
                    ? "bg-gradient-to-r from-credora-orange to-credora-red text-white shadow-glow"
                    : "text-gray-600 hover:bg-primary-light hover:text-credora-orange"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-gray-100 px-3 py-4">
        <div className="space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-credora-orange to-credora-red text-white shadow-glow"
                    : "text-gray-600 hover:bg-primary-light hover:text-credora-orange"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pro Badge */}
      <div className="px-3 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-primary-light to-secondary-light p-4 border border-credora-orange/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-credora-orange uppercase tracking-wide">Pro Features</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Unlock advanced analytics and AI insights
          </p>
          <button className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-gradient-to-r from-credora-orange to-credora-red text-white shadow-sm hover:shadow-glow transition-all duration-300 hover:translate-y-[-1px]">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}
