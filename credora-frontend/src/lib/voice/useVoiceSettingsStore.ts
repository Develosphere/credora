/**
 * Voice-Controlled CFO - Voice Settings Store
 * 
 * Zustand store for managing voice settings with localStorage persistence.
 * Validates: Requirements US-5.1, US-5.2, US-5.3, US-5.4, US-5.5
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VoiceSettings } from './types';

/**
 * Default voice settings
 */
const DEFAULT_SETTINGS = {
  // Input settings
  voiceInputEnabled: true,
  language: 'en-US',
  
  // Output settings
  voiceOutputEnabled: true,
  autoPlayResponses: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  selectedVoiceURI: null,
};

console.log('[VoiceSettings] Default settings:', DEFAULT_SETTINGS);

/**
 * Voice settings store with persistence
 * 
 * Features:
 * - Persistent storage in localStorage
 * - Type-safe settings management
 * - Reset to defaults functionality
 * - Automatic hydration on mount
 * 
 * @example
 * const { voiceInputEnabled, setVoiceInputEnabled } = useVoiceSettingsStore();
 * 
 * // Toggle voice input
 * setVoiceInputEnabled(!voiceInputEnabled);
 */
export const useVoiceSettingsStore = create<VoiceSettings>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_SETTINGS,
      
      // Actions
      setVoiceInputEnabled: (enabled: boolean) =>
        set({ voiceInputEnabled: enabled }),
      
      setVoiceOutputEnabled: (enabled: boolean) =>
        set({ voiceOutputEnabled: enabled }),
      
      setAutoPlayResponses: (enabled: boolean) =>
        set({ autoPlayResponses: enabled }),
      
      setSpeechRate: (rate: number) =>
        set({ speechRate: Math.max(0.5, Math.min(2.0, rate)) }),
      
      setSpeechPitch: (pitch: number) =>
        set({ speechPitch: Math.max(0, Math.min(2, pitch)) }),
      
      setSpeechVolume: (volume: number) =>
        set({ speechVolume: Math.max(0, Math.min(1, volume)) }),
      
      setSelectedVoice: (voiceURI: string) =>
        set({ selectedVoiceURI: voiceURI }),
      
      reset: () =>
        set(DEFAULT_SETTINGS),
    }),
    {
      name: 'credora-voice-settings', // localStorage key
      version: 1, // Version for migration support
    }
  )
);

/**
 * Hook to get the selected voice object from available voices
 * 
 * @param availableVoices - Array of available voices from speechSynthesis
 * @returns Selected voice or null
 */
export function useSelectedVoice(
  availableVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const selectedVoiceURI = useVoiceSettingsStore((state) => state.selectedVoiceURI);
  
  if (!selectedVoiceURI || availableVoices.length === 0) {
    return null;
  }
  
  return availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI) || null;
}
