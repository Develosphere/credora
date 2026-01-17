"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, Moon, Sun, User, Settings, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout, isLoggingOut, isLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue even if API call fails
    }
    
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    window.location.href = "/";
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    router.push("/settings");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Not signed in";
  const displayId = user?.id || user?.email || "N/A";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-xl px-6 sticky top-0 z-40">
      {/* Left side - Breadcrumb/Title area */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-light to-secondary-light">
          <Sparkles className="h-4 w-4 text-credora-orange" />
          <span className="text-sm font-medium text-credora-orange">AI-Powered CFO</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            "text-gray-500 hover:text-credora-orange hover:bg-primary-light",
            "transition-all duration-200"
          )}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Notifications */}
        <button
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl relative",
            "text-gray-500 hover:text-credora-orange hover:bg-primary-light",
            "transition-all duration-200"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-credora-red animate-pulse" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 mx-2" />

        {/* User Menu with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              "hover:bg-primary-light transition-all duration-200",
              showProfileMenu && "bg-primary-light"
            )}
            disabled={isLoading}
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="h-8 w-8 rounded-full ring-2 ring-credora-orange/20"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-credora-orange to-credora-red text-white">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">Pro Plan</p>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-400 transition-transform duration-200",
              showProfileMenu && "rotate-180"
            )} />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-gray-100 bg-white shadow-card-hover z-50 animate-scale-in overflow-hidden">
              {/* User Info Section */}
              <div className="p-4 bg-gradient-to-br from-primary-light to-secondary-light">
                <div className="flex items-center gap-3">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={displayName}
                      className="h-12 w-12 rounded-full ring-2 ring-white"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-credora-orange to-credora-red text-white">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-sm text-gray-600 truncate">{displayEmail}</p>
                  </div>
                </div>
                <div className="mt-3 p-2 rounded-lg bg-white/60 backdrop-blur-sm">
                  <p className="text-xs text-gray-500">User ID</p>
                  <p className="text-sm font-mono text-gray-700 truncate">{displayId}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={handleSettings}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-primary-light hover:text-credora-orange transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
