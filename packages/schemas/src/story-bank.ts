import { z } from 'zod';
import crypto from 'crypto';

// ─── Story fingerprint helper ────────────────────────────────────────────────

export function computeStoryFingerprint(title: string, situation: string): string {
  const raw = title.toLowerCase().trim() + situation.slice(0, 50).toLowerCase().trim();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

// ─── Confidence level helpers ─────────────────────────────────────────────────
// Legacy StoryBank (v1.0) used confidenceLevel enum.
// v2.1 uses numeric confidence (0-1). We keep both for tolerance.

export function confidenceLevelToNumeric(level: 'high' | 'medium' | 'low'): number {
  return level === 'high' ? 0.9 : level === 'medium' ? 0.6 : 0.3;
}

export function numericToConfidenceLevel(n: number): 'high' | 'medium' | 'low' {
  return n >= 0.75 ? 'high' : n >= 0.45 ? 'medium' : 'low';
}

// ─── Story schema (v2.1, backward-compatible with v1.0) ──────────────────────
//
// Canonical internal identifier: `id`  (fingerprint hash)
// Canonical job-link field:      `jobIds`
// `confidence` is canonical going forward. `confidenceLevel` is derived.
// All new fields are optional or have defaults so v1.0 stories parse cleanly.

export const StorySchema = z.object({
  // ── Core identity (v1.0) ─────────────────────────────────────────────────
  id:               z.string(),           // fingerprint hash: sha256(title + situation[:50])[:16]
  title:            z.string(),

  // ── STAR+R (v2.1 adds reflection) ────────────────────────────────────────
  situation:        z.string(),
  task:             z.string(),
  action:           z.string(),
  result:           z.string(),
  reflection:       z.string().optional(),   // NEW: judgment / learning / tradeoffs

  // ── Interview usability (v2.1) ───────────────────────────────────────────
  shortVersion:     z.string().optional(),
  longVersion:      z.string().optional(),
  talkingPoints:    z.array(z.string()).default([]),
  pitfallsToAvoid:  z.array(z.string()).default([]),

  // ── Classification (v2.1) ────────────────────────────────────────────────
  tags:             z.array(z.string()).default([]),
  competencies:     z.array(z.string()).default([]),
  senioritySignals: z.array(z.string()).default([]),
  domains:          z.array(z.string()).default([]),

  // ── Job links: canonical field is `jobIds` (v1.0 compat) ─────────────────
  jobIds:           z.array(z.string()).default([]),   // all jobIds this story was generated for
  sourceEvaluationIds: z.array(z.string()).default([]),

  // ── Evidence & trust (v2.1) ──────────────────────────────────────────────
  evidenceSource:   z.enum(['resume','evaluation','github','manual','generated']).default('generated'),
  // Numeric confidence is canonical. Legacy `confidenceLevel` is tolerated for reads.
  confidence:       z.number().min(0).max(1).default(0.7),
  confidenceLevel:  z.enum(['high','medium','low']).optional(),  // LEGACY: tolerated, derived on write
  proofNotes:       z.array(z.string()).default([]),

  // ── Lifecycle (v2.1) ─────────────────────────────────────────────────────
  status:           z.enum(['draft','polished','archived']).default('draft'),
  usageCount:       z.number().int().default(0),
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime().optional(),
  lastUsedAt:       z.string().datetime(),
});

// ─── StoryBank schema ────────────────────────────────────────────────────────

export const StoryBankSchema = z.object({
  schemaVersion: z.string().default('v2.1'),
  updatedAt:     z.string().datetime().optional(),
  stories:       z.array(StorySchema).default([]),
});

export type Story    = z.infer<typeof StorySchema>;
export type StoryBank = z.infer<typeof StoryBankSchema>;
