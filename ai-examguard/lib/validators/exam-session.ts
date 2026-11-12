import { z } from 'zod';

export const hardwareStatusInputSchema = z
  .object({
    camera: z.boolean().optional(),
    microphone: z.boolean().optional(),
    fullscreen: z.boolean().optional(),
  })
  .strict();

export const startSessionSchema = z.object({
  hardwareStatus: hardwareStatusInputSchema.optional(),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question identifier.'),
  selectedOptionId: z.string().uuid('Invalid answer option identifier.').nullable().optional(),
  responseText: z.string().max(25000, 'Answer exceeds maximum 25,000 characters.').nullable().optional(),
  clientUpdatedAt: z.string().optional(),
});

export const batchSaveAnswersSchema = z.object({
  answers: z
    .array(saveAnswerSchema)
    .min(1, 'At least one answer entry is required.')
    .max(500, 'Batch size exceeds maximum question limit.'),
});

export const updateSessionProgressSchema = z.object({
  flaggedQuestionIds: z.array(z.string().uuid()).max(500).optional(),
  currentQuestionId: z.string().uuid().nullable().optional(),
  hardwareStatus: hardwareStatusInputSchema.optional(),
});

export const submitExamSchema = z.object({
  autoSubmitted: z.boolean().optional().default(false),
  flaggedQuestionIds: z.array(z.string().uuid()).max(500).optional(),
  pendingAnswers: z.array(saveAnswerSchema).max(500).optional(),
});

