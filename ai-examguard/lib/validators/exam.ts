import { z } from 'zod';

/**
 * Server-authoritative validation for the Phase 6 exam engine.
 * Every mutation path re-validates here inside the service layer —
 * client-side validation is a convenience, never a trust boundary.
 */

const ISO_DATETIME = z.string().refine(
  (v) => !Number.isNaN(Date.parse(v)),
  { message: 'Must be a valid ISO datetime' }
);

const trimmedNonEmpty = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} must be at least ${min} characters`).max(
    max,
    `${label} must be at most ${max} characters`
  );

export const MCQ_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export const MCQ_OPTIONS_COUNT = 4;

// ==============================================
// STEP 1 — Examination information
// ==============================================

export const examCoreSchema = z
  .object({
    courseId: z.string().uuid('Select a course'),
    title: trimmedNonEmpty(3, 200, 'Examination title'),
    description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional().default(''),
    instructions: z.string().trim().max(5000, 'Instructions must be at most 5000 characters').optional().default(''),
    startTime: ISO_DATETIME,
    endTime: ISO_DATETIME,
  })
  .refine((v) => Date.parse(v.endTime) > Date.parse(v.startTime), {
    message: 'End time must be after the start time',
    path: ['endTime'],
  });

export type ExamCoreParsed = z.infer<typeof examCoreSchema>;

// ==============================================
// STEP 2 — MCQ question
// ==============================================

const optionSchema = z.object({
  label: z.enum(MCQ_OPTION_LABELS),
  content: trimmedNonEmpty(1, 500, 'Option'),
  isCorrect: z.boolean(),
});

export const mcqQuestionSchema = z
  .object({
    questionId: z.string().uuid().optional(),
    prompt: trimmedNonEmpty(5, 2000, 'Question text'),
    options: z.array(optionSchema).length(MCQ_OPTIONS_COUNT, 'Every question needs exactly 4 options'),
    points: z.coerce.number().int('Marks must be a whole number').min(1, 'Marks must be at least 1').max(100, 'Marks must be at most 100'),
    category: z.string().trim().max(120, 'Category must be at most 120 characters').optional().default(''),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    explanation: z.string().trim().max(2000, 'Explanation must be at most 2000 characters').optional().default(''),
    orderIndex: z.coerce.number().int().min(0).max(1000),
  })
  .refine((v) => v.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Mark exactly one option as correct',
    path: ['options'],
  })
  .refine(
    (v) => new Set(v.options.map((o) => o.label)).size === MCQ_OPTIONS_COUNT,
    { message: 'Option labels must be A, B, C, and D without duplicates', path: ['options'] }
  )
  .refine(
    (v) => new Set(v.options.map((o) => o.content.toLowerCase())).size === MCQ_OPTIONS_COUNT,
    { message: 'Answer options must be unique', path: ['options'] }
  );

export type McqQuestionParsed = z.infer<typeof mcqQuestionSchema>;

// ==============================================
// STEP 3 — Examination configuration
// ==============================================

export const NEGATIVE_MARKING_VALUES = [0, 0.25, 0.33, 0.5] as const;

export const examConfigSchema = z
  .object({
    durationMinutes: z.coerce
      .number()
      .int('Duration must be a whole number of minutes')
      .min(5, 'Duration must be at least 5 minutes')
      .max(480, 'Duration must be at most 8 hours'),
    totalPoints: z.coerce
      .number()
      .int('Maximum marks must be a whole number')
      .min(1, 'Maximum marks must be at least 1')
      .max(1000, 'Maximum marks cannot exceed 1000'),
    passingMarks: z.coerce
      .number()
      .int('Passing marks must be a whole number')
      .min(0, 'Passing marks cannot be negative')
      .max(1000, 'Passing marks cannot exceed 1000'),
    negativeMarking: z
      .union([z.number(), z.string()])
      .transform(Number)
      .refine((n) => (NEGATIVE_MARKING_VALUES as readonly number[]).includes(n), {
        message: 'Negative marking must be 0, 0.25, 0.33, or 0.5',
      }),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
  })
  .refine((v) => v.passingMarks <= v.totalPoints, {
    message: 'Passing marks cannot exceed maximum marks',
    path: ['passingMarks'],
  });

export type ExamConfigParsed = z.infer<typeof examConfigSchema>;

// ==============================================
// STEP 4 — Student assignment
// ==============================================

export const examAssignmentSchema = z.object({
  studentIds: z.array(z.string().uuid()).max(2000, 'Cannot assign more than 2000 students'),
});

// ==============================================
// STEP 5 — Monitoring settings
// ==============================================

export const examMonitoringSchema = z.object({
  requireCamera: z.boolean(),
  requireAudio: z.boolean(),
  requireFullscreen: z.boolean(),
  maxViolationsThreshold: z.coerce.number().int().min(1, 'Threshold must be at least 1').max(100, 'Threshold must be at most 100'),
});

export type ExamMonitoringParsed = z.infer<typeof examMonitoringSchema>;

// ==============================================
// helpers
// ==============================================

/** Field-level error map from a zod failure, version-proof across zod 3/4. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!(key in map)) map[key] = issue.message;
  }
  return map;
}

/** Cross-field guard used at publish time (duration fits inside the window). */
export function durationFitsWindow(durationMinutes: number, startTime: string, endTime: string): boolean {
  const windowMinutes = (Date.parse(endTime) - Date.parse(startTime)) / 60_000;
  return windowMinutes >= durationMinutes;
}
