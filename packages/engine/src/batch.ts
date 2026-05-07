import path from 'path';
import type { DiscoveredPosting, BatchSummary } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { EvaluationEngine } from './evaluation';
import { TrackerEngine } from './tracker';
import { ScanEngine } from './scan';
import { StoryBankEngine } from './story-bank';

export interface BatchOptions {
  limit?: number;
  concurrency?: number;
}

export class BatchEngine {
  private tracker: TrackerEngine;
  private scanEngine: ScanEngine;
  private storyBank: StoryBankEngine;

  constructor(
    private workspace: WorkspaceManager,
    private evaluation: EvaluationEngine,
  ) {
    this.tracker   = new TrackerEngine(workspace);
    this.scanEngine = new ScanEngine(workspace);
    this.storyBank = new StoryBankEngine(workspace);
  }

  async run(opts: BatchOptions = {}): Promise<BatchSummary> {
    const concurrency = opts.concurrency ?? 2;
    let pending = await this.scanEngine.loadPending();
    if (opts.limit) pending = pending.slice(0, opts.limit);

    const summary: BatchSummary = {
      ranAt:      new Date().toISOString(),
      attempted:  pending.length,
      succeeded:  0,
      failed:     0,
      bandCounts: {},
      jobs:       [],
    };

    if (pending.length === 0) return summary;

    // Worker pool: process in chunks of `concurrency`
    for (let i = 0; i < pending.length; i += concurrency) {
      const chunk = pending.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map(p => this.evaluateOne(p)));

      for (let j = 0; j < results.length; j++) {
        const posting = chunk[j];
        const result = results[j];

        if (result.status === 'fulfilled') {
          const { band, score, evalResult } = result.value;
          
          // Add or update tracker entry synchronously to prevent JSON race conditions
          if (evalResult) {
            await this.upsertTracker(posting, evalResult);
          }

          summary.succeeded++;
          summary.bandCounts[band] = (summary.bandCounts[band] ?? 0) + 1;
          summary.jobs.push({ discoveredId: posting.discoveredId, title: posting.title, company: posting.company, success: true, band, score });
        } else {
          summary.failed++;
          summary.jobs.push({ discoveredId: posting.discoveredId, title: posting.title, company: posting.company, success: false, error: String(result.reason) });
        }
      }
    }

    return summary;
  }

  private async evaluateOne(posting: DiscoveredPosting): Promise<{ band: string; score: number; evalResult?: any }> {
    if (!posting.descriptionText || posting.descriptionText.trim().length < 20) {
      throw new Error('Description too short to evaluate');
    }

    // Build a minimal JD string for the evaluation engine
    const jd = [
      `# ${posting.title} at ${posting.company}`,
      posting.location ? `Location: ${posting.location}` : '',
      '',
      posting.descriptionText,
    ].filter(Boolean).join('\n');

    // Write a temp JD file for the evaluation engine
    const tmpPath = this.workspace.getPath(`cache/batch-jd-${posting.discoveredId}.txt`);
    const fs = await import('fs-extra');
    await fs.ensureDir(path.dirname(tmpPath));
    await fs.writeFile(tmpPath, jd, 'utf-8');

    // Build a minimal JD text for the evaluation engine
    const profile = await this.loadProfile();
    const evalResult = await this.evaluation.evaluateJob(
      jd,
      profile,
      { mock: !process.env.CT_LOCAL_URL && !process.env.OPENAI_API_KEY }
    );

    const band  = evalResult?.recommendationBand ?? 'unknown';
    const score = evalResult?.scores?.overall ?? 0;

    // Seed stories to StoryBank
    if (evalResult) {
      await this.storyBank.seedFromEvaluation(evalResult);
    }

    return { band, score, evalResult };
  }

  private async loadProfile() {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    const fs2 = await import('fs-extra');
    if (await fs2.pathExists(profilePath)) {
      return fs2.readJson(profilePath);
    }
    return { name: 'Candidate', summary: '' };
  }

  private async upsertTracker(posting: DiscoveredPosting, evalResult: any): Promise<void> {
    const jobId = evalResult?.jobId;
    if (!jobId) return;
    const items = await this.tracker.list();
    const existing = items.find(i => i.jobId === jobId);
    if (existing) {
      await this.tracker.update(existing.id, existing.status);
    } else {
      const { randomUUID } = await import('crypto');
      await this.tracker.add({
        id:            randomUUID(),
        jobId,
        status:        'evaluated',
        lastUpdatedAt: new Date().toISOString(),
        notes:         [{ date: new Date().toISOString(), content: `Batch: ${evalResult?.recommendationBand ?? ''} · ${evalResult?.scores?.overall ?? 0}/100` }],
        artifacts:     {},
        reminders:     [],
      });
    }
  }
}
