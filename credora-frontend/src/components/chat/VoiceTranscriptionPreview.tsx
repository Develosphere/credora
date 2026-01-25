/**
 * Voice-Controlled CFO - Voice Transcription Preview Component
 * 
 * Component for displaying and editing voice transcriptions.
 * Validates: Requirements US-1.2
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VoiceTranscriptionPreviewProps } from '@/lib/voice/types';

/**
 * Voice transcription preview with edit capabilities
 * 
 * Features:
 * - Display interim and final transcripts
 * - Edit, cancel, and confirm actions
 * - Smooth animations
 * - Keyboard shortcuts (Enter to confirm, Escape to cancel)
 * 
 * @param props - Component props
 */
export function VoiceTranscriptionPreview({
  transcript,
  isFinal,
  onEdit,
  onCancel,
  onConfirm,
}: VoiceTranscriptionPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(transcript);

  // Update edited text when transcript changes
  useEffect(() => {
    setEditedText(transcript);
  }, [transcript]);

  // Don't render if no transcript
  if (!transcript || transcript.trim().length === 0) {
    return null;
  }

  /**
   * Handle edit button click
   */
  const handleEdit = () => {
    setIsEditing(true);
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(transcript);
    
    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Handle confirm button click
   */
  const handleConfirm = () => {
    if (onEdit && editedText !== transcript) {
      onEdit(editedText);
    }
    
    if (onConfirm) {
      onConfirm();
    }
    
    setIsEditing(false);
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 animate-in fade-in slide-in-from-bottom-2"
      role="status"
      aria-live="polite"
      aria-label={isFinal ? 'Final transcript' : 'Interim transcript'}
    >
      {/* Transcript display or edit input */}
      {isEditing ? (
        <Input
          type="text"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          placeholder="Edit transcript..."
          autoFocus
          aria-label="Edit transcript"
        />
      ) : (
        <div className="flex-1">
          <p className={`text-sm ${isFinal ? 'text-foreground' : 'text-muted-foreground italic'}`}>
            {transcript}
          </p>
          {!isFinal && (
            <span className="text-xs text-muted-foreground">Listening...</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {isFinal && (
        <div className="flex gap-1">
          {isEditing ? (
            <>
              {/* Confirm edit */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleConfirm}
                className="h-8 w-8 p-0"
                aria-label="Confirm edit"
                title="Confirm (Enter)"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              
              {/* Cancel edit */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
                aria-label="Cancel edit"
                title="Cancel (Escape)"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          ) : (
            <>
              {/* Edit button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
                aria-label="Edit transcript"
                title="Edit transcript"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              {/* Confirm button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleConfirm}
                className="h-8 w-8 p-0"
                aria-label="Confirm transcript"
                title="Confirm transcript"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              
              {/* Cancel button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
                aria-label="Cancel transcript"
                title="Cancel transcript"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
