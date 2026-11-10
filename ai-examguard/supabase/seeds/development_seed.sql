-- AI ExamGuard Database Schema
-- Seed Data: Test Data for Development
-- Created: 2026-11-10
-- WARNING: This is for DEVELOPMENT ONLY. Do NOT run in production.

-- ==============================================
-- SEED DATA: Test Tenant and Users
-- ==============================================

-- Insert test tenant
INSERT INTO public.tenants (id, name, slug, domain, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test University',
  'test-university',
  'test.edu',
  '{"require_camera": true, "require_audio": true, "require_fullscreen": true, "max_violations_threshold": 10}'::jsonb
);

-- Note: User accounts must be created through Supabase Auth
-- After creating auth users, insert test memberships:

-- Example memberships (replace with actual user IDs after auth signup)
-- INSERT INTO public.memberships (tenant_id, user_id, role)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', '<admin-user-id>', 'admin'),
--   ('00000000-0000-0000-0000-000000000001', '<instructor-user-id>', 'instructor'),
--   ('00000000-0000-0000-0000-000000000001', '<student-user-id>', 'student'),
--   ('00000000-0000-0000-0000-000000000001', '<invigilator-user-id>', 'invigilator');

-- ==============================================
-- SEED DATA: Test Course
-- ==============================================

-- INSERT INTO public.courses (id, tenant_id, instructor_id, name, code, semester, description)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   '<instructor-user-id>',
--   'Introduction to Computer Science',
--   'CS-101',
--   'Fall 2026',
--   'Foundational course covering programming fundamentals, algorithms, and data structures'
-- );

-- ==============================================
-- SEED DATA: Test Exam
-- ==============================================

-- INSERT INTO public.exams (id, course_id, tenant_id, created_by, title, description, duration_minutes, start_time, end_time, status, total_points)
-- VALUES (
--   '00000000-0000-0000-0000-000000000003',
--   '00000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   '<instructor-user-id>',
--   'Midterm Exam',
--   'Covers chapters 1-5: Variables, Control Flow, Functions, and Arrays',
--   90,
--   now() + interval '1 day',
--   now() + interval '2 days',
--   'published',
--   100
-- );

-- ==============================================
-- SEED DATA: Sample Questions
-- ==============================================

-- INSERT INTO public.questions (id, exam_id, order_index, type, prompt, points, explanation)
-- VALUES 
--   (
--     '00000000-0000-0000-0000-000000000004',
--     '00000000-0000-0000-0000-000000000003',
--     1,
--     'mcq_single',
--     'What is the time complexity of binary search?',
--     10,
--     'Binary search divides the search space in half with each iteration, resulting in O(log n) complexity.'
--   ),
--   (
--     '00000000-0000-0000-0000-000000000005',
--     '00000000-0000-0000-0000-000000000003',
--     2,
--     'true_false',
--     'Python is a statically typed programming language.',
--     5,
--     'Python is dynamically typed, meaning variable types are determined at runtime.'
--   );

-- ==============================================
-- SEED DATA: Answer Keys
-- ==============================================

-- For Question 1 (MCQ)
-- INSERT INTO public.question_answer_keys (question_id, label, content, is_correct, order_index)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000004', 'A', 'O(n)', false, 1),
--   ('00000000-0000-0000-0000-000000000004', 'B', 'O(log n)', true, 2),
--   ('00000000-0000-0000-0000-000000000004', 'C', 'O(n^2)', false, 3),
--   ('00000000-0000-0000-0000-000000000004', 'D', 'O(1)', false, 4);

-- For Question 2 (True/False)
-- INSERT INTO public.question_answer_keys (question_id, label, content, is_correct, order_index)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000005', 'True', 'True', false, 1),
--   ('00000000-0000-0000-0000-000000000005', 'False', 'False', true, 2);

-- ==============================================
-- SEED DATA: Model Versions
-- ==============================================

INSERT INTO public.model_versions (model_name, version, model_type, config, performance_metrics, is_active, deployed_at)
VALUES 
  (
    'MediaPipe Face Detector',
    '1.2.2',
    'face_detection',
    '{"backend": "wasm", "delegate": "webgl", "fps_throttle": 5}'::jsonb,
    '{"accuracy": 0.95, "precision": 0.93, "recall": 0.94}'::jsonb,
    true,
    now()
  ),
  (
    'Web Audio RMS Analyzer',
    '1.0.0',
    'audio_analysis',
    '{"fft_size": 2048, "smoothing_constant": 0.8}'::jsonb,
    '{"sensitivity": 0.85}'::jsonb,
    true,
    now()
  );

COMMENT ON TABLE public.tenants IS 'Seed data includes test university for development';
