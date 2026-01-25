/**
 * Voice-Controlled CFO - Voice Settings Panel Component
 * 
 * Settings panel for configuring voice input and output preferences.
 * Validates: Requirements US-2.2, US-5.1, US-5.2, US-5.3, US-5.4
 */

'use client';

import { useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVoiceSettingsStore, useVoiceOutput } from '@/lib/voice';
import type { VoiceSettingsPanelProps } from '@/lib/voice/types';

/**
 * Voice settings panel with all configuration options
 * 
 * Features:
 * - Toggle voice input/output
 * - Adjust speech rate, pitch, and volume
 * - Select voice
 * - Test voice preview
 * - Reset to defaults
 * 
 * @param props - Component props
 */
export function VoiceSettingsPanel({ isOpen, onClose }: VoiceSettingsPanelProps) {
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Voice settings
  const {
    voiceInputEnabled,
    voiceOutputEnabled,
    autoPlayResponses,
    speechRate,
    speechPitch,
    speechVolume,
    selectedVoiceURI,
    setVoiceInputEnabled,
    setVoiceOutputEnabled,
    setAutoPlayResponses,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSelectedVoice,
    reset,
  } = useVoiceSettingsStore();

  // Get voice output hook for testing (without voice initially)
  const { availableVoices, speak, stop } = useVoiceOutput({
    rate: speechRate,
    pitch: speechPitch,
    volume: speechVolume,
    onEnd: () => setIsTestingVoice(false),
  });
  
  // Get selected voice from available voices
  const selectedVoice = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);

  /**
   * Test voice with current settings
   */
  const handleTestVoice = () => {
    if (isTestingVoice) {
      stop();
      setIsTestingVoice(false);
    } else {
      setIsTestingVoice(true);
      speak('Hello! This is a test of your voice settings.');
    }
  };

  /**
   * Reset all settings to defaults
   */
  const handleReset = () => {
    reset();
    stop();
    setIsTestingVoice(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md border-l bg-background shadow-lg animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="voice-settings-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 id="voice-settings-title" className="text-lg font-semibold">
            Voice Settings
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close settings"
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Settings content */}
        <div className="overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Voice Input Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Voice Input</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-input-toggle">Enable Voice Input</Label>
              <input
                id="voice-input-toggle"
                type="checkbox"
                checked={voiceInputEnabled}
                onChange={(e) => setVoiceInputEnabled(e.target.checked)}
                className="h-5 w-5 cursor-pointer"
                aria-label="Toggle voice input"
              />
            </div>
          </div>

          <Separator />

          {/* Voice Output Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Voice Output</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-output-toggle">Enable Voice Output</Label>
              <input
                id="voice-output-toggle"
                type="checkbox"
                checked={voiceOutputEnabled}
                onChange={(e) => setVoiceOutputEnabled(e.target.checked)}
                className="h-5 w-5 cursor-pointer"
                aria-label="Toggle voice output"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-play-toggle">Auto-play Responses</Label>
              <input
                id="auto-play-toggle"
                type="checkbox"
                checked={autoPlayResponses}
                onChange={(e) => setAutoPlayResponses(e.target.checked)}
                disabled={!voiceOutputEnabled}
                className="h-5 w-5 cursor-pointer disabled:opacity-50"
                aria-label="Toggle auto-play responses"
              />
            </div>

            {/* Speech Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="speech-rate">Speech Rate</Label>
                <span className="text-sm text-muted-foreground">{speechRate.toFixed(1)}x</span>
              </div>
              <input
                id="speech-rate"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                disabled={!voiceOutputEnabled}
                className="w-full cursor-pointer disabled:opacity-50"
                aria-label="Adjust speech rate"
              />
            </div>

            {/* Speech Pitch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="speech-pitch">Speech Pitch</Label>
                <span className="text-sm text-muted-foreground">{speechPitch.toFixed(1)}</span>
              </div>
              <input
                id="speech-pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                disabled={!voiceOutputEnabled}
                className="w-full cursor-pointer disabled:opacity-50"
                aria-label="Adjust speech pitch"
              />
            </div>

            {/* Speech Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="speech-volume">Volume</Label>
                <span className="text-sm text-muted-foreground">{Math.round(speechVolume * 100)}%</span>
              </div>
              <input
                id="speech-volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={speechVolume}
                onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                disabled={!voiceOutputEnabled}
                className="w-full cursor-pointer disabled:opacity-50"
                aria-label="Adjust volume"
              />
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                value={selectedVoiceURI || ''}
                onValueChange={setSelectedVoice}
                disabled={!voiceOutputEnabled || availableVoices.length === 0}
              >
                <SelectTrigger id="voice-select" aria-label="Select voice">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Voice Button */}
            <Button
              onClick={handleTestVoice}
              disabled={!voiceOutputEnabled}
              className="w-full"
              variant={isTestingVoice ? 'secondary' : 'primary'}
              aria-label={isTestingVoice ? 'Stop test' : 'Test voice'}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              {isTestingVoice ? 'Stop Test' : 'Test Voice'}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
            aria-label="Reset to defaults"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
