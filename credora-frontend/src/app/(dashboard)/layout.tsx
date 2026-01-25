'use client';

import { useState, useCallback } from "react";
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
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true); // Enable wake word by default

  // Wake word detection - triggers when "Hey Credora" or "Hey CFO" is detected
  const handleWakeWordDetected = useCallback(() => {
    console.log('[DashboardLayout] 🎯 Wake word detected! Opening voice agent...');
    setIsVoiceAgentOpen(true);
  }, []);

  // Wake word hook - continuous background listening
  const { isListening: isWakeWordListening, lastDetection } = useWakeWord({
    enabled: wakeWordEnabled && !isVoiceAgentOpen, // Disable when modal is open
    onWakeWordDetected: handleWakeWordDetected,
  });

  // Voice agent handlers - direct API integration
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    console.log('[DashboardLayout] Voice transcript:', transcript);
    try {
      // Call API directly for fast response
      const response = await chatApi.sendMessage(transcript);
      console.log('[DashboardLayout] API response:', response);
      
      // Speak the response immediately
      if (response.message?.content) {
        speak(response.message.content);
      }
    } catch (error) {
      console.error('[DashboardLayout] API error:', error);
      speak("Sorry, I encountered an error. Please try again.");
    }
  }, []);

  const handleVoiceResponse = useCallback((response: string) => {
    console.log('[DashboardLayout] Voice response complete:', response);
    // Response is complete, conversation saved in background
  }, []);

  // Voice agent hook
  const {
    isListening,
    isSpeaking,
    transcript,
    response,
    startListening,
    stopListening,
    speak,
    reset: resetVoiceAgent,
  } = useVoiceAgent({
    onTranscript: handleVoiceTranscript,
    onResponse: handleVoiceResponse,
  });

  // Handle floating button click
  const handleVoiceButtonClick = useCallback(() => {
    console.log('[DashboardLayout] Voice button clicked! Opening voice agent...');
    setIsVoiceAgentOpen(true);
  }, []);

  // Handle voice agent close
  const handleCloseVoiceAgent = useCallback(() => {
    setIsVoiceAgentOpen(false);
    resetVoiceAgent();
    // Wake word will auto-restart after modal closes
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

      {/* Wake Word Status Indicator (optional - for debugging) */}
      {isWakeWordListening && !isVoiceAgentOpen && (
        <div className="fixed bottom-24 right-8 z-30 px-3 py-1.5 bg-primary/20 backdrop-blur-sm rounded-full border border-primary/30 text-xs text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Listening for "Hey Credora"
        </div>
      )}

      {/* Global Voice Agent - Available on all dashboard pages */}
      <FloatingVoiceButton onClick={handleVoiceButtonClick} />
      
      <VoiceAgentModal
        isOpen={isVoiceAgentOpen}
        isListening={isListening}
        isSpeaking={isSpeaking}
        transcript={transcript}
        response={response}
        onClose={handleCloseVoiceAgent}
        onStartListening={startListening}
        onStopListening={stopListening}
      />
    </div>
  );
}
