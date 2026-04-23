import { z } from 'zod';

export const ApplicationStatusSchema = z.enum([
  'evaluated', 'shortlisted', 'tailored', 'applied',
  'follow-up', 'interview', 'rejected', 'offer', 'ghosted'
]);

export const ApplicationTrackerItemSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  status: ApplicationStatusSchema.default('evaluated'),
  appliedAt: z.string().datetime().optional(),
  lastUpdatedAt: z.string().datetime(),
  notes: z.array(z.object({
    date: z.string().datetime(),
    content: z.string(),
  })).default([]),
  artifacts: z.object({
    resumeId: z.string().optional(),
    coverLetterId: z.string().optional(),
    introNote: z.string().optional(),
  }).default({}),
  reminders: z.array(z.object({
    date: z.string().datetime(),
    task: z.string(),
    completed: z.boolean().default(false),
  })).default([]),
});

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type ApplicationTrackerItem = z.infer<typeof ApplicationTrackerItemSchema>;
