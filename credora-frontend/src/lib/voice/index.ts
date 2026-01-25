/**
 * Voice-Controlled CFO - Main Export
 * 
 * This module exports all voice-related utilities, types, and functions.
 */

// Types
export type {
  RecognitionState,
  SynthesisState,
  Transcript,
  VoiceInputConfig,
  VoiceInputReturn,
  VoiceOutputConfig,
  VoiceOutputReturn,
  VoiceError,
  BrowserSupport,
  VoiceSettings,
  VoiceMicrophoneButtonProps,
  VoiceTranscriptionPreviewProps,
  VoiceSettingsPanelProps,
  ErrorNotification,
} from './types';

// Browser Support
export {
  detectBrowserSupport,
  getSpeechRecognition,
  isBrowserSupported,
  getUnsupportedBrowserMessage,
} from './browserSupport';

// Error Handling
export {
  createVoiceError,
  createErrorFromRecognitionEvent,
  createSynthesisError,
  createNotSupportedError,
  errorToNotification,
  logVoiceError,
  shouldRetry,
  getRetryDelay,
  MAX_RETRY_ATTEMPTS,
} from './errors';

// Hooks
export { useVoiceInput } from './useVoiceInput';
export { useVoiceOutput } from './useVoiceOutput';
export { useWakeWord } from './useWakeWord';
export { useVoiceAgent } from './useVoiceAgent';

// Store
export { useVoiceSettingsStore, useSelectedVoice } from './useVoiceSettingsStore';
