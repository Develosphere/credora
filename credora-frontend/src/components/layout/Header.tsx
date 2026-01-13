"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, Moon, Sun, User, Settings, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/lib/hooks/useAuth";

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
      // Call Next.js API route to clear cookies server-side
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue even if API call fails
    }
    
    // Clear client-side cookies as backup
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Force full page reload to landing page
    window.location.href = "/";
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    router.push("/settings");
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get display name and email
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Not signed in";
  const displayId = user?.id || user?.email || "N/A";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Credora</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User Menu with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
            disabled={isLoading}
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-card shadow-lg z-50">
              {/* User Info Section */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={displayName}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                </div>
                <div className="mt-3 p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono truncate">{displayId}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={handleSettings}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
