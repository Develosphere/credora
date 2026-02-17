"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { usePlatform, type Platform } from "@/lib/hooks/usePlatform";

// Platform logo components
const ShopifyLogo = () => (
    <div className="w-8 h-8 rounded-lg bg-[#96BF48] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M15.337 2.543c-.034-.038-.076-.064-.12-.076-.044-.012-1.432-.208-1.432-.208s-.95-.922-1.055-1.025c-.105-.103-.312-.073-.392-.05 0 0-.062.02-.165.053-.013-.042-.03-.09-.05-.144-.19-.58-.47-.886-.832-.886-.024 0-.05.002-.076.006-.008-.01-.016-.02-.025-.028-.21-.22-.475-.326-.788-.316-.612.02-1.224.46-1.724 1.238-.35.546-.616 1.232-.708 1.832-.65.2-1.106.342-1.15.356-.338.106-.35.116-.394.432-.033.24-1.02 7.88-1.02 7.88L12.582 23l7.36-1.634S15.395 2.63 15.337 2.543zm-2.832.65c-.226.07-.474.148-.738.232-.002-.27-.02-.65-.098-1.002.44.084.686.47.836.77zm-1.197.374c-.476.148-1 .31-1.528.474.15-.57.434-1.134.776-1.51.128-.14.298-.296.51-.412.226.446.254 1.002.242 1.448zm-.832-2.092c.124 0 .234.028.332.082-.184.124-.368.296-.53.488-.42.5-.74 1.24-.86 1.964-.41.127-.814.252-1.2.372.21-.96.98-2.83 2.258-2.906z"/>
        </svg>
    </div>
);

const MetaLogo = () => (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0081FB] via-[#0095F6] to-[#00C6FF] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
        </svg>
    </div>
);

const GoogleAdsLogo = () => (
    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    </div>
);

export function PlatformSelector() {
    const { platform, platformInfo, setPlatform, platforms } = usePlatform();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: Platform) => {
        setPlatform(id);
        setIsOpen(false);
    };

    const getPlatformLogo = (platformId: Platform) => {
        switch (platformId) {
            case "shopify":
                return <ShopifyLogo />;
            case "meta":
                return <MetaLogo />;
            case "google":
                return <GoogleAdsLogo />;
            default:
                return <ShopifyLogo />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#252525] hover:bg-[#2a2a2a] transition-all duration-200 group"
            >
                {getPlatformLogo(platform)}
                <span className="text-white font-medium text-sm">{platformInfo.name}</span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#1a1a1a] shadow-2xl z-50 overflow-hidden border border-[#2a2a2a]">
                    {/* Header */}
                    <div className="px-5 py-4 bg-gradient-to-r from-[#252525] to-[#1f1f1f]">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Select Platform
                        </p>
                    </div>

                    {/* Platform Options */}
                    <div className="p-3 space-y-2">
                        {platforms.map((p) => {
                            const isSelected = p.id === platform;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p.id)}
                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                                        isSelected
                                            ? "bg-gradient-to-r from-[#ff6d06]/10 to-[#ff5500]/5"
                                            : "hover:bg-[#252525]"
                                    }`}
                                >
                                    {/* Subtle gradient overlay on hover */}
                                    {!isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                                    )}

                                    {/* Platform Logo */}
                                    <div className="relative z-10">
                                        {getPlatformLogo(p.id)}
                                    </div>

                                    {/* Platform Info */}
                                    <div className="flex-1 text-left relative z-10">
                                        <p className={`text-sm font-semibold mb-0.5 ${
                                            isSelected ? "text-white" : "text-gray-200 group-hover:text-white"
                                        }`}>
                                            {p.name}
                                        </p>
                                        <p className="text-xs text-gray-500 group-hover:text-gray-400">
                                            {p.description}
                                        </p>
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className="relative z-10">
                                        {isSelected ? (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff6d06] to-[#ff5500] flex items-center justify-center shadow-lg shadow-credora-orange/30">
                                                <Check className="h-3.5 w-3.5 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-[#333] group-hover:border-[#444] transition-colors" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer hint */}
                    <div className="px-5 py-3 bg-[#151515] border-t border-[#252525]">
                        <p className="text-xs text-gray-600 text-center">
                            Switch between platforms to view different data sources
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
