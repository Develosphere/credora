"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, BarChart3, ArrowLeftRight, FileText, RefreshCw, CreditCard, MessageSquare, Search, Sparkles, Command, X, Zap } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/insights", icon: BarChart3, badge: "05" },
  { name: "Transactions", href: "/pnl", icon: ArrowLeftRight },
  { name: "Invoices", href: "/forecast", icon: FileText },
];

const features = [
  { name: "Recurring", href: "/sku-analysis", icon: RefreshCw, badge: "16" },
  { name: "Subscriptions", href: "/campaigns", icon: CreditCard },
  { name: "Feedback", href: "/chat", icon: MessageSquare },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpgradeCard, setShowUpgradeCard] = useState(true);

  const handleUpgradeClick = () => {
    router.push("/#pricing");
  };

  const handleLearnMoreClick = () => {
    router.push("/#pricing");
  };

  return (
    <aside className="flex h-full w-64 flex-col bg-[#1a1a1a] border-r border-[#2a2a2a]">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative w-8 h-8 flex-shrink-0">
            {!logoError ? (
              <Image src="/images/circlelogo.png" alt="Credora" fill className="object-contain" onError={() => setLogoError(true)} priority />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center text-white font-bold text-sm">C</div>
            )}
          </div>
          <span className="text-lg font-bold text-white">Credora</span>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252525] border border-[#333] rounded-lg py-2 pl-9 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-credora-orange/50"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#333] text-gray-400">
            <Command className="h-3 w-3" /><span className="text-[10px]">K</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#252525] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${isActive ? "text-credora-orange" : ""}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isActive ? "bg-credora-orange/20 text-credora-orange" : "bg-[#333] text-gray-400"}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Features</p>
          <div className="space-y-0.5">
            {features.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-[#252525] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${isActive ? "text-credora-orange" : ""}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#333] text-gray-400">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Upgrade Card */}
      {showUpgradeCard && (
        <div className="p-3">
          <div className="relative rounded-2xl overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6d06]/40 via-[#ff5500]/20 to-[#1a1a1a]" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-credora-orange/30 to-transparent rounded-full blur-xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-[#ff3d00]/20 to-transparent rounded-full blur-lg" />
            
            {/* Card content */}
            <div className="relative bg-[#1a1a1a]/80 backdrop-blur-sm border border-credora-orange/30 rounded-2xl p-4">
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-credora-orange to-[#ff3d00] flex items-center justify-center shadow-lg shadow-credora-orange/30">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Upgrade Pro!</h3>
                </div>
                <button 
                  onClick={() => setShowUpgradeCard(false)}
                  className="w-7 h-7 rounded-full border border-gray-600/50 flex items-center justify-center text-gray-500 hover:text-white hover:border-credora-orange/50 hover:bg-credora-orange/10 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              
              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-5 pl-12">
                Upgrade to Pro and elevate your experience today
              </p>
              
              {/* Buttons */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleUpgradeClick}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-credora-orange to-[#ff5500] text-white font-semibold text-sm hover:shadow-xl hover:shadow-credora-orange/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade
                </button>
                <button 
                  onClick={handleLearnMoreClick}
                  className="text-gray-300 font-medium text-sm hover:text-credora-orange transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
