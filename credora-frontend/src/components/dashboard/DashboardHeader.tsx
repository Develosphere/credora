"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, User, Settings, ChevronLeft, ChevronRight, HelpCircle, Mail, Share2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggingOut, isLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Not signed in";
  const getPageName = () => { const path = pathname.split('/').pop() || 'dashboard'; return path.charAt(0).toUpperCase() + path.slice(1); };

  return (
    <header className="flex h-12 items-center justify-between px-4 bg-[#121212] border-b border-[#2a2a2a]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="p-1 rounded bg-[#252525] text-gray-400 hover:text-white transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button className="p-1 rounded bg-[#252525] text-gray-400 hover:text-white transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Credora</span>
          <span className="text-gray-600">›</span>
          <span className="text-white font-medium">{getPageName()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-full border border-[#333] flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="w-8 h-8 rounded-full border border-[#333] flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
          <Mail className="h-4 w-4" />
        </button>
        <button className="relative w-8 h-8 rounded-full border border-[#333] flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-credora-orange rounded-full" />
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-8 h-8 rounded-full overflow-hidden border-2 border-credora-orange/50 hover:border-credora-orange transition-colors" disabled={isLoading}>
            {user?.picture ? <img src={user.picture} alt={displayName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center text-white text-xs font-bold">{displayName[0]}</div>}
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#1a1a1a] border border-[#333] shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[#333]">
                <div className="flex items-center gap-3">
                  {user?.picture ? <img src={user.picture} alt={displayName} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-credora-orange to-credora-red flex items-center justify-center text-white font-bold">{displayName[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{displayName}</p>
                    <p className="text-gray-400 text-xs truncate">{displayEmail}</p>
                  </div>
                </div>
              </div>
              <div className="p-1">
                <button onClick={() => { setShowProfileMenu(false); router.push("/settings"); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#252525] rounded-lg transition-colors">
                  <Settings className="h-4 w-4 text-gray-400" /> Settings
                </button>
                <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <LogOut className="h-4 w-4" /> {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-credora-orange text-white text-sm font-medium hover:bg-credora-red transition-colors">
          Share <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
