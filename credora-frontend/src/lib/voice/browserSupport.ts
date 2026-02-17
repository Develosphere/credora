/**
 * Voice-Controlled CFO - Browser Support Detection
 * 
 * This module detects browser support for Web Speech API features.
 * Validates: Requirements TR-1.1, TR-1.2, TR-1.3, TR-1.4
 */

import { BrowserSupport } from './types';

/**
 * Detects browser name from user agent
 */
function detectBrowserName(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg/')) return 'Edge';
  if (userAgent.includes('chrome')) return 'Chrome';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('opera') || userAgent.includes('opr/')) return 'Opera';
  
  return 'Unknown';
}

/**
 * Detects browser version from user agent
 */
function detectBrowserVersion(): string {
  const userAgent = navigator.userAgent;
  
  // Edge
  const edgeMatch = userAgent.match(/Edg\/(\d+)/);
  if (edgeMatch) return edgeMatch[1];
  
  // Chrome
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  if (chromeMatch && !userAgent.includes('Edg/')) return chromeMatch[1];
  
  // Safari
  const safariMatch = userAgent.match(/Version\/(\d+)/);
  if (safariMatch && userAgent.includes('Safari')) return safariMatch[1];
  
  // Firefox
  const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
  if (firefoxMatch) return firefoxMatch[1];
  
  return 'Unknown';
}

/**
 * Detects if SpeechRecognition API is supported
 * Checks for both prefixed (webkit) and unprefixed versions
 */
function hasSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window
  );
}

/**
 * Detects if SpeechSynthesis API is supported
 */
function hasSpeechSynthesis(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'speechSynthesis' in window;
}

/**
 * Detects if MediaDevices API is supported (for microphone access)
 */
function hasMediaDevices(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );
}

/**
 * Detects browser support for Web Speech API features
 * 
 * This function checks for:
 * - SpeechRecognition API (speech-to-text)
 * - SpeechSynthesis API (text-to-speech)
 * - MediaDevices API (microphone access)
 * - Browser name and version
 * 
 * @returns BrowserSupport object with detection results
 * 
 * @example
 * const support = detectBrowserSupport();
 * if (!support.speechRecognition) {
 *   console.log('Speech recognition not supported');
 * }
 */
export function detectBrowserSupport(): BrowserSupport {
  // Handle server-side rendering
  if (typeof window === 'undefined') {
    return {
      speechRecognition: false,
      speechSynthesis: false,
      mediaDevices: false,
      userAgent: '',
      browserName: 'Unknown',
      browserVersion: 'Unknown',
    };
  }
  
  const support = {
    speechRecognition: hasSpeechRecognition(),
    speechSynthesis: hasSpeechSynthesis(),
    mediaDevices: hasMediaDevices(),
    userAgent: navigator.userAgent,
    browserName: detectBrowserName(),
    browserVersion: detectBrowserVersion(),
  };
  
  console.log('[BrowserSupport] Detection result:', support);
  
  return support;
}

/**
 * Gets the SpeechRecognition constructor (handles browser prefixes)
 * 
 * @returns SpeechRecognition constructor or null if not supported
 */
export function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  
  // @ts-expect-error - webkitSpeechRecognition is not in TypeScript types
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Checks if the current browser is supported for voice features
 * 
 * Supported browsers:
 * - Chrome 25+
 * - Safari 14.1+
 * - Edge 79+
 * 
 * @returns true if browser is supported, false otherwise
 */
export function isBrowserSupported(): boolean {
  const support = detectBrowserSupport();
  
  // Must have at least speech recognition or synthesis
  if (!support.speechRecognition && !support.speechSynthesis) {
    return false;
  }
  
  const browserName = support.browserName;
  const version = parseInt(support.browserVersion, 10);
  
  // Check minimum version requirements
  if (browserName === 'Chrome' && version >= 25) return true;
  if (browserName === 'Safari' && version >= 14) return true;
  if (browserName === 'Edge' && version >= 79) return true;
  
  // Allow other browsers if they have the APIs
  if (support.speechRecognition || support.speechSynthesis) return true;
  
  return false;
}

/**
 * Gets a user-friendly message for unsupported browsers
 * 
 * @returns Error message with browser upgrade suggestions
 */
export function getUnsupportedBrowserMessage(): string {
  const support = detectBrowserSupport();
  const browserName = support.browserName;
  
  if (browserName === 'Firefox') {
    return 'Voice features are not supported in Firefox. Please use Chrome, Safari, or Edge for voice control.';
  }
  
  return `Voice features are not fully supported in your browser (${browserName} ${support.browserVersion}). Please upgrade to the latest version or use Chrome, Safari, or Edge.`;
}
