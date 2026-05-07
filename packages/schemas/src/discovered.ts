import { z } from 'zod';

// ─── Portal config (portals.yml shape) ──────────────────────────────────────

export const PortalSourceSchema = z.object({
  sourceType: z.enum(['greenhouse', 'lever', 'company-page', 'remotive', 'mock', 'hackernews']),
  company:    z.string(),
  careersUrl: z.string().url(),
  enabled:    z.boolean().default(true),
  tags:       z.array(z.string()).default([]),
  geography:  z.string().optional(),
  workMode:   z.enum(['remote', 'hybrid', 'onsite', 'any']).default('any'),
  notes:      z.string().optional(),
});
export type PortalSource = z.infer<typeof PortalSourceSchema>;

// ─── Discovered Posting ──────────────────────────────────────────────────────

export const DiscoveredPostingSchema = z.object({
  discoveredId:      z.string().uuid(),
  sourceType:        z.enum(['greenhouse', 'lever', 'company-page', 'remotive', 'mock', 'hackernews']),
  sourceUrl:         z.string(),
  canonicalUrl:      z.string().optional(),
  company:           z.string(),
  title:             z.string(),
  location:          z.string().default(''),
  remoteMode:        z.enum(['remote', 'hybrid', 'onsite', 'unknown']).default('unknown'),
  employmentType:    z.string().optional(),
  descriptionText:   z.string().default(''),
  postedAt:          z.string().optional(),
  dedupeFingerprint: z.string(),
  discoveredAt:      z.string().datetime(),
  status:            z.enum(['pending', 'evaluated', 'skipped', 'deduped']).default('pending'),
  ingestionMetadata: z.record(z.any()).default({}),
});
export type DiscoveredPosting = z.infer<typeof DiscoveredPostingSchema>;

// ─── Scan Summary ────────────────────────────────────────────────────────────

export const SourceScanResultSchema = z.object({
  company:    z.string(),
  sourceType: z.string(),
  added:      z.number().default(0),
  deduped:    z.number().default(0),
  failed:     z.number().default(0),
  error:      z.string().optional(),
});

export const ScanSummarySchema = z.object({
  scannedAt:   z.string().datetime(),
  sources:     z.array(SourceScanResultSchema),
  totalAdded:  z.number(),
  totalDeduped: z.number(),
  totalFailed: z.number(),
});
export type ScanSummary = z.infer<typeof ScanSummarySchema>;

// ─── Batch Summary ───────────────────────────────────────────────────────────

export const BatchJobResultSchema = z.object({
  discoveredId: z.string(),
  title:        z.string(),
  company:      z.string(),
  success:      z.boolean(),
  band:         z.string().optional(),
  score:        z.number().optional(),
  error:        z.string().optional(),
});

export const BatchSummarySchema = z.object({
  ranAt:       z.string().datetime(),
  attempted:   z.number(),
  succeeded:   z.number(),
  failed:      z.number(),
  bandCounts:  z.record(z.number()).default({}),
  jobs:        z.array(BatchJobResultSchema),
});
export type BatchSummary = z.infer<typeof BatchSummarySchema>;
