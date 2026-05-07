import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

// Greenhouse public API: https://boards.greenhouse.io/<company>/jobs.json
export class GreenhouseConnector implements Connector {
  async fetch(source: PortalSource): Promise<RawPosting[]> {
    const company = this.extractSlug(source.careersUrl);
    const apiUrl = `https://boards.greenhouse.io/${company}/jobs.json`;

    let json: any;
    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'CTOSS-Scanner/1.0 (local)' },
        signal: AbortSignal.timeout(10000),
      });
      // Greenhouse now requires auth for the boards-api endpoint.
      // The old boards.greenhouse.io/<slug>/jobs.json endpoint returns HTML 404.
      // Detect both cases and surface a clear error.
      if (res.status === 404) {
        const body = await res.text();
        if (body.includes('<html') || body.includes("can't find")) {
          throw new Error(
            `Greenhouse board '${company}' not found or requires an API key. ` +
            `Verify the board slug at https://boards.greenhouse.io/ or set GREENHOUSE_API_KEY.`
          );
        }
        throw new Error(`HTTP 404 for Greenhouse board: ${company}`);
      }
      if (res.status === 401) {
        throw new Error(`Greenhouse requires authentication. Set GREENHOUSE_API_KEY in your environment.`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
    } catch (err: any) {
      throw new Error(`Greenhouse fetch failed for ${source.company}: ${err.message}`);
    }

    const jobs: any[] = json.jobs ?? [];
    return jobs.slice(0, 50).map((j: any) => ({
      title:           j.title ?? '',
      company:         source.company,
      sourceUrl:       j.absolute_url ?? source.careersUrl,
      canonicalUrl:    j.absolute_url,
      location:        j.location?.name ?? '',
      descriptionText: this.stripHtml(j.content ?? '').slice(0, 6000),
      postedAt:        j.updated_at ?? undefined,
      employmentType:  undefined,
      metadata:        { greenhouseId: j.id, departments: j.departments },
    }));
  }

  private extractSlug(url: string): string {
    // https://boards.greenhouse.io/stripe → stripe
    const m = url.match(/greenhouse\.io\/([^/?#]+)/);
    return m ? m[1] : url;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
