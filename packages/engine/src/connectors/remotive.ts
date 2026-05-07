import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

// Remotive public API — no auth required, returns structured JSON.
// Used as the canonical live connector proof since Greenhouse and Lever
// now require API keys for programmatic access.
// API docs: https://remotive.com/api/remote-jobs
export class RemotiveConnector implements Connector {
  async fetch(source: PortalSource): Promise<RawPosting[]> {
    const searchQuery = source.notes ?? '';
    const url = `https://remotive.com/api/remote-jobs?limit=20${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;

    let json: any;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CTOSS-Scanner/1.0 (local)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
    } catch (err: any) {
      throw new Error(`Remotive fetch failed: ${err.message}`);
    }

    const jobs: any[] = json.jobs ?? [];
    return jobs.map((j: any) => ({
      title:           j.title ?? '',
      company:         j.company_name ?? source.company,
      sourceUrl:       j.url ?? url,
      canonicalUrl:    j.url,
      location:        j.candidate_required_location ?? 'Worldwide',
      descriptionText: this.stripHtml(j.description ?? '').slice(0, 6000),
      postedAt:        j.publication_date ?? undefined,
      employmentType:  j.job_type ?? undefined,
      // remotive.com is an exclusively remote job board — all listings are remote.
      // Set explicit hint to bypass location-string inference.
      workModeHint:    'remote' as const,
      metadata:        {
        remotiveId: j.id,
        category:   j.category,
        tags:       j.tags,
      },
    }));
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
