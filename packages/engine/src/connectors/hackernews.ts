import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

interface HNItem {
  id: number;
  type: string;
  by?: string;
  time?: number;
  text?: string;
  title?: string;
  url?: string;
  score?: number;
  deleted?: boolean;
  dead?: boolean;
}

export class HackerNewsConnector implements Connector {
  private async fetchItem(id: number): Promise<HNItem | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per item
      
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      return await res.json() as HNItem;
    } catch (e) {
      console.warn(`[HN] Failed to fetch item ${id}:`, e);
      return null;
    }
  }

  private cleanHTML(html: string): string {
    if (!html) return '';
    let text = html.replace(/<br\s*[\/]?>/gi, '\n');
    text = text.replace(/<p>/gi, '\n\n');
    text = text.replace(/<\/p>/gi, '');
    text = text.replace(/<[^>]*>?/gm, ''); // strip remaining tags
    
    // Decode common entities
    const entities: Record<string, string> = {
      '&#x2F;': '/', '&#x27;': "'", '&quot;': '"',
      '&lt;': '<', '&gt;': '>', '&amp;': '&'
    };
    text = text.replace(/&#?[a-zA-Z0-9]+;/g, match => entities[match] || match);
    return text.trim();
  }

  private extractCompany(title: string): string {
    const cleanTitle = this.cleanHTML(title);
    // Patterns: "Acme is hiring", "Acme (YC S21) is looking for", "Acme | Senior Eng"
    const match = cleanTitle.match(/^(.*?)(?:\s+is hiring|\s+hiring|\s+looking for|\s+-|\s+\|| \(YC)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return "Unknown Company";
  }

  private inferLocation(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('remote')) return 'Remote';
    // Extremely basic fallback
    return '';
  }

  async fetch(source: PortalSource, limit?: number): Promise<RawPosting[]> {
    // 1. Fetch top job stories
    let jobIds: number[] = [];
    try {
      const res = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json');
      if (!res.ok) throw new Error(`Failed to fetch HN job stories: ${res.statusText}`);
      jobIds = await res.json() as number[];
    } catch (error) {
      console.error('[HN] Error fetching job stories:', error);
      return [];
    }

    if (!jobIds || jobIds.length === 0) return [];

    // Slice to limit
    const targetIds = limit ? jobIds.slice(0, limit) : jobIds;
    
    // 2. Fetch details with bounded concurrency (e.g. 10 at a time)
    const items: HNItem[] = [];
    const CONCURRENCY = 10;
    
    for (let i = 0; i < targetIds.length; i += CONCURRENCY) {
      const chunk = targetIds.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map(id => this.fetchItem(id)));
      for (const item of chunkResults) {
        if (item) items.push(item);
      }
    }

    // 3. Map to RawPosting
    const postings: RawPosting[] = [];

    for (const item of items) {
      // Filtering
      if (item.deleted || item.dead) continue;
      if (item.type !== 'job') continue;
      if (!item.title) continue;

      const rawTitle = item.title;
      const cleanTitle = this.cleanHTML(item.title);
      const companyInferred = this.extractCompany(item.title);
      const descriptionText = item.text ? this.cleanHTML(item.text) : cleanTitle;
      const postedAt = item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString();
      const sourceUrl = `https://news.ycombinator.com/item?id=${item.id}`;

      postings.push({
        title: cleanTitle,
        company: companyInferred,
        sourceUrl,
        canonicalUrl: item.url,
        location: this.inferLocation(item.title),
        descriptionText,
        postedAt,
        metadata: {
          hnItemId: item.id,
          hnAuthor: item.by,
          hnScore: item.score,
          rawTitle,
          companyInferred,
        }
      });
    }

    return postings;
  }
}
