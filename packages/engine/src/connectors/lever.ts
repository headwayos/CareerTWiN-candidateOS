import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

// Lever public API: https://api.lever.co/v0/postings/<company>?mode=json
export class LeverConnector implements Connector {
  async fetch(source: PortalSource): Promise<RawPosting[]> {
    const company = this.extractSlug(source.careersUrl);
    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;

    let json: any[];
    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'CTOSS-Scanner/1.0 (local)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json() as any[];
    } catch (err: any) {
      throw new Error(`Lever fetch failed for ${source.company}: ${err.message}`);
    }

    if (!Array.isArray(json)) throw new Error(`Lever response malformed for ${source.company}`);

    return json.slice(0, 50).map((j: any) => ({
      title:           j.text ?? '',
      company:         source.company,
      sourceUrl:       j.hostedUrl ?? source.careersUrl,
      canonicalUrl:    j.hostedUrl,
      location:        j.categories?.location ?? '',
      descriptionText: this.extractText(j).slice(0, 6000),
      postedAt:        j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
      employmentType:  j.categories?.commitment ?? undefined,
      metadata:        { leverId: j.id, team: j.categories?.team },
    }));
  }

  private extractSlug(url: string): string {
    // https://jobs.lever.co/linear → linear
    const m = url.match(/lever\.co\/([^/?#]+)/);
    return m ? m[1] : url;
  }

  private extractText(j: any): string {
    const parts: string[] = [];
    if (j.descriptionPlain) parts.push(j.descriptionPlain);
    if (j.additionalPlain) parts.push(j.additionalPlain);
    for (const list of j.lists ?? []) {
      if (list.content) parts.push(list.content.replace(/<[^>]+>/g, ' '));
    }
    return parts.join('\n\n').replace(/\s+/g, ' ').trim();
  }
}
