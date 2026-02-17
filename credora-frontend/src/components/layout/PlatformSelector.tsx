"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { usePlatform, type Platform } from "@/lib/hooks/usePlatform";

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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all duration-200 text-sm"
            >
                <span className="text-base leading-none">{platformInfo.icon}</span>
                <span className="text-white font-medium">{platformInfo.name}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5">
                        <div className="px-3 py-2 mb-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                Select Platform
                            </p>
                        </div>
                        {platforms.map((p) => {
                            const isSelected = p.id === platform;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${isSelected
                                            ? "bg-credora-orange/10 border border-credora-orange/20"
                                            : "hover:bg-[#252525] border border-transparent"
                                        }`}
                                >
                                    <span className="text-lg leading-none">{p.icon}</span>
                                    <div className="flex-1 text-left">
                                        <p
                                            className={`text-sm font-medium ${isSelected ? "text-credora-orange" : "text-white"
                                                }`}
                                        >
                                            {p.name}
                                        </p>
                                        <p className="text-[11px] text-gray-500">{p.description}</p>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-credora-orange shrink-0" />
                                    )}
                                    {!isSelected && (
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0 opacity-60"
                                            style={{ backgroundColor: p.color }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
