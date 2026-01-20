"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SkipForward, AlertCircle, X, Store } from "lucide-react";
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

export default function OnboardingPage() {
  const router = useRouter();
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformType | null>(null);

  // Shopify modal state
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [shopDomainError, setShopDomainError] = useState("");

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="text-xl font-semibold">Credora</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Connect your platforms</span>
              <span className="text-muted-foreground">
                {connectedCount} of {PLATFORMS.length} connected
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${(connectedCount / PLATFORMS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Connect your data sources</h1>
            <p className="mt-2 text-muted-foreground">
              Connect your e-commerce platforms to get the most out of Credora.
              You can skip this step and connect later from Settings.
            </p>
          </div>

          {/* Platform Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform.type}
                  platform={platform.type}
                  name={platform.name}
                  description={platform.description}
                  status={getStatusForPlatform(platform.type)}
                  isConnecting={connectingPlatform === platform.type}
                  onConnect={() => handleConnect(platform.type)}
                  isRequired={false}
                />
              ))}
            </div>
          )}

          {/* Info Banner */}
          {connectedCount === 0 && (
            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">No platforms connected</p>
                <p className="text-sm text-amber-700 mt-1">
                  Without connected platforms, your dashboard will show placeholder data.
                  Connect at least one platform to see your real business metrics.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            {connectedCount > 0 ? (
              <button
                onClick={handleContinue}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continue to Dashboard
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Skip for now
                <SkipForward className="h-5 w-5" />
              </button>
            )}

            {connectedCount > 0 && connectedCount < PLATFORMS.length && (
              <button
                onClick={handleSkip}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-muted-foreground/30 px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Skip remaining platforms
                <SkipForward className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            You can always connect more platforms later from Settings
          </p>
        </div>
      </main>

      {/* Shopify Store Domain Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Store className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Connect Shopify Store</h2>
              </div>
              <button
                onClick={() => setShowShopifyModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Enter your Shopify store URL to connect your store data.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="your-store"
                    className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm flex items-center">
                    .myshopify.com
                  </span>
                </div>
                {shopDomainError && (
                  <p className="mt-1 text-sm text-red-500">{shopDomainError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Example: my-awesome-store or my-awesome-store.myshopify.com
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowShopifyModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShopifyConnect}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Connect Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
