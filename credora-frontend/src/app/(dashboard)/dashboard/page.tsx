"use client";

import { useState, useEffect } from "react";
import { Wallet, PiggyBank, TrendingUp, MoreHorizontal, Plus, ArrowRight, Search, Filter, ChevronDown, RefreshCw, Loader2 } from "lucide-react";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { pythonApi } from "@/lib/api/client";

function useAnimatedCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount((1 - Math.pow(1 - progress, 4)) * end);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return count;
}

// Orange Gradient Balance Card (My Balance)
function MainBalanceCard({ amount, change }: { amount: number; change: string }) {
  const animatedAmount = useAnimatedCounter(amount, 2000);
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#ff6d06] via-[#ff5a00] to-[#e84a00] min-h-[160px]">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 right-1/4 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <MoreHorizontal className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <p className="text-white font-semibold text-base">My balance</p>
        <p className="text-white/60 text-xs mb-3">Wallet Overview & Spending</p>

        <div className="flex items-center gap-2 mb-4">
          <p className="text-[28px] font-bold text-white tracking-tight">
            ${animatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-medium">
            {change} ↑
          </span>
        </div>

        <button className="text-white/90 text-sm font-medium hover:text-white transition-colors">
          See details
        </button>
      </div>
    </div>
  );
}

// Dark Card (Savings & Investment)
function DarkBalanceCard({ title, subtitle, amount, change, icon: Icon, actionText, iconBg }: {
  title: string; subtitle: string; amount: number; change: string; icon: any; actionText: string; iconBg: string
}) {
  const animatedAmount = useAnimatedCounter(amount, 2000);
  return (
    <div className="relative rounded-2xl p-5 bg-[#232323] border border-[#2d2d2d] min-h-[160px]">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white/80" />
        </div>
        <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <MoreHorizontal className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <p className="text-white font-semibold text-base">{title}</p>
      <p className="text-gray-500 text-xs mb-3">{subtitle}</p>

      <div className="flex items-center gap-2 mb-4">
        <p className="text-[28px] font-bold text-white tracking-tight">
          ${animatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <span className="text-emerald-400 text-[11px] font-medium">
          {change} ↑
        </span>
      </div>

      <button className="text-gray-400 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5 group">
        {actionText}
        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

// Wallet Currency Card
function WalletCard({ code, amount, limit, flag, isActive = true }: {
  code: string; amount: string; limit: string; flag: string; isActive?: boolean
}) {
  return (
    <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#282828] hover:border-[#333] transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <span className="text-white font-medium">{code}</span>
        </div>
        <button className="p-1 rounded hover:bg-[#333] transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xl font-bold text-white mb-1">{amount}</p>
      <p className="text-gray-500 text-xs mb-2">{limit}</p>
      <span className={`text-xs font-semibold ${isActive ? "text-credora-orange" : "text-gray-500"}`}>
        {isActive ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

// Cash Flow Bar
function CashFlowBar({ month, value, maxValue, isHighlighted = false, delay = 0 }: {
  month: string; value: number; maxValue: number; isHighlighted?: boolean; delay?: number
}) {
  const [animated, setAnimated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const height = (value / maxValue) * 100;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const showTooltip = isHovered || isHighlighted;

  return (
    <div
      className="flex flex-col items-center gap-2 flex-1 relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-[72px] left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] z-20 whitespace-nowrap shadow-xl">
          <p className="text-gray-400 text-[10px] mb-1">July 23, 2026</p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-400">Cashflow</span>
            <span className="text-white font-semibold">${(value * 750).toLocaleString()}.00</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-400">Inflow</span>
            <span className="text-red-400">-$7,456.00</span>
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#2a2a2a] border-r border-b border-[#3a3a3a] rotate-45" />
        </div>
      )}

      <div className="relative h-36 w-full flex items-end justify-center">
        {/* Glow effect for highlighted */}
        {showTooltip && (
          <div className="absolute bottom-0 w-10 h-full bg-gradient-to-t from-credora-orange/20 to-transparent blur-xl rounded-full" />
        )}

        <div
          className={`relative rounded-t-lg overflow-hidden transition-all duration-700 ease-out ${showTooltip ? "w-9" : "w-7"}`}
          style={{ height: animated ? `${height}%` : '0%' }}
        >
          {/* Bar gradient */}
          <div className={`absolute inset-0 ${showTooltip
              ? "bg-gradient-to-t from-[#ff6d06] via-[#ff5500] to-[#ff3d00]"
              : "bg-gradient-to-t from-[#3a3a3a] to-[#4a4a4a]"
            }`} />

          {/* Top indicator dot */}
          {showTooltip && animated && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-credora-orange border-[3px] border-[#121212] shadow-[0_0_10px_rgba(255,109,6,0.5)]" />
          )}
        </div>
      </div>

      <span className={`text-xs font-medium ${showTooltip ? "text-white" : "text-gray-500"}`}>
        {month}
      </span>
    </div>
  );
}

// Activity Row
function ActivityRow({ icon, activity, orderId, date, time, price, status }: {
  icon: string; activity: string; orderId: string; date: string; time: string; price: string; status: string
}) {
  return (
    <div className="grid grid-cols-6 gap-4 items-center py-3.5 border-b border-[#252525] hover:bg-[#1a1a1a] transition-colors">
      <div className="flex items-center gap-3">
        <input type="checkbox" className="w-4 h-4 rounded border-[#3a3a3a] bg-transparent accent-credora-orange" />
        <div className="w-8 h-8 rounded-lg bg-credora-orange/15 flex items-center justify-center">
          <span className="text-credora-orange text-sm">{icon}</span>
        </div>
        <span className="text-white text-sm">{activity}</span>
      </div>
      <span className="text-gray-400 text-sm">{orderId}</span>
      <span className="text-gray-400 text-sm">{date}</span>
      <span className="text-gray-400 text-sm">{time}</span>
      <span className="text-white text-sm font-medium">{price}</span>
      <span className="text-emerald-400 text-sm font-medium">• {status}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data, refetch } = useDashboard();
  const [timeFilter, setTimeFilter] = useState("Yearly");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await pythonApi.post("/sync/all");
      // Refetch dashboard data after sync
      await refetch();
    } catch (error) {
      console.error("Failed to sync data:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const cashFlowData = [
    { month: "Jan", value: 22 },
    { month: "Feb", value: 28 },
    { month: "Mar", value: 48, isHighlighted: true },
    { month: "Apr", value: 35 },
    { month: "May", value: 40 },
    { month: "Jun", value: 42 },
    { month: "Jul", value: 45 },
  ];
  const maxCashFlow = 50;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here is the summary of overall data</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-gray-300 text-sm font-medium hover:border-[#3a3a3a] transition-colors">
            This Month <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-gray-300 text-sm font-medium hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-credora-orange" />
            ) : (
              <RefreshCw className="h-4 w-4 text-credora-orange" />
            )}
            {isSyncing ? "Syncing..." : "Sync Data"}
          </button>
        </div>
      </div>

      {/* Balance Cards Row */}
      <div className="grid grid-cols-3 gap-4">
        <MainBalanceCard amount={data?.revenue || 28520.30} change="+15%" />
        <DarkBalanceCard
          title="Savings account"
          subtitle="Steady Growth Savings"
          amount={data?.netProfit || 24800.45}
          change="+3.2%"
          icon={PiggyBank}
          actionText="View summary"
          iconBg="bg-[#3a3a3a]"
        />
        <DarkBalanceCard
          title="Investment portfolio"
          subtitle="Track Your Wealth Growth"
          amount={70120.78}
          change="+6.7%"
          icon={TrendingUp}
          actionText="Analyze performance"
          iconBg="bg-[#3a3a3a]"
        />
      </div>

      {/* Wallet & Cash Flow Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* My Wallet */}
        <div className="rounded-2xl bg-[#1e1e1e] border border-[#282828] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-lg">My Wallet</h2>
              <p className="text-gray-500 text-xs mt-0.5">Today 1 USD = 122.20 BDT</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-credora-orange text-white text-sm font-medium hover:bg-[#ff5500] transition-colors">
              <Plus className="h-4 w-4" /> Add New
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <WalletCard code="USD" amount="$24,678.00" limit="Limit is $10k a month" flag="🇺🇸" isActive={true} />
            <WalletCard code="EUR" amount="€28,345.00" limit="Limit is €8k a month" flag="🇪🇺" isActive={true} />
            <WalletCard code="AUD" amount="$20,517.52" limit="Limit is $10k a month" flag="🇦🇺" isActive={true} />
            <WalletCard code="GBP" amount="£25,000.00" limit="Limit is £7.5k a month" flag="🇬🇧" isActive={false} />
          </div>
        </div>

        {/* Cash Flow */}
        <div className="rounded-2xl bg-[#1e1e1e] border border-[#282828] p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-gray-400 text-sm font-medium">Cash Flow</h2>
              <p className="text-3xl font-bold text-white mt-1">$540,323.45</p>
            </div>
            <div className="flex items-center gap-1 bg-[#282828] rounded-full p-1">
              <button
                onClick={() => setTimeFilter("Monthly")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${timeFilter === "Monthly"
                    ? "bg-[#1e1e1e] text-white"
                    : "text-gray-400 hover:text-white"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeFilter("Yearly")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${timeFilter === "Yearly"
                    ? "bg-credora-orange text-white"
                    : "text-gray-400 hover:text-white"
                  }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="flex mt-6">
            <div className="flex flex-col justify-between h-36 pr-3 text-right">
              {['50k', '40k', '30k', '20k', '10k', '0k'].map(label => (
                <span key={label} className="text-gray-500 text-[11px]">{label}</span>
              ))}
            </div>
            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-t border-[#282828] w-full" />
                ))}
              </div>
              {/* Bars */}
              <div className="relative flex justify-between h-36 items-end px-1">
                {cashFlowData.map((item, i) => (
                  <CashFlowBar
                    key={item.month}
                    month={item.month}
                    value={item.value}
                    maxValue={maxCashFlow}
                    isHighlighted={item.isHighlighted}
                    delay={i * 100}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="rounded-2xl bg-[#1e1e1e] border border-[#282828] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Recent Activities</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search"
                className="w-44 bg-[#282828] border border-[#333] rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-credora-orange/50 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#282828] border border-[#333] text-gray-400 text-sm font-medium hover:border-[#444] transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 py-3 border-b border-[#282828]">
          {['Activity', 'Order ID', 'Date', 'Time', 'Price', 'Status'].map(header => (
            <span key={header} className="text-gray-500 text-xs font-medium uppercase tracking-wide">{header}</span>
          ))}
        </div>

        {/* Table Rows */}
        <ActivityRow icon="◎" activity="Software License" orderId="INV_000076" date="17 Apr, 2026" time="03:45 PM" price="$25,500" status="Completed" />
        <ActivityRow icon="✈" activity="Flight Ticket" orderId="INV_000075" date="16 Apr, 2026" time="11:20 AM" price="$1,250" status="Completed" />
      </div>
    </div>
  );
}
