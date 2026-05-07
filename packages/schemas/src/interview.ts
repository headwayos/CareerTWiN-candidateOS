import { z } from 'zod';

// ─── Story Map ────────────────────────────────────────────────────────────────
// Written to: .careertwin/jobs/interview/<jobId>/story-map.json

export const StoryMappingSchema = z.object({
  requirement:          z.string(),
  storyId:              z.string(),   // references Story.id
  storyTitle:           z.string(),
  fitReason:            z.string(),
  confidence:           z.number().min(0).max(1),
  risk:                 z.string().optional(),
  suggestedOpeningLine: z.string().optional(),
  backupStoryIds:       z.array(z.string()).default([]),
});

export const StoryMapGapSchema = z.object({
  requirement: z.string(),
  reason:      z.string(),
  mitigation:  z.string(),
});

export const StoryMapSchema = z.object({
  jobId:          z.string(),
  generatedAt:    z.string().datetime(),
  mappedStories:  z.array(StoryMappingSchema).default([]),
  gaps:           z.array(StoryMapGapSchema).default([]),
});

export type StoryMapping = z.infer<typeof StoryMappingSchema>;
export type StoryMapGap  = z.infer<typeof StoryMapGapSchema>;
export type StoryMap     = z.infer<typeof StoryMapSchema>;

// ─── Likely Questions ─────────────────────────────────────────────────────────
// Written to: .careertwin/jobs/interview/<jobId>/likely-questions.json

export const QuestionCategorySchema = z.enum([
  'recruiter',
  'hiring-manager',
  'behavioral',
  'technical',
  'system-design',
  'founder',
]);

export const LikelyQuestionSchema = z.object({
  questionId:       z.string(),
  category:         QuestionCategorySchema,
  question:         z.string(),
  whyTheyAsk:       z.string(),
  answerStrategy:   z.string(),
  mappedStoryIds:   z.array(z.string()).default([]),
  riskLevel:        z.enum(['low','medium','high']).default('low'),
});

export const LikelyQuestionsFileSchema = z.object({
  jobId:       z.string(),
  generatedAt: z.string().datetime(),
  questions:   z.array(LikelyQuestionSchema).default([]),
});

export type QuestionCategory      = z.infer<typeof QuestionCategorySchema>;
export type LikelyQuestion        = z.infer<typeof LikelyQuestionSchema>;
export type LikelyQuestionsFile   = z.infer<typeof LikelyQuestionsFileSchema>;

// ─── Interview Prep Context ───────────────────────────────────────────────────
// Internal type (not persisted) — used to collect all data sources for generation

export const InterviewContextSchema = z.object({
  jobId:          z.string(),
  hasEvaluation:  z.boolean(),
  hasProfile:     z.boolean(),
  hasApplyPacket: z.boolean(),
  hasDiscovered:  z.boolean(),
  hasStoryMap:    z.boolean(),
});

export type InterviewContext = z.infer<typeof InterviewContextSchema>;
