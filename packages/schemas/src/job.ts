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

// ─── Block schemas ──────────────────────────────────────────────────────────

const BlockA_RoleSummarySchema = z.object({
  title: z.string(),
  company: z.string(),
  level: z.string(),
  workMode: z.enum(['remote', 'hybrid', 'onsite', 'unknown']).default('unknown'),
  location: z.string().optional(),
  compensationRange: z.string().optional(),
  archetype: z.string(),
  domain: z.string(),
  function: z.string(),
  tldr: z.string(),
  whyThisMatters: z.string(),
});

const RequirementMappingSchema = z.object({
  requirement: z.string(),
  evidence: z.string(),
  strength: z.enum(['strong', 'partial', 'weak', 'missing']),
  notes: z.string().optional(),
});

const GapItemSchema = z.object({
  gap: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
  mitigation: z.string(),
});

const BlockB_CvMatchSchema = z.object({
  overallMatchPct: z.number().min(0).max(100),
  requirements: z.array(RequirementMappingSchema).default([]),
  topMatches: z.array(z.string()).default([]),
  gaps: z.array(GapItemSchema).default([]),
  risks: z.array(z.string()).default([]),
});

const BlockC_LevelStrategySchema = z.object({
  jdLevel: z.string(),
  candidateLevel: z.string(),
  levelAlignment: z.enum(['match', 'above', 'below', 'unclear']),
  strategyName: z.string(),
  talkingPoints: z.array(z.string()).default([]),
  downlevelGuidance: z.string().optional(),
});

const BenchmarkRowSchema = z.object({
  level: z.string(),
  geography: z.string(),
  companyType: z.enum(['startup-seed', 'startup-growth', 'bigtech', 'enterprise']),
  p25: z.string().optional(),
  p50: z.string().optional(),
  p75: z.string().optional(),
  source: z.string(),
});

const BlockD_CompensationDemandSchema = z.object({
  compScore: z.number().min(0).max(100),
  benchmarkTable: z.array(BenchmarkRowSchema).default([]),
  demandContext: z.string(),
  attractivenessCommentary: z.string(),
});

const CvChangeSchema = z.object({
  section: z.string(),
  change: z.string(),
  rationale: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

const BlockE_PersonalizationPlanSchema = z.object({
  cvChanges: z.array(CvChangeSchema).default([]),
  linkedInChanges: z.array(CvChangeSchema).default([]),
});

export const InterviewStorySchema = z.object({
  storyId: z.string(),
  title: z.string(),
  requirementMapped: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  tags: z.array(z.string()).default([]),
  confidenceLevel: z.enum(['high', 'medium', 'low']),
});

const BlockF_InterviewPrepSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  stories: z.array(InterviewStorySchema).default([]),
});

// ─── Legacy analysis schema (v1.x compat) ────────────────────────────────────

const LegacyAnalysisSchema = z.object({
  matches: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendation: z.string().optional(),
  actionableFixes: z.array(z.string()).default([]),
}).optional();

// ─── Full EvaluationRun v2.0 ─────────────────────────────────────────────────

export const RecommendationBandSchema = z.enum([
  'top-target',
  'strong-apply',
  'conditional-apply',
  'no-apply',
]);

export const EvaluationRunSchema = z.object({
  schemaVersion: z.string().default('v2.0'),
  jobId: z.string().uuid(),
  evaluatedAt: z.string().datetime(),
  recommendationBand: RecommendationBandSchema.default('conditional-apply'),

  // Preserved for backward compatibility with v1.x tracker entries and legacy artifacts
  scores: z.object({
    overall: z.number().min(0).max(100),
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    startupFit: z.number().min(0).max(100),
    compensationFit: z.number().min(0).max(100).optional(),
  }),
  senioritySignal: z.enum([
    'under-qualified', 'entry', 'mid', 'senior', 'staff', 'over-qualified',
  ]).optional(),
  // Legacy flat analysis — present in v1.x artifacts, optional in v2.x
  analysis: LegacyAnalysisSchema,

  // 6-block structured report
  blockA_roleSummary: BlockA_RoleSummarySchema.optional(),
  blockB_cvMatch: BlockB_CvMatchSchema.optional(),
  blockC_levelStrategy: BlockC_LevelStrategySchema.optional(),
  blockD_compensationDemand: BlockD_CompensationDemandSchema.optional(),
  blockE_personalizationPlan: BlockE_PersonalizationPlanSchema.optional(),
  blockF_interviewPrep: BlockF_InterviewPrepSchema.optional(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;
export type RecommendationBand = z.infer<typeof RecommendationBandSchema>;
export type InterviewStory = z.infer<typeof InterviewStorySchema>;
export type BenchmarkRow = z.infer<typeof BenchmarkRowSchema>;
export type RequirementMapping = z.infer<typeof RequirementMappingSchema>;
export type GapItem = z.infer<typeof GapItemSchema>;
