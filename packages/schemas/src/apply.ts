import { z } from 'zod';

// ─── Apply Packet ────────────────────────────────────────────────────────────

export const ApplyPacketStatusSchema = z.enum(['draft', 'reviewed', 'submitted']);

export const ApplyPacketSchema = z.object({
  jobId:                z.string().uuid(),
  company:              z.string(),
  title:                z.string(),
  createdAt:            z.string().datetime(),
  status:               ApplyPacketStatusSchema.default('draft'),

  // Evaluation context
  evaluationBand:       z.string().optional(),
  evaluationScore:      z.number().optional(),

  // Source artifact references (traceability)
  sourceUrl:            z.string().optional(),
  canonicalJobUrl:      z.string().optional(),
  evaluationArtifactPath: z.string().optional(),
  trackerEntryId:       z.string().uuid().optional(),
  discoveredPostingId:  z.string().uuid().optional(),

  // Generated artifact paths (relative to packet dir)
  artifacts: z.object({
    coverLetter:        z.string().optional(),
    answers:            z.string().optional(),
    tailoredResume:     z.string().optional(),
    reviewChecklist:    z.string().optional(),
  }).default({}),

  // Review state
  reviewedAt:           z.string().datetime().optional(),
  reviewNotes:          z.string().optional(),
});
export type ApplyPacket = z.infer<typeof ApplyPacketSchema>;

// ─── Application Answer ──────────────────────────────────────────────────────

export const ApplicationAnswerSchema = z.object({
  questionKey:   z.string(),                          // e.g. "why_interested", "relevant_experience"
  questionText:  z.string(),                          // human-readable question
  answer:        z.string(),                          // generated or edited answer
  source:        z.enum(['generated', 'profile', 'manual']).default('generated'),
  editable:      z.boolean().default(true),
  lastEditedAt:  z.string().datetime().optional(),
});
export type ApplicationAnswer = z.infer<typeof ApplicationAnswerSchema>;

export const ApplicationAnswersFileSchema = z.object({
  jobId:     z.string().uuid(),
  generatedAt: z.string().datetime(),
  answers:   z.array(ApplicationAnswerSchema),
});
export type ApplicationAnswersFile = z.infer<typeof ApplicationAnswersFileSchema>;
