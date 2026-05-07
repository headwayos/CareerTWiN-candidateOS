import crypto from 'crypto';
import type { DiscoveredPosting } from '@careertwin/schemas';
import type { RawPosting } from './connectors/types';

// ─── Normalization helpers ────────────────────────────────────────────────────

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(senior|sr|junior|jr|staff|principal|lead|mid|associate)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|gmbh|plc|pty)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeWorkMode(
  location: string,
  hint?: 'remote' | 'hybrid' | 'onsite',
): 'remote' | 'hybrid' | 'onsite' | 'unknown' {
  // Layer 1: Explicit hint from connector (highest confidence — e.g. Remotive is always remote)
  if (hint) return hint;

  const l = location.toLowerCase().trim();

  // Layer 2: Explicit keyword detection
  if (/\bhybrid\b/.test(l)) return 'hybrid';
  if (/\bremote\b/.test(l)) return 'remote';

  // Layer 3: Remotive / global remote board patterns
  // "Worldwide", "Anywhere", "Global", empty location = remote-first signal
  if (
    l === '' ||
    l === 'worldwide' ||
    l === 'anywhere' ||
    l === 'global' ||
    l === 'international'
  ) return 'remote';

  // Layer 4: Onsite evidence — city/state/country list without remote/hybrid keywords
  // Only mark onsite when there's specific place evidence
  if (/\bon.?site\b/.test(l) || /\bin.?office\b/.test(l)) return 'onsite';

  // Layer 5: If location is a country or city list with no mode keyword,
  // we cannot infer confidently — return unknown rather than poisoning downstream.
  return 'unknown';
}

export function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/\b(remote|hybrid|onsite|usa|us|united states)\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
}

export function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.slice(0, 30); }
}

// ─── Fingerprint ─────────────────────────────────────────────────────────────

export function dedupeFingerprint(raw: RawPosting): string {
  const parts = [
    normalizeCompany(raw.company),
    normalizeTitle(raw.title),
    normalizeLocation(raw.location),
    sourceDomain(raw.sourceUrl),
  ].join('|');
  return crypto.createHash('sha256').update(parts).digest('hex').slice(0, 16);
}

// ─── DedupeEngine ─────────────────────────────────────────────────────────────

export class DedupeEngine {
  isDuplicate(fp: string, canonicalUrl: string | undefined, sourceUrl: string | undefined, existing: DiscoveredPosting[]): boolean {
    for (const e of existing) {
      if (sourceUrl && e.sourceUrl === sourceUrl) return true;
      if (canonicalUrl && e.canonicalUrl && e.canonicalUrl === canonicalUrl) return true;
      if (e.dedupeFingerprint === fp) return true;
    }
    return false;
  }

  merge(existing: DiscoveredPosting, incoming: RawPosting, fp: string): DiscoveredPosting {
    return {
      ...existing,
      // Update mutable discovery metadata
      ingestionMetadata: {
        ...existing.ingestionMetadata,
        ...incoming.metadata,
        lastSeenAt: new Date().toISOString(),
        seenCount: ((existing.ingestionMetadata.seenCount as number) ?? 1) + 1,
      },
    };
  }
}
