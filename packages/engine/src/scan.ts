import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import type {
  PortalSource,
  DiscoveredPosting,
  ScanSummary,
} from '@careertwin/schemas';
import { DiscoveredPostingSchema } from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { GreenhouseConnector } from './connectors/greenhouse';
import { LeverConnector } from './connectors/lever';
import { CompanyPageConnector } from './connectors/company-page';
import { DedupeEngine, dedupeFingerprint, normalizeWorkMode } from './dedupe';
import type { RawPosting } from './connectors/types';

const DEFAULT_PORTALS_YML = `# CTOSS Portal Sources
# Add your target companies and job boards here.
# Run: npm run ct -- scan

sources:
  # ── Built-in public feeds (no configuration needed) ──────────────────────
  - sourceType: hackernews
    company: Hacker News Jobs
    careersUrl: https://news.ycombinator.com/jobs
    enabled: true
    tags: [engineering, startup, remote]
    geography: global
    workMode: any
    notes: "Public HN Who's Hiring feed. No API key required."

  # ── Company job boards (configure and enable as needed) ──────────────────
  - sourceType: greenhouse
    company: Example Company
    careersUrl: https://boards.greenhouse.io/example
    enabled: false
    tags: []
    geography: USA
    workMode: remote
    notes: "Replace with a real company slug"

  - sourceType: lever
    company: Example Startup
    careersUrl: https://jobs.lever.co/example
    enabled: false
    tags: []
    geography: remote
    workMode: remote

  - sourceType: company-page
    company: Example Corp
    careersUrl: https://example.com/careers
    enabled: false
    tags: []
    geography: remote
    workMode: any
`;

export interface ScanOptions {
  sourceFilter?: string;   // filter by sourceType
  companyFilter?: string;  // filter by company name (case-insensitive)
  limit?: number;          // max postings per source
  dryRun?: boolean;        // don't persist
}

export class ScanEngine {
  private dedupe = new DedupeEngine();

  constructor(private workspace: WorkspaceManager) { }

  // ─── Portal config ──────────────────────────────────────────────────────────

  async loadPortals(): Promise<PortalSource[]> {
    const configPath = this.workspace.getPath('config/portals.yml');
    if (!(await fs.pathExists(configPath))) {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, DEFAULT_PORTALS_YML, 'utf-8');
    }
    try {
      const raw = yaml.load(await fs.readFile(configPath, 'utf-8')) as any;
      const sources: PortalSource[] = (raw?.sources ?? [])
        .filter((s: any) => s.enabled !== false)
        .map((s: any) => ({
          sourceType: s.sourceType,
          company: s.company,
          careersUrl: s.careersUrl,
          enabled: s.enabled ?? true,
          tags: s.tags ?? [],
          geography: s.geography,
          workMode: s.workMode ?? 'any',
          notes: s.notes,
        }));
      return sources;
    } catch (e: any) {
      throw new Error(`Failed to parse portals.yml: ${e.message}`);
    }
  }

  // ─── Scan ───────────────────────────────────────────────────────────────────

  async scan(opts: ScanOptions = {}): Promise<ScanSummary> {
    let sources = await this.loadPortals();

    // Apply filters
    if (opts.sourceFilter) {
      sources = sources.filter(s => s.sourceType === opts.sourceFilter);
    }
    if (opts.companyFilter) {
      const cf = opts.companyFilter.toLowerCase();
      sources = sources.filter(s => s.company.toLowerCase().includes(cf));
    }

    const existing = await this.loadExisting();
    const summaryResults: ScanSummary['sources'] = [];
    const added: DiscoveredPosting[] = [];

    for (const source of sources) {
      const result: { company: string; sourceType: string; added: number; deduped: number; failed: number; error?: string } = { company: source.company, sourceType: source.sourceType, added: 0, deduped: 0, failed: 0 };

      let raws: RawPosting[] = [];
      try {
        raws = await this.fetchSource(source, opts.limit);
        if (opts.limit && raws.length > opts.limit) raws = raws.slice(0, opts.limit);
      } catch (err: any) {
        result.failed = 1;
        result.error = err.message;
        summaryResults.push(result);
        continue;
      }

      for (const raw of raws) {
        const fp = dedupeFingerprint(raw);
        if (this.dedupe.isDuplicate(fp, raw.canonicalUrl, raw.sourceUrl, [...existing, ...added])) {
          result.deduped++;
          continue;
        }

        const posting = this.normalize(raw, source, fp);
        if (!opts.dryRun) {
          await this.persist(posting);
        }
        added.push(posting);
        result.added++;
      }

      summaryResults.push(result);
    }

    return {
      scannedAt: new Date().toISOString(),
      sources: summaryResults,
      totalAdded: summaryResults.reduce((s, r) => s + r.added, 0),
      totalDeduped: summaryResults.reduce((s, r) => s + r.deduped, 0),
      totalFailed: summaryResults.reduce((s, r) => s + r.failed, 0),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async fetchSource(source: PortalSource, limit?: number): Promise<RawPosting[]> {
    switch (source.sourceType) {
      case 'greenhouse': return new GreenhouseConnector().fetch(source);
      case 'lever': return new LeverConnector().fetch(source);
      case 'company-page': return new CompanyPageConnector().fetch(source);
      case 'remotive': {
        const { RemotiveConnector } = await import('./connectors/remotive');
        return new RemotiveConnector().fetch(source);
      }
      case 'mock': {
        const { MockConnector } = await import('./connectors/mock');
        return new MockConnector().fetch(source);
      }
      case 'hackernews': {
        const { HackerNewsConnector } = await import('./connectors/hackernews');
        return new HackerNewsConnector().fetch(source, limit);
      }
      default: throw new Error(`Unknown sourceType: ${source.sourceType}`);
    }
  }


  private normalize(raw: RawPosting, source: PortalSource, fp: string): DiscoveredPosting {
    return DiscoveredPostingSchema.parse({
      discoveredId: crypto.randomUUID(),
      sourceType: source.sourceType,
      sourceUrl: raw.sourceUrl,
      canonicalUrl: raw.canonicalUrl,
      company: raw.company,
      title: raw.title,
      location: raw.location,
      remoteMode: normalizeWorkMode(raw.location, raw.workModeHint),
      employmentType: raw.employmentType,
      descriptionText: raw.descriptionText,
      postedAt: raw.postedAt,
      dedupeFingerprint: fp,
      discoveredAt: new Date().toISOString(),
      status: 'pending',
      ingestionMetadata: raw.metadata,
    });
  }

  private async persist(posting: DiscoveredPosting): Promise<void> {
    const dir = this.workspace.getPath('jobs/discovered');
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, `${posting.discoveredId}.json`), posting, { spaces: 2 });
  }

  async loadExisting(): Promise<DiscoveredPosting[]> {
    const dir = this.workspace.getPath('jobs/discovered');
    if (!(await fs.pathExists(dir))) return [];
    const files = await fs.readdir(dir);
    const results: DiscoveredPosting[] = [];
    for (const f of files.filter(f => f.endsWith('.json'))) {
      try {
        const data = await fs.readJson(path.join(dir, f));
        results.push(data as DiscoveredPosting);
      } catch { /* skip unreadable */ }
    }
    return results;
  }

  async loadPending(): Promise<DiscoveredPosting[]> {
    const all = await this.loadExisting();
    return all.filter(p => p.status === 'pending');
  }

  async markEvaluated(discoveredId: string): Promise<void> {
    const filePath = this.workspace.getPath(`jobs/discovered/${discoveredId}.json`);
    if (!(await fs.pathExists(filePath))) return;
    const posting = await fs.readJson(filePath);
    posting.status = 'evaluated';
    await fs.writeJson(filePath, posting, { spaces: 2 });
  }
}
