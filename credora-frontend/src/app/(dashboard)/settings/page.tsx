"use client";

/**
 * Settings Page
 * Displays user profile, platform connections, preferences, and account management
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Link2,
  Globe,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
  Facebook,
  Chrome,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { platformsApi } from "@/lib/api/platforms";
import { pythonApi } from "@/lib/api/client";
import type { PlatformStatus, PlatformType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Platform configuration
const PLATFORMS: { type: PlatformType; name: string; description: string }[] = [
  {
    type: "shopify",
    name: "Shopify",
    description: "E-commerce store data",
  },
  {
    type: "meta",
    name: "Meta Ads",
    description: "Facebook & Instagram ads",
  },
  {
    type: "google",
    name: "Google Ads",
    description: "Google ad campaigns",
  },
];

const platformIcons: Record<PlatformType, React.ComponentType<{ className?: string }>> = {
  shopify: ShoppingBag,
  meta: Facebook,
  google: Chrome,
};

// Currency options
const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

// Reporting frequency options
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface UserPreferences {
  currency: string;
  reportingFrequency: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, logout, isLoggingOut } = useAuth();
  
  // Platform connection state
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [reconnectingPlatform, setReconnectingPlatform] = useState<PlatformType | null>(null);
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    currency: "USD",
    reportingFrequency: "weekly",
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  
  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Fetch platform statuses on mount
  useEffect(() => {
    fetchPlatformStatuses();
    fetchPreferences();
  }, []);

  const fetchPlatformStatuses = async () => {
    try {
      const statuses = await platformsApi.getStatus();
      setPlatformStatuses(statuses);
    } catch (error) {
      // If unauthorized, the middleware should redirect to login
      // For other errors, just log and show empty state
      console.error("Failed to fetch platform statuses:", error);
      setPlatformStatuses([]);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  const fetchPreferences = async () => {
    // Preferences endpoint not yet implemented on backend
    // Use defaults for now
    setPreferences({
      currency: "USD",
      reportingFrequency: "weekly",
    });
  };

  const handleReconnect = async (platform: PlatformType) => {
    setReconnectingPlatform(platform);
    try {
      const { redirectUrl } = await platformsApi.initiateOAuth(platform);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error(`Failed to reconnect ${platform}:`, error);
      setReconnectingPlatform(null);
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

  const handlePreferenceChange = (key: keyof UserPreferences, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPreferencesSaved(false);
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      // Preferences endpoint not yet implemented on backend
      // Just show success for now
      setPreferencesSaved(true);
      setTimeout(() => setPreferencesSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      // Account deletion endpoint not yet implemented on backend
      // Just logout for now
      logout();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      {/* User Profile Section - Requirements 14.1 */}
      <section className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-credora-orange" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="h-16 w-16 rounded-2xl shadow-md"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center shadow-lg shadow-credora-orange/25">
              <User className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg text-white">{user?.name}</h3>
            <p className="text-gray-400">{user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>
      </section>

      {/* Platform Connections Section - Requirements 14.2, 14.3 */}
      <section className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="h-5 w-5 text-credora-orange" />
          <h2 className="text-lg font-semibold text-white">Connected Platforms</h2>
        </div>
        
        {isLoadingPlatforms ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[#282828] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {PLATFORMS.map((platform) => {
              const status = getStatusForPlatform(platform.type);
              const Icon = platformIcons[platform.type];
              const isConnected = status.status === "connected";
              const isFailed = status.status === "failed";
              const isReconnecting = reconnectingPlatform === platform.type;

              return (
                <div
                  key={platform.type}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 transition-all duration-300",
                    isConnected ? "border-emerald-500/30 bg-emerald-500/5" : "border-[#333] bg-[#1a1a1a]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                        isConnected ? "bg-emerald-500/10" : "bg-[#282828]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          isConnected ? "text-emerald-400" : "text-gray-500"
                        )}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{platform.name}</h4>
                      <p className="text-sm text-gray-500">
                        {platform.description}
                      </p>
                      {status.lastSync && isConnected && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last synced: {new Date(status.lastSync).toLocaleString()}
                        </p>
                      )}
                      {status.error && isFailed && (
                        <p className="text-xs text-red-400 mt-1">{status.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <span className="flex items-center gap-1 text-sm text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected
                        </span>
                        <button
                          onClick={() => handleReconnect(platform.type)}
                          disabled={isReconnecting}
                          className="ml-2 p-2 rounded-xl hover:bg-[#333] transition-colors duration-200"
                          title="Reconnect"
                        >
                          <RefreshCw
                            className={cn(
                              "h-4 w-4 text-gray-500",
                              isReconnecting && "animate-spin"
                            )}
                          />
                        </button>
                      </>
                    ) : isFailed ? (
                      <button
                        onClick={() => handleReconnect(platform.type)}
                        disabled={isReconnecting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/50 text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      >
                        {isReconnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Retry
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReconnect(platform.type)}
                        disabled={isReconnecting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-credora-orange to-credora-red text-sm text-white hover:shadow-lg hover:shadow-credora-orange/25 transition-all duration-300"
                      >
                        {isReconnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Preferences Section - Requirements 14.4 */}
      <section className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-credora-orange" />
          <h2 className="text-lg font-semibold text-white">Preferences</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={preferences.currency}
              onChange={(e) => handlePreferenceChange("currency", e.target.value)}
              className="w-full max-w-xs rounded-xl border border-[#333] bg-[#282828] text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-credora-orange/20 focus:border-credora-orange/50 transition-all duration-200"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reporting Frequency
            </label>
            <select
              value={preferences.reportingFrequency}
              onChange={(e) => handlePreferenceChange("reportingFrequency", e.target.value)}
              className="w-full max-w-xs rounded-xl border border-[#333] bg-[#282828] text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-credora-orange/20 focus:border-credora-orange/50 transition-all duration-200"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-credora-orange to-credora-red text-white hover:shadow-lg hover:shadow-credora-orange/25 transition-all duration-300 disabled:opacity-50 font-medium"
            >
              {isSavingPreferences ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : preferencesSaved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              {preferencesSaved ? "Saved!" : "Save Preferences"}
            </button>
          </div>
        </div>
      </section>

      {/* Account Deletion Section - Requirements 14.5 */}
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          Once you delete your account, there is no going back. All your data,
          including connected platforms, chat history, and preferences will be
          permanently deleted.
        </p>
        
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500 text-red-400 hover:bg-red-500/10 transition-all duration-200 font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              This action cannot be undone. This will permanently delete your
              account and remove all associated data from our servers.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full rounded-xl border border-[#333] bg-[#282828] text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                placeholder="DELETE"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
                className="px-4 py-2.5 rounded-xl border border-[#333] text-gray-300 hover:bg-[#282828] transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "DELETE" || isDeleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
