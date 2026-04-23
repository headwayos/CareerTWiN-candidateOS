import { z } from 'zod';

export const VisibilityLevelSchema = z.enum(['private', 'founder', 'public']);

export const PassportSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  summary: z.string(),
  founderIntro: z.string(),
  roleTags: z.array(z.string()),
  skillTags: z.array(z.string()),
  domainTags: z.array(z.string()),
  evidenceMarkers: z.array(z.object({
    type: z.string(),
    description: z.string(),
    link: z.string().url().optional(),
    visibility: VisibilityLevelSchema.default('founder'),
  })).default([]),
  availability: z.string().optional(),
  compensationExpectation: z.object({
    min: z.number().optional(),
    currency: z.string().default('USD'),
    visibility: VisibilityLevelSchema.default('private'),
  }).optional(),
  startupFitIndicators: z.array(z.string()).default([]),
});

export const PassportReadinessSchema = z.object({
  score: z.number().min(0).max(100),
  checklist: z.array(z.object({
    task: z.string(),
    completed: z.boolean(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  isReady: z.boolean(),
});

export const PublishStateSchema = z.object({
  isLive: z.boolean().default(false),
  lastPublishedAt: z.string().datetime().optional(),
  version: z.number().default(1),
  marketplaceId: z.string().optional(),
  visibility: VisibilityLevelSchema.default('private'),
});

export type VisibilityLevel = z.infer<typeof VisibilityLevelSchema>;
export type Passport = z.infer<typeof PassportSchema>;
export type PassportReadiness = z.infer<typeof PassportReadinessSchema>;
export type PublishState = z.infer<typeof PublishStateSchema>;
