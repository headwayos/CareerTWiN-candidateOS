import fs from 'fs-extra';
import path from 'path';
import type { ApplicationTrackerItem, EvaluationRun, ApplyPacket } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { TrackerEngine } from './tracker';

// ─── Issue types ─────────────────────────────────────────────────────────────

export interface PipelineIssue {
  severity: 'warn' | 'error';
  category: string;
  message: string;
  autoFixable: boolean;
}

export interface PipelineHealthReport {
  trackerCount:    number;
  evalCount:       number;
  discoveredCount: number;
  packetCount:     number;
  issues:          PipelineIssue[];
}

export interface PipelineStats {
  total:       number;
  byStatus:    Record<string, number>;
  strongest:   { title: string; company: string; score: number; band: string } | null;
  mostRecent:  { title: string; company: string; evaluatedAt: string } | null;
}

// ─── PipelineEngine ──────────────────────────────────────────────────────────

export class PipelineEngine {
  private tracker: TrackerEngine;

  constructor(private workspace: WorkspaceManager) {
    this.tracker = new TrackerEngine(workspace);
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  async health(): Promise<PipelineHealthReport> {
    const items    = await this.tracker.list();
    const evals    = await this.loadAllEvaluations();
    const discovered = await this.loadDiscoveredCount();
    const packets  = await this.loadAllPackets();
    const issues: PipelineIssue[] = [];

    // 1. Duplicate tracker entries (same jobId)
    const jobIdCounts: Record<string, number> = {};
    for (const item of items) {
      jobIdCounts[item.jobId] = (jobIdCounts[item.jobId] ?? 0) + 1;
    }
    const dupes = Object.entries(jobIdCounts).filter(([, c]) => c > 1);
    for (const [jobId, count] of dupes) {
      issues.push({
        severity: 'warn', category: 'duplicate-tracker',
        message: `Tracker has ${count} entries for jobId ${jobId.slice(0, 8)}...`,
        autoFixable: true,
      });
    }

    // 2. Orphan evaluations (no tracker entry)
    const trackedJobIds = new Set(items.map(i => i.jobId));
    for (const ev of evals) {
      if (ev.jobId && !trackedJobIds.has(ev.jobId)) {
        issues.push({
          severity: 'warn', category: 'orphan-evaluation',
          message: `Evaluation ${ev.jobId.slice(0, 8)}... has no tracker entry`,
          autoFixable: true,
        });
      }
    }

    // 3. Missing evaluations (tracker entry but no eval artifact)
    const evalJobIds = new Set(evals.map(e => e.jobId).filter(Boolean));
    for (const item of items) {
      if (!evalJobIds.has(item.jobId)) {
        issues.push({
          severity: 'warn', category: 'missing-evaluation',
          message: `Tracker entry ${item.id.slice(0, 8)}... (jobId ${item.jobId.slice(0, 8)}...) has no evaluation artifact`,
          autoFixable: false,
        });
      }
    }

    // 4. Status normalization
    const validStatuses = new Set([
      'evaluated', 'shortlisted', 'tailored', 'ready-to-apply', 'applied',
      'follow-up', 'interview', 'rejected', 'offer', 'ghosted',
    ]);
    for (const item of items) {
      if (!validStatuses.has(item.status)) {
        issues.push({
          severity: 'warn', category: 'invalid-status',
          message: `Tracker entry ${item.id.slice(0, 8)}... has invalid status: "${item.status}"`,
          autoFixable: true,
        });
      }
    }

    // 5. Stale discovered postings (pending > 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const discDir = this.workspace.getPath('jobs/discovered');
    if (await fs.pathExists(discDir)) {
      for (const f of await fs.readdir(discDir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const d = await fs.readJson(path.join(discDir, f));
          if (d.status === 'pending' && d.discoveredAt < thirtyDaysAgo) {
            issues.push({
              severity: 'warn', category: 'stale-discovered',
              message: `Discovered posting ${d.title?.slice(0, 30)}... pending since ${d.discoveredAt?.slice(0, 10)}`,
              autoFixable: true,
            });
          }
        } catch { /* skip */ }
      }
    }

    // 6. Apply packet integrity
    for (const pkt of packets) {
      // Packet without tracker
      if (!trackedJobIds.has(pkt.jobId)) {
        issues.push({
          severity: 'warn', category: 'packet-no-tracker',
          message: `Apply packet for ${pkt.company} — ${pkt.title} has no tracker entry`,
          autoFixable: false,
        });
      }
      // Packet without evaluation
      if (!evalJobIds.has(pkt.jobId)) {
        issues.push({
          severity: 'warn', category: 'packet-no-evaluation',
          message: `Apply packet for ${pkt.company} — ${pkt.title} has no evaluation artifact`,
          autoFixable: false,
        });
      }
      // Stale draft (> 14 days)
      if (pkt.status === 'draft') {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        if (pkt.createdAt < fourteenDaysAgo) {
          issues.push({
            severity: 'warn', category: 'stale-packet',
            message: `Draft packet for ${pkt.company} — ${pkt.title} created ${pkt.createdAt.slice(0, 10)}, still not reviewed`,
            autoFixable: false,
          });
        }
      }
    }

    return {
      trackerCount:    items.length,
      evalCount:       evals.length,
      discoveredCount: discovered,
      packetCount:     packets.length,
      issues,
    };
  }

  // ─── Fix ───────────────────────────────────────────────────────────────────

  async fix(): Promise<{ fixed: number; skipped: number; details: string[] }> {
    const items  = await this.tracker.list();
    const evals  = await this.loadAllEvaluations();
    let fixed = 0;
    let skipped = 0;
    const details: string[] = [];

    // 1. Deduplicate tracker entries (keep latest by lastUpdatedAt)
    const jobIdGroups: Record<string, ApplicationTrackerItem[]> = {};
    for (const item of items) {
      (jobIdGroups[item.jobId] ??= []).push(item);
    }
    const deduped: ApplicationTrackerItem[] = [];
    for (const [, group] of Object.entries(jobIdGroups)) {
      group.sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
      deduped.push(group[0]);
      if (group.length > 1) {
        details.push(`Deduped ${group.length - 1} extra tracker entries for jobId ${group[0].jobId.slice(0, 8)}...`);
        fixed += group.length - 1;
      }
    }

    // 2. Create tracker entries for orphan evaluations
    const trackedJobIds = new Set(deduped.map(i => i.jobId));
    for (const ev of evals) {
      if (ev.jobId && !trackedJobIds.has(ev.jobId)) {
        const { randomUUID } = await import('crypto');
        deduped.push({
          id: randomUUID(),
          jobId: ev.jobId,
          status: 'evaluated',
          lastUpdatedAt: new Date().toISOString(),
          notes: [{ date: new Date().toISOString(), content: 'Auto-created by pipeline fix' }],
          artifacts: {},
          reminders: [],
        } as any);
        trackedJobIds.add(ev.jobId);
        details.push(`Created tracker entry for orphan eval ${ev.jobId.slice(0, 8)}...`);
        fixed++;
      }
    }

    // 3. Normalize invalid statuses
    const validStatuses = new Set([
      'evaluated', 'shortlisted', 'tailored', 'ready-to-apply', 'applied',
      'follow-up', 'interview', 'rejected', 'offer', 'ghosted',
    ]);
    for (const item of deduped) {
      if (!validStatuses.has(item.status)) {
        details.push(`Normalized status "${item.status}" → "evaluated" for ${item.id.slice(0, 8)}...`);
        (item as any).status = 'evaluated';
        fixed++;
      }
    }

    // 4. Mark stale discovered as skipped
    const discDir = this.workspace.getPath('jobs/discovered');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    if (await fs.pathExists(discDir)) {
      for (const f of await fs.readdir(discDir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const filePath = path.join(discDir, f);
          const d = await fs.readJson(filePath);
          if (d.status === 'pending' && d.discoveredAt < thirtyDaysAgo) {
            d.status = 'skipped';
            await fs.writeJson(filePath, d, { spaces: 2 });
            details.push(`Marked stale discovered "${d.title?.slice(0, 30)}..." as skipped`);
            fixed++;
          }
        } catch { /* skip */ }
      }
    }

    // Write deduped tracker
    const trackerPath = this.workspace.getPath('tracker/applications.json');
    await fs.writeJson(trackerPath, deduped, { spaces: 2 });

    return { fixed, skipped, details };
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async stats(): Promise<PipelineStats> {
    const items = await this.tracker.list();
    const evals = await this.loadAllEvaluations();

    const byStatus: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    // Find strongest evaluation
    let strongest: PipelineStats['strongest'] = null;
    let mostRecent: PipelineStats['mostRecent'] = null;
    const bandOrder = ['top-target', 'strong-apply', 'conditional-apply', 'no-apply'];

    for (const ev of evals) {
      const score = ev.scores?.overall ?? 0;
      if (!strongest || score > strongest.score) {
        strongest = {
          title: ev.blockA_roleSummary?.title ?? 'Unknown',
          company: ev.blockA_roleSummary?.company ?? 'Unknown',
          score,
          band: ev.recommendationBand ?? 'unknown',
        };
      }
      const evalAt = (ev as any).evaluatedAt ?? '';
      if (!mostRecent || evalAt > (mostRecent.evaluatedAt ?? '')) {
        mostRecent = {
          title: ev.blockA_roleSummary?.title ?? 'Unknown',
          company: ev.blockA_roleSummary?.company ?? 'Unknown',
          evaluatedAt: evalAt,
        };
      }
    }

    return { total: items.length, byStatus, strongest, mostRecent };
  }

  // ─── Loaders ───────────────────────────────────────────────────────────────

  private async loadAllEvaluations(): Promise<EvaluationRun[]> {
    const evalDir = this.workspace.getPath('jobs/evaluations');
    if (!(await fs.pathExists(evalDir))) return [];
    const results: EvaluationRun[] = [];
    for (const f of await fs.readdir(evalDir)) {
      if (!f.endsWith('.json')) continue;
      try { results.push(await fs.readJson(path.join(evalDir, f))); }
      catch { /* skip */ }
    }
    return results;
  }

  private async loadDiscoveredCount(): Promise<number> {
    const dir = this.workspace.getPath('jobs/discovered');
    if (!(await fs.pathExists(dir))) return 0;
    return (await fs.readdir(dir)).filter(f => f.endsWith('.json')).length;
  }

  private async loadAllPackets(): Promise<ApplyPacket[]> {
    const applyDir = this.workspace.getPath('jobs/applications');
    if (!(await fs.pathExists(applyDir))) return [];
    const packets: ApplyPacket[] = [];
    for (const d of await fs.readdir(applyDir)) {
      const p = path.join(applyDir, d, 'packet.json');
      if (await fs.pathExists(p)) {
        try { packets.push(await fs.readJson(p)); }
        catch { /* skip */ }
      }
    }
    return packets;
  }
}
