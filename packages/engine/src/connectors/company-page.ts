import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

// Company careers page connector: fetches HTML and extracts job links heuristically.
// Intentionally conservative — never crashes on unrecognised HTML shapes.
export class CompanyPageConnector implements Connector {
  async fetch(source: PortalSource): Promise<RawPosting[]> {
    let html: string;
    try {
      const res = await fetch(source.careersUrl, {
        headers: { 'User-Agent': 'CTOSS-Scanner/1.0 (local)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err: any) {
      throw new Error(`Company page fetch failed for ${source.company}: ${err.message}`);
    }

    const jobs = this.extractJobs(html, source.careersUrl, source.company);
    if (jobs.length === 0) {
      // Not an error — just no structured jobs found on this page
      return [];
    }
    return jobs.slice(0, 30);
  }

  private extractJobs(html: string, baseUrl: string, company: string): RawPosting[] {
    const results: RawPosting[] = [];
    const origin = new URL(baseUrl).origin;

    // Match common job listing link patterns
    const linkPattern = /<a[^>]+href=["']([^"']*(?:job|career|opening|position|role|apply)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    const seen = new Set<string>();
    while ((match = linkPattern.exec(html)) !== null) {
      let href = match[1];
      const anchor = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!href || !anchor || anchor.length < 3 || anchor.length > 120) continue;
      if (href.startsWith('#') || href.startsWith('javascript:')) continue;

      // Resolve relative URLs
      if (href.startsWith('/')) href = origin + href;
      else if (!href.startsWith('http')) href = baseUrl.replace(/\/$/, '') + '/' + href;

      if (seen.has(href)) continue;
      seen.add(href);

      results.push({
        title:           anchor,
        company:         company,
        sourceUrl:       href,
        canonicalUrl:    href,
        location:        '',
        descriptionText: `Job at ${company}: ${anchor}. See ${href} for details.`,
        metadata:        { extractedFrom: baseUrl },
      });
    }
    return results;
  }
}
