import { z } from 'zod';

export const JobPostingSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url().optional(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  description: z.string(),
  salary: z.string().optional(),
  parsedAt: z.string().datetime(),
  metadata: z.record(z.any()).default({}),
});

export const EvaluationRunSchema = z.object({
  jobId: z.string().uuid(),
  evaluatedAt: z.string().datetime(),
  scores: z.object({
    overall: z.number().min(0).max(100),
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    startupFit: z.number().min(0).max(100),
    compensationFit: z.number().min(0).max(100).optional(),
  }),
  analysis: z.object({
    matches: z.array(z.string()),
    gaps: z.array(z.string()),
    risks: z.array(z.string()),
    recommendation: z.string(),
    actionableFixes: z.array(z.string()),
  }),
  senioritySignal: z.enum(['under-qualified', 'entry', 'mid', 'senior', 'staff', 'over-qualified']),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;
