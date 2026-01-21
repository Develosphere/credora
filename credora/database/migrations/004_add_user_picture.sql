-- Credora FP&A Engine Database Schema
-- Migration 004: Add profile picture to users table

-- Add picture column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_picture ON users(picture) WHERE picture IS NOT NULL;

