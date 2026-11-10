-- AI ExamGuard Database Schema
-- Migration 001: Core Schema Foundation
-- Created: 2026-11-10
-- Description: Create base tables, enums, and tenant structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create private schema for helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- ==============================================
-- 1. TENANTS (Universities/Organizations)
-- ==============================================

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT settings_valid_json CHECK (jsonb_typeof(settings) = 'object')
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);

COMMENT ON TABLE public.tenants IS 'Educational institutions or certification organizations';
COMMENT ON COLUMN public.tenants.slug IS 'URL-safe identifier for tenant';
COMMENT ON COLUMN public.tenants.domain IS 'Institutional email domain (e.g. stanford.edu)';
COMMENT ON COLUMN public.tenants.settings IS 'Institutional configuration (allowed models, proctoring defaults)';

-- ==============================================
-- 2. PROFILES (User Metadata)
-- ==============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_profiles_email ON public.profiles(email);

COMMENT ON TABLE public.profiles IS 'User metadata linked to Supabase auth.users';

-- ==============================================
-- 3. MEMBERSHIPS (User-Tenant-Role Mapping)
-- ==============================================

CREATE TYPE public.user_role AS ENUM ('admin', 'instructor', 'invigilator', 'student');

CREATE TABLE public.memberships (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (tenant_id, user_id, role),
    CONSTRAINT no_duplicate_roles CHECK (true) -- Enforced by PK
);

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant_role ON public.memberships(tenant_id, role);
CREATE INDEX idx_memberships_lookup ON public.memberships(tenant_id, user_id);

COMMENT ON TABLE public.memberships IS 'User role assignments within tenants';
COMMENT ON COLUMN public.memberships.role IS 'User permission role: admin, instructor, invigilator, student';

-- ==============================================
-- 4. COURSES
-- ==============================================

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    semester TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT course_code_format CHECK (code ~ '^[A-Z]{2,4}-[0-9]{3,4}$'),
    UNIQUE (tenant_id, code, semester)
);

CREATE INDEX idx_courses_tenant ON public.courses(tenant_id);
CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_semester ON public.courses(tenant_id, semester);

COMMENT ON TABLE public.courses IS 'Academic courses within institutions';
COMMENT ON COLUMN public.courses.code IS 'Course catalog code (e.g. CS-201)';
COMMENT ON COLUMN public.courses.semester IS 'Academic term (e.g. Fall 2026)';

-- ==============================================
-- 5. ENROLLMENTS
-- ==============================================

CREATE TABLE public.enrollments (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (course_id, student_id)
);

CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);

COMMENT ON TABLE public.enrollments IS 'Student enrollment registry for courses';

