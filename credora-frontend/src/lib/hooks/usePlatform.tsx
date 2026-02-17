"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Platform types
export type Platform = "shopify" | "meta" | "google";

export interface PlatformInfo {
    id: Platform;
    name: string;
    icon: string;
    color: string;
    description: string;
}

export const PLATFORMS: PlatformInfo[] = [
    {
        id: "shopify",
        name: "Shopify",
        icon: "🛍️",
        color: "#96BF48",
        description: "E-commerce store data",
    },
    {
        id: "meta",
        name: "Meta Ads",
        icon: "📱",
        color: "#1877F2",
        description: "Ad campaigns & performance",
    },
    {
        id: "google",
        name: "Google Ads",
        icon: "📊",
        color: "#4285F4",
        description: "Search & display campaigns",
    },
];

const STORAGE_KEY = "credora-selected-platform";

interface PlatformContextValue {
    platform: Platform;
    platformInfo: PlatformInfo;
    setPlatform: (p: Platform) => void;
    platforms: PlatformInfo[];
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

function getStoredPlatform(): Platform {
    if (typeof window === "undefined") return "shopify";
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ["shopify", "meta", "google"].includes(stored)) {
            return stored as Platform;
        }
    } catch { }
    return "shopify";
}

export function PlatformProvider({ children }: { children: ReactNode }) {
    const [platform, setPlatformState] = useState<Platform>("shopify");
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();

    // Load from localStorage on mount
    useEffect(() => {
        setPlatformState(getStoredPlatform());
        setMounted(true);
    }, []);

    const setPlatform = useCallback(
        (p: Platform) => {
            setPlatformState(p);
            try {
                localStorage.setItem(STORAGE_KEY, p);
            } catch { }
            // Invalidate all platform-dependent queries so they refetch with the new platform
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["pnl"] });
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            queryClient.invalidateQueries({ queryKey: ["sku-analysis"] });
            queryClient.invalidateQueries({ queryKey: ["forecast"] });
            queryClient.invalidateQueries({ queryKey: ["insights"] });
        },
        [queryClient]
    );

    const platformInfo = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];

    // Prevent hydration mismatch - render with default until mounted
    const value: PlatformContextValue = {
        platform: mounted ? platform : "shopify",
        platformInfo: mounted ? platformInfo : PLATFORMS[0],
        setPlatform,
        platforms: PLATFORMS,
    };

    return (
        <PlatformContext.Provider value= { value } >
        { children }
        </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
    const ctx = useContext(PlatformContext);
    if (!ctx) {
        throw new Error("usePlatform must be used within a PlatformProvider");
    }
    return ctx;
}
