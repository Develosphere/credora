'use client';

import { useState, useCallback, useRef } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FloatingVoiceButton } from "@/components/voice/FloatingVoiceButton";
import { VoiceAgentModal } from "@/components/voice/VoiceAgentModal";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";
import { useWakeWord } from "@/lib/voice/useWakeWord";
import { chatApi } from "@/lib/api/chat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wake word detection
  const handleWakeWordDetected = useCallback(() => {
    console.log('[DashboardLayout] 🎯 Wake word detected! Opening voice agent...');
    setIsVoiceAgentOpen(true);
  }, []);

  const { isListening: isWakeWordListening } = useWakeWord({
    enabled: wakeWordEnabled && !isVoiceAgentOpen && !isProcessing,
    onWakeWordDetected: handleWakeWordDetected,
  });

  // Voice agent hook with production-level error handling
  const {
    isListening,
    isSpeaking,
    transcript,
    response,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    reset: resetVoiceAgent,
  } = useVoiceAgent({
    onTranscript: async (transcript: string) => {
      console.log('[DashboardLayout] 📝 Voice transcript:', transcript);
      
      // Validate transcript
      if (!transcript || transcript.trim().length === 0) {
        console.warn('[DashboardLayout] ⚠️ Empty transcript, ignoring');
        speak("I didn't catch that. Could you please repeat?");
        return;
      }

      // Prevent duplicate requests
      if (isProcessing) {
        console.warn('[DashboardLayout] ⚠️ Already processing, ignoring duplicate');
        return;
      }

      // IMPORTANT: Don't call stopListening() here - let speak() handle it
      console.log('[DashboardLayout] 🚀 Starting processing...');
      
      // Show processing state for 3 seconds minimum
      setIsProcessing(true);
      const processingStartTime = Date.now();

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();

      try {
        console.log('[DashboardLayout] 🚀 Calling API...');
        const startTime = performance.now();

        // Call API with timeout
        const response = await Promise.race([
          chatApi.sendMessage(transcript),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000) // 30s timeout
          )
        ]) as Awaited<ReturnType<typeof chatApi.sendMessage>>;

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[DashboardLayout] ✅ API response received in ${duration}s`);
        
        // Validate response
        if (!response || !response.message?.content) {
          throw new Error('Invalid API response');
        }

        const content = response.message.content.trim();
        
        if (content.length === 0) {
          throw new Error('Empty response from API');
        }

        // Ensure minimum 3 seconds processing time for UX
        const processingElapsed = Date.now() - processingStartTime;
        const remainingTime = Math.max(0, 3000 - processingElapsed);
        
        if (remainingTime > 0) {
          console.log(`[DashboardLayout] ⏳ Waiting ${remainingTime}ms for minimum processing time...`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        // Speak the response (speak() will handle stopping recognition)
        console.log('[DashboardLayout] 🔊 Speaking response...');
        setIsProcessing(false);
        speak(content);

      } catch (error: any) {
        console.error('[DashboardLayout] ❌ API error:', error);
        
        // User-friendly error messages
        let errorMessage = "Sorry, I encountered an error. ";
        
        if (error.message === 'Request timeout') {
          errorMessage += "The request took too long. Please try again.";
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage += "I'm having trouble connecting. Please check your internet connection.";
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
          errorMessage += "Authentication error. Please sign in again.";
        } else if (error.message?.includes('429')) {
          errorMessage += "Too many requests. Please wait a moment and try again.";
        } else if (error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503')) {
          errorMessage += "The server is having issues. Please try again in a moment.";
        } else {
          errorMessage += "Please try again.";
        }
        
        setIsProcessing(false);
        speak(errorMessage);

        // Log error for monitoring (in production, send to error tracking service)
        if (typeof window !== 'undefined' && (window as any).errorTracker) {
          (window as any).errorTracker.captureException(error, {
            context: 'voice-agent',
            transcript,
          });
        }

      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    onResponse: (response: string) => {
      console.log('[DashboardLayout] ✅ Voice response complete');
      // Don't auto-restart listening - let user control it
    },
  });

  // Handle stop speaking button
  const handleStopSpeaking = useCallback(() => {
    console.log('[DashboardLayout] 🛑 User stopped speaking');
    stopSpeaking();
    // Restart listening immediately
    setTimeout(() => {
      if (!isProcessing) {
        startListening();
      }
    }, 300);
  }, [stopSpeaking, startListening, isProcessing]);

  // Handle floating button click
  const handleVoiceButtonClick = useCallback(() => {
    console.log('[DashboardLayout] 🎤 Voice button clicked!');
    setIsVoiceAgentOpen(true);
  }, []);

  // Handle voice agent close
  const handleCloseVoiceAgent = useCallback(() => {
    console.log('[DashboardLayout] 🚪 Closing voice agent');
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear processing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    setIsVoiceAgentOpen(false);
    setIsProcessing(false);
    resetVoiceAgent();
    
    // Re-enable wake word detection after a short delay
    setTimeout(() => {
      console.log('[DashboardLayout] 🔄 Re-enabling wake word detection');
      setWakeWordEnabled(true);
    }, 500);
  }, [resetVoiceAgent]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#121212]">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-[#121212]">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Wake Word Status Indicator */}
      {isWakeWordListening && !isVoiceAgentOpen && !isProcessing && (
        <div className="fixed bottom-24 right-8 z-30 px-3 py-1.5 bg-primary/20 backdrop-blur-sm rounded-full border border-primary/30 text-xs text-primary flex items-center gap-2 animate-in fade-in">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Listening for "Hey Credora"
        </div>
      )}

      {/* Global Voice Agent */}
      <FloatingVoiceButton onClick={handleVoiceButtonClick} />
      
      <VoiceAgentModal
        isOpen={isVoiceAgentOpen}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isProcessing={isProcessing}
        transcript={transcript}
        response={response}
        onClose={handleCloseVoiceAgent}
        onStartListening={startListening}
        onStopListening={stopListening}
        onStopSpeaking={handleStopSpeaking}
      />
    </div>
  );
}
