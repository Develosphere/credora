/**
 * Voice-Controlled CFO - Type Definitions
 * 
 * This file contains all TypeScript types and interfaces for the voice control feature.
 */

// ============================================================================
// Voice Recognition Types
// ============================================================================

/**
 * Voice recognition state machine states
 */
export type RecognitionState = 
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'error';

/**
 * Transcript with metadata from speech recognition
 */
export interface Transcript {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Configuration for voice input hook
 */
export interface VoiceInputConfig {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: VoiceError) => void;
}

/**
 * Return type for voice input hook
 */
export interface VoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  clearError: () => void;
  error: VoiceError | null;
}

// ============================================================================
// Voice Synthesis Types
// ============================================================================

/**
 * Voice synthesis state machine states
 */
export type SynthesisState =
  | 'idle'
  | 'speaking'
  | 'paused'
  | 'error';

/**
 * Configuration for voice output hook
 */
export interface VoiceOutputConfig {
  autoPlay?: boolean;
  rate?: number; // 0.5 to 2.0
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  voice?: SpeechSynthesisVoice;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: VoiceError) => void;
}

/**
 * Return type for voice output hook
 */
export interface VoiceOutputReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  availableVoices: SpeechSynthesisVoice[];
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  error: VoiceError | null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Voice error types with context
 */
export type VoiceError = 
  | { type: 'not-supported'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'permission-denied'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'no-speech'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'network'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'aborted'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'audio-capture'; message: string; recoverable: boolean; timestamp: number }
  | { type: 'synthesis-failed'; message: string; recoverable: boolean; timestamp: number };

// ============================================================================
// Browser Support Types
// ============================================================================

/**
 * Browser support detection result
 */
export interface BrowserSupport {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  mediaDevices: boolean;
  userAgent: string;
  browserName: string;
  browserVersion: string;
}

// ============================================================================
// Settings Types
// ============================================================================

/**
 * Voice settings stored in Zustand store
 */
export interface VoiceSettings {
  // Input settings
  voiceInputEnabled: boolean;
  language: string;
  
  // Output settings
  voiceOutputEnabled: boolean;
  autoPlayResponses: boolean;
  speechRate: number; // 0.5 to 2.0
  speechPitch: number; // 0 to 2
  speechVolume: number; // 0 to 1
  selectedVoiceURI: string | null;
  
  // Actions
  setVoiceInputEnabled: (enabled: boolean) => void;
  setVoiceOutputEnabled: (enabled: boolean) => void;
  setAutoPlayResponses: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;
  setSpeechVolume: (volume: number) => void;
  setSelectedVoice: (voiceURI: string) => void;
  reset: () => void;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for VoiceMicrophoneButton component
 */
export interface VoiceMicrophoneButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Props for VoiceTranscriptionPreview component
 */
export interface VoiceTranscriptionPreviewProps {
  transcript: string;
  isFinal: boolean;
  onEdit?: (text: string) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}

/**
 * Props for VoiceSettingsPanel component
 */
export interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Error Notification Types
// ============================================================================

/**
 * Error notification UI configuration
 */
export interface ErrorNotification {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  autoHide?: number; // milliseconds
}
