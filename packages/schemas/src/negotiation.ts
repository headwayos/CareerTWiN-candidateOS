import { z } from 'zod';

export const CompensationBoundariesSchema = z.object({
  targetBase: z.string().optional(),
  minimumBase: z.string().optional(),
  expectedRange: z.string().optional(),
  marketRange: z.string().optional(),
  currency: z.string().optional(),
  confidence: z.enum(['low', 'medium', 'high']).default('low'),
  sourceNotes: z.array(z.string()).default([]),
  manualReviewRequired: z.boolean().default(true)
});

export const LeverageSchema = z.object({
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  proofPoints: z.array(z.string()).default([]),
  alternatives: z.array(z.string()).default([])
});

export const ScriptsSchema = z.object({
  recruiterScriptPath: z.string(),
  founderScriptPath: z.string(),
  downlevelResponsePath: z.string()
});

export const NegotiationPacketSchema = z.object({
  jobId: z.string(),
  company: z.string(),
  title: z.string(),
  createdAt: z.string(),
  status: z.enum(['draft', 'reviewed', 'archived']).default('draft'),
  manualReviewRequired: z.boolean().default(true),

  evaluationBand: z.string().optional(),
  evaluationScore: z.number().optional(),
  trackerEntryId: z.string().optional(),
  applyPacketPath: z.string().optional(),
  interviewPackPath: z.string().optional(),
  evaluationArtifactPath: z.string().optional(),

  compensation: CompensationBoundariesSchema,
  leverage: LeverageSchema,
  scripts: ScriptsSchema
});

export type CompensationBoundaries = z.infer<typeof CompensationBoundariesSchema>;
export type Leverage = z.infer<typeof LeverageSchema>;
export type Scripts = z.infer<typeof ScriptsSchema>;
export type NegotiationPacket = z.infer<typeof NegotiationPacketSchema>;

export const NegotiationPlanFileSchema = z.object({
  roleSnapshot: z.record(z.string(), z.any()),
  compensationSummary: CompensationBoundariesSchema,
  leverage: LeverageSchema,
  risks: z.array(z.string()).default([]),
  strategy: z.object({
    openingPosition: z.string(),
    safeAsk: z.string(),
    fallbackAsk: z.string(),
    walkAwayLine: z.string().optional(),
    nonCashLevers: z.array(z.string()).default([])
  })
});

export type NegotiationPlanFile = z.infer<typeof NegotiationPlanFileSchema>;
