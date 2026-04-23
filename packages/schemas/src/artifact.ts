import { z } from 'zod';

export const ArtifactTypeSchema = z.enum([
  'resume', 'passport', 'report', 'cover-letter', 'intro-note', 'evaluation'
]);

export const ResumeVersionSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  createdAt: z.string().datetime(),
  texSource: z.string(),
  pdfPath: z.string().optional(),
  mode: z.enum(['ats', 'startup', 'targeted']).default('ats'),
  jobId: z.string().uuid().optional(),
});

export const ArtifactManifestSchema = z.object({
  version: z.number().default(1),
  lastUpdated: z.string().datetime(),
  artifacts: z.array(z.object({
    id: z.string().uuid(),
    type: ArtifactTypeSchema,
    path: z.string(),
    name: z.string(),
    createdAt: z.string().datetime(),
    metadata: z.record(z.any()).default({}),
  })).default([]),
});

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;
export type ArtifactManifest = z.infer<typeof ArtifactManifestSchema>;
