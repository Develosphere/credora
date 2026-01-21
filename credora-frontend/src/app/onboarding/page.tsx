"use client";

/**
 * Premium Onboarding Page
 * Modern design with animated background matching landing page theme
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, SkipForward, AlertCircle, X, Store, Sparkles, CheckCircle2 } from "lucide-react";
import { PlatformCard } from "@/components/onboarding/PlatformCard";
import { platformsApi } from "@/lib/api/platforms";
import { pythonApi } from "@/lib/api/client";
import type { PlatformStatus, PlatformType } from "@/lib/api/types";

const PLATFORMS: { type: PlatformType; name: string; description: string }[] = [
  {
    type: "shopify",
    name: "Shopify",
    description: "Connect your store to import orders, products, and revenue data.",
  },
  {
    type: "meta",
    name: "Meta Ads",
    description: "Connect to import Facebook and Instagram ad performance.",
  },
  {
    type: "google",
    name: "Google Ads",
    description: "Connect to import Google ad campaigns and conversions.",
  },
];

const ONBOARDING_STEPS = [
  { title: "Connect Platforms", description: "Link your data sources" },
  { title: "Sync Data", description: "Import your business metrics" },
  { title: "Get Insights", description: "Start making data-driven decisions" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformType | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Shopify modal state
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [shopDomainError, setShopDomainError] = useState("");

  // Fade in animation
  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  // Fetch platform statuses on mount
  useEffect(() => {
    fetchPlatformStatuses();
  }, []);

  const fetchPlatformStatuses = async () => {
    try {
      const statuses = await platformsApi.getStatus();
      setPlatformStatuses(statuses);
    } catch (error) {
      console.error("Failed to fetch platform statuses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (platform: PlatformType) => {
    // For Shopify, show modal to get store domain
    if (platform === "shopify") {
      setShowShopifyModal(true);
      setShopDomain("");
      setShopDomainError("");
      return;
    }

    // For other platforms, proceed directly
    setConnectingPlatform(platform);
    try {
      const { redirectUrl } = await platformsApi.initiateOAuth(platform);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error);
      setConnectingPlatform(null);
    }
  };

  const handleShopifyConnect = async () => {
    // Validate shop domain
    let domain = shopDomain.trim().toLowerCase();

    // Remove https:// or http:// if present
    domain = domain.replace(/^https?:\/\//, "");

    // Remove trailing slash
    domain = domain.replace(/\/$/, "");

    // Add .myshopify.com if not present
    if (!domain.includes(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }

    // Validate format
    const shopifyDomainRegex = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
    if (!shopifyDomainRegex.test(domain)) {
      setShopDomainError("Please enter a valid Shopify store URL (e.g., your-store.myshopify.com)");
      return;
    }

    setShopDomainError("");
    setShowShopifyModal(false);
    setConnectingPlatform("shopify");

    try {
      const { redirectUrl } = await platformsApi.initiateOAuth("shopify", domain);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Failed to connect Shopify:", error);
      setConnectingPlatform(null);
    }
  };

  const getStatusForPlatform = (platform: PlatformType): PlatformStatus => {
    return (
      platformStatuses.find((s) => s.platform === platform) || {
        platform,
        status: "not_connected",
      }
    );
  };

  // Count connected platforms
  const connectedCount = platformStatuses.filter(
    (s) => s.status === "connected"
  ).length;

  const handleContinue = async () => {
    // Mark onboarding as complete
    try {
      await pythonApi.post("/user/onboarding-complete");
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error);
    }
    router.push("/dashboard");
  };

  const handleSkip = async () => {
    // Mark onboarding as complete even without connections
    try {
      await pythonApi.post("/user/onboarding-complete");
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error);
    }
    router.push("/dashboard");
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,109,6,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,109,6,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="container mx-auto flex h-20 items-center px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/images/circlelogo.png"
                alt="Credora"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Credora
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Welcome to Credora</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Let&apos;s get you
              <span className="bg-gradient-to-r from-primary via-orange-400 to-secondary bg-clip-text text-transparent"> set up</span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Connect your platforms to unlock AI-powered insights and start making data-driven decisions
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {ONBOARDING_STEPS.map((step, index) => (
                <div key={step.title} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      index === 0
                        ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30"
                        : "bg-white/5 border border-white/10 text-gray-500"
                    }`}>
                      {index === 0 ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <p className="text-xs mt-2 text-center font-medium">{step.title}</p>
                    <p className="text-[10px] text-gray-500 text-center">{step.description}</p>
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-2 ${index === 0 ? "bg-gradient-to-r from-primary/50 to-white/10" : "bg-white/10"}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="font-medium text-gray-300">Platform Connections</span>
              <span className="text-gray-400">
                {connectedCount} of {PLATFORMS.length} connected
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-lg shadow-primary/30"
                style={{
                  width: `${(connectedCount / PLATFORMS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Platform Cards */}
          {isLoading ? (
            <div className="space-y-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {PLATFORMS.map((platform, index) => (
                <div
                  key={platform.type}
                  className="transition-all duration-300"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <PlatformCard
                    platform={platform.type}
                    name={platform.name}
                    description={platform.description}
                    status={getStatusForPlatform(platform.type)}
                    isConnecting={connectingPlatform === platform.type}
                    onConnect={() => handleConnect(platform.type)}
                    isRequired={false}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Info Banner */}
          {connectedCount === 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-sm text-amber-200 font-semibold mb-1">No platforms connected yet</p>
                  <p className="text-sm text-amber-300/80">
                    Connect at least one platform to see your real business metrics. Without connections, your dashboard will show demo data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {connectedCount > 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-sm text-emerald-200 font-semibold mb-1">Great! You&apos;re all set</p>
                  <p className="text-sm text-emerald-300/80">
                    {connectedCount === PLATFORMS.length
                      ? "All platforms connected. Your data will start syncing shortly."
                      : `${connectedCount} platform${connectedCount > 1 ? 's' : ''} connected. You can add more later from Settings.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {connectedCount > 0 ? (
              <button
                onClick={handleContinue}
                className="group relative w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-8 py-4 text-lg font-semibold text-white overflow-hidden hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <span className="relative z-10">Continue to Dashboard</span>
                <ArrowRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                {/* Animated shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="group relative w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-8 py-4 text-lg font-semibold text-white overflow-hidden hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <span className="relative z-10">Skip for now</span>
                <SkipForward className="h-5 w-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            )}

            {connectedCount > 0 && connectedCount < PLATFORMS.length && (
              <button
                onClick={handleSkip}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-white/10 px-8 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:border-white/20 transition-all duration-300"
              >
                Skip remaining platforms
                <SkipForward className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            You can always connect more platforms later from Settings
          </p>
        </div>
      </main>

      {/* Shopify Store Domain Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-50"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Store className="h-6 w-6 text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Connect Shopify Store</h2>
                </div>
                <button
                  onClick={() => setShowShopifyModal(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <p className="text-gray-400 mb-6">
                Enter your Shopify store URL to connect your store data and start syncing.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Store URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-l-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <span className="px-4 py-3 bg-white/5 border border-l-0 border-white/10 rounded-r-xl text-gray-400 text-sm flex items-center">
                      .myshopify.com
                    </span>
                  </div>
                  {shopDomainError && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {shopDomainError}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Example: my-awesome-store or my-awesome-store.myshopify.com
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowShopifyModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-white/10 rounded-xl text-gray-300 hover:bg-white/5 hover:border-white/20 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShopifyConnect}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold"
                  >
                    Connect Store
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
