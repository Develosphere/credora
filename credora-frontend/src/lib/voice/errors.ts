/**
 * Voice-Controlled CFO - Error Handling Utilities
 * 
 * This module provides error creation, handling, and user-friendly messaging
 * for voice-related errors.
 */

import { VoiceError, ErrorNotification } from './types';

/**
 * Creates a VoiceError object with timestamp
 * 
 * @param type - Error type
 * @param message - Error message
 * @param recoverable - Whether the error is recoverable
 * @returns VoiceError object
 */
export function createVoiceError(
  type: VoiceError['type'],
  message: string,
  recoverable: boolean = true
): VoiceError {
  return {
    type,
    message,
    recoverable,
    timestamp: Date.now(),
  } as VoiceError;
}

/**
 * Creates a VoiceError from a SpeechRecognition error event
 * 
 * @param event - SpeechRecognition error event
 * @returns VoiceError object
 */
export function createErrorFromRecognitionEvent(
  event: SpeechRecognitionErrorEvent
): VoiceError {
  switch (event.error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return createVoiceError(
        'permission-denied',
        'Microphone access denied. Please allow microphone access in your browser settings.',
        true
      );
    
    case 'no-speech':
      return createVoiceError(
        'no-speech',
        'No speech detected. Please try speaking again.',
        true
      );
    
    case 'network':
      return createVoiceError(
        'network',
        'Network error occurred. Please check your connection and try again.',
        true
      );
    
    case 'aborted':
      return createVoiceError(
        'aborted',
        'Speech recognition was aborted.',
        true
      );
    
    case 'audio-capture':
      return createVoiceError(
        'audio-capture',
        'Microphone not available. Please check your microphone connection.',
        true
      );
    
    default:
      return createVoiceError(
        'aborted',
        `Speech recognition error: ${event.error}`,
        true
      );
  }
}

/**
 * Creates a VoiceError for synthesis failures
 * 
 * @param message - Error message
 * @returns VoiceError object
 */
export function createSynthesisError(message: string): VoiceError {
  return createVoiceError(
    'synthesis-failed',
    message,
    true
  );
}

/**
 * Creates a VoiceError for unsupported browsers
 * 
 * @param feature - Feature that is not supported
 * @returns VoiceError object
 */
export function createNotSupportedError(feature: string): VoiceError {
  return createVoiceError(
    'not-supported',
    `${feature} is not supported in this browser. Please use Chrome, Safari, or Edge.`,
    false
  );
}

/**
 * Converts a VoiceError to an ErrorNotification for UI display
 * 
 * @param error - VoiceError object
 * @param onRetry - Optional retry callback
 * @returns ErrorNotification object
 */
export function errorToNotification(
  error: VoiceError,
  onRetry?: () => void
): ErrorNotification {
  const baseNotification: ErrorNotification = {
    type: error.recoverable ? 'warning' : 'error',
    title: getErrorTitle(error.type),
    message: error.message,
    dismissible: true,
  };
  
  // Add retry action for recoverable errors
  if (error.recoverable && onRetry) {
    baseNotification.action = {
      label: 'Try Again',
      onClick: onRetry,
    };
  }
  
  // Auto-hide certain errors
  if (error.type === 'no-speech' || error.type === 'aborted') {
    baseNotification.autoHide = 5000; // 5 seconds
  }
  
  return baseNotification;
}

/**
 * Gets a user-friendly title for an error type
 * 
 * @param type - Error type
 * @returns Error title
 */
function getErrorTitle(type: VoiceError['type']): string {
  switch (type) {
    case 'not-supported':
      return 'Feature Not Supported';
    case 'permission-denied':
      return 'Microphone Access Denied';
    case 'no-speech':
      return 'No Speech Detected';
    case 'network':
      return 'Network Error';
    case 'aborted':
      return 'Operation Cancelled';
    case 'audio-capture':
      return 'Microphone Error';
    case 'synthesis-failed':
      return 'Voice Playback Failed';
    default:
      return 'Voice Error';
  }
}

/**
 * Logs an error to the console with context
 * 
 * @param error - VoiceError object
 * @param context - Additional context information
 */
export function logVoiceError(error: VoiceError, context?: string): void {
  const timestamp = new Date(error.timestamp).toISOString();
  const prefix = context ? `[Voice ${context}]` : '[Voice]';
  
  console.error(
    `${prefix} ${error.type} at ${timestamp}:`,
    error.message,
    { recoverable: error.recoverable }
  );
}

/**
 * Checks if an error should trigger a retry
 * 
 * @param error - VoiceError object
 * @returns true if error should trigger retry
 */
export function shouldRetry(error: VoiceError): boolean {
  return error.recoverable && (
    error.type === 'network' ||
    error.type === 'aborted' ||
    error.type === 'no-speech'
  );
}

/**
 * Gets retry delay in milliseconds based on attempt number
 * Uses exponential backoff: 100ms, 500ms, 1000ms
 * 
 * @param attempt - Retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(attempt: number): number {
  const delays = [100, 500, 1000];
  return delays[Math.min(attempt, delays.length - 1)];
}

/**
 * Maximum number of retry attempts for recoverable errors
 */
export const MAX_RETRY_ATTEMPTS = 3;
