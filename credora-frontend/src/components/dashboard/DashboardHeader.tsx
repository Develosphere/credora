"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User, Settings, ChevronLeft, ChevronRight, Share2, Search, Calendar, Bell } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { PlatformSelector } from "@/components/layout/PlatformSelector";

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggingOut, isLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { }
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Not signed in";
  
  // Get current date
  const getCurrentDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <header className="flex h-16 items-center justify-between px-6 bg-[#1a1a1a]">
      {/* Left Section - Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-[#252525] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-credora-orange/30 transition-all border-0"
          />
        </div>
      </div>

      {/* Right Section - Date, Platform, Notifications, Profile, Share */}
      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span>{getCurrentDate()}</span>
        </div>

        {/* Calendar Icon */}
        <button className="p-2 rounded-lg bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors">
          <Calendar className="h-5 w-5" />
        </button>

        {/* Platform Selector */}
        <PlatformSelector />

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-[#252525] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Bell className="h-5 w-5" />
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-[#1a1a1a] border border-[#333] shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-[#333]">
                <h3 className="text-white font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 hover:bg-[#252525] transition-colors cursor-pointer border-b border-[#252525]">
                  <p className="text-white text-sm mb-1">New data sync completed</p>
                  <p className="text-gray-500 text-xs">2 minutes ago</p>
                </div>
                <div className="p-4 hover:bg-[#252525] transition-colors cursor-pointer border-b border-[#252525]">
                  <p className="text-white text-sm mb-1">Campaign performance updated</p>
                  <p className="text-gray-500 text-xs">1 hour ago</p>
                </div>
                <div className="p-4 hover:bg-[#252525] transition-colors cursor-pointer">
                  <p className="text-white text-sm mb-1">Monthly report is ready</p>
                  <p className="text-gray-500 text-xs">3 hours ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#333] hover:border-credora-orange transition-colors" 
            disabled={isLoading}
          >
            {user?.picture ? (
              <img src={user.picture} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center text-white text-sm font-bold">
                {displayName[0]}
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#1a1a1a] border border-[#333] shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-[#333]">
                <div className="flex items-center gap-3">
                  {user?.picture ? (
                    <img src={user.picture} alt={displayName} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center text-white font-bold">
                      {displayName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{displayName}</p>
                    <p className="text-gray-400 text-xs truncate">{displayEmail}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => { setShowProfileMenu(false); router.push("/settings"); }} 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#252525] rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-400" /> Settings
                </button>
                <button 
                  onClick={handleLogout} 
                  disabled={isLoggingOut} 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" /> {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff6d06] to-[#ff5500] text-white text-sm font-medium hover:shadow-lg hover:shadow-credora-orange/30 transition-all">
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </header>
  );
}
