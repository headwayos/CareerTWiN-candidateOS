import { z } from 'zod';

export const CandidateProfileSchema = z.object({
  id: z.string().uuid(),
  bio: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().nullable().optional(),
    summary: z.string(),
    links: z.object({
      github: z.string().optional(),
      linkedin: z.string().optional(),
      portfolio: z.string().optional(),
      twitter: z.string().optional(),
    }).default({}),
  }),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().nullable().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    highlights: z.array(z.string()),
    stack: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string().nullable().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
  })).default([]),
  skills: z.array(z.string()).default([]),
});

export const CandidatePreferencesSchema = z.object({
  roles: z.array(z.string()),
  locations: z.array(z.string()),
  remote: z.enum(['remote', 'hybrid', 'onsite', 'any']).default('any'),
  compensation: z.object({
    currency: z.string().default('USD'),
    min: z.number().optional(),
    expected: z.number().optional(),
  }).optional(),
  stack: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()).default([]),
    interested: z.array(z.string()).default([]),
  }),
  startupStage: z.array(z.enum(['seed', 'series-a', 'series-b', 'series-c', 'growth', 'mature', 'any'])).default(['any']),
});

export const CandidateEvidenceSchema = z.object({
  github: z.array(z.object({
    repo: z.string(),
    description: z.string().optional(),
    url: z.string().url(),
    stars: z.number().default(0),
    language: z.string().optional(),
    readmeSnippet: z.string().optional(),
    highlights: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().url().optional(),
    stack: z.array(z.string()),
    impact: z.string().optional(),
  })).default([]),
  testimonials: z.array(z.object({
    from: z.string(),
    role: z.string().optional(),
    text: z.string(),
  })).default([]),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type CandidatePreferences = z.infer<typeof CandidatePreferencesSchema>;
export type CandidateEvidence = z.infer<typeof CandidateEvidenceSchema>;
