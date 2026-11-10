-- ============================================================
-- AI ExamGuard - Complete Database Schema
-- CONSOLIDATED MIGRATION FILE
-- Created: 2026-11-10
-- 
-- This file consolidates all 12 migrations into one.
-- Apply this ONLY if you have a fresh database.
-- For existing databases, apply individual migrations.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create private schema for helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- PART 1: CORE SCHEMA (Tables & Enums)
-- ============================================================

-- User roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'instructor', 'invigilator', 'student');

-- Exam status enum
CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'active', 'completed', 'archived');

-- Session status enum
CREATE TYPE public.session_status AS ENUM ('not_started', 'in_progress', 'submitted', 'terminated', 'under_review', 'graded');

-- Question type enum
CREATE TYPE public.question_type AS ENUM ('mcq_single', 'mcq_multiple', 'true_false', 'short_answer', 'essay');

-- Event type enum
CREATE TYPE public.event_type AS ENUM (
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES_DETECTED',
    'FACE_OCCLUDED',
    'TAB_SWITCH',
    'FULLSCREEN_EXIT',
    'WINDOW_BLUR',
    'AUDIO_ANOMALY',
    'CLIPBOARD_PASTE',
    'CONTEXT_MENU',
    'DEVTOOLS_DETECTED'
);

-- Event severity enum
CREATE TYPE public.event_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Review status enum
CREATE TYPE public.review_status AS ENUM ('pending', 'in_review', 'cleared', 'flagged', 'escalated');

-- Review action type enum
CREATE TYPE public.review_action_type AS ENUM (
    'WARNING_SENT',
    'CAMERA_REALIGNMENT_REQUESTED',
    'SESSION_PAUSED',
    'SESSION_TERMINATED',
    'MANUAL_FLAG_ADDED',
    'MANUAL_FLAG_REMOVED',
    'CASE_CLEARED',
    'CASE_ESCALATED'
);

-- Audit action enum
CREATE TYPE public.audit_action AS ENUM (
    'USER_LOGIN',
    'USER_LOGOUT',
    'EXAM_CREATED',
    'EXAM_PUBLISHED',
    'EXAM_STARTED',
    'EXAM_SUBMITTED',
    'EXAM_GRADED',
    'QUESTION_CREATED',
    'QUESTION_UPDATED',
    'QUESTION_DELETED',
    'SESSION_STARTED',
    'SESSION_SUBMITTED',
    'SESSION_TERMINATED',
    'VIOLATION_LOGGED',
    'REVIEW_ACTION_TAKEN',
    'SETTINGS_CHANGED',
    'ROLE_ASSIGNED',
    'ROLE_REVOKED'
);

-- Integration type enum
CREATE TYPE public.integration_type AS ENUM ('lms', 'sso', 'analytics', 'storage', 'notification');

-- Instructions for applying this file:
-- 1. Copy this entire file
-- 2. Open Supabase Dashboard > SQL Editor
-- 3. Paste and run
-- 4. Wait for completion (may take 30-60 seconds)
-- 5. Verify with: SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
--    Expected: 19 tables

