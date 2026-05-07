import type { PortalSource } from '@careertwin/schemas';

// Raw posting shape returned by all connectors before normalization
export interface RawPosting {
  title:           string;
  company:         string;
  sourceUrl:       string;
  canonicalUrl?:   string;
  location:        string;
  descriptionText: string;
  postedAt?:       string;
  employmentType?: string;
  // Explicit work mode hint from the connector (overrides location-based inference).
  // Set this when the source has reliable work-mode data (e.g. Remotive = always remote).
  workModeHint?:   'remote' | 'hybrid' | 'onsite';
  metadata:        Record<string, unknown>;
}

export interface Connector {
  fetch(source: PortalSource): Promise<RawPosting[]>;
}
