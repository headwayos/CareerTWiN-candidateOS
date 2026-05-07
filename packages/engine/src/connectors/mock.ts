import type { PortalSource } from '@careertwin/schemas';
import type { Connector, RawPosting } from './types';

// Mock connector for local testing and CI environments where live board APIs are unavailable.
// Also used to prove the full scan → dedupe → persist → batch pipeline without network access.
export class MockConnector implements Connector {
  async fetch(source: PortalSource): Promise<RawPosting[]> {
    return [
      {
        title:           'Senior Software Engineer',
        company:         source.company,
        sourceUrl:       `${source.careersUrl}/jobs/1`,
        canonicalUrl:    `${source.careersUrl}/jobs/1`,
        location:        'Remote – USA',
        descriptionText: [
          `# Senior Software Engineer at ${source.company}`,
          'We are looking for a senior engineer with strong TypeScript, Node.js, and React experience.',
          'You will build core product features, lead architecture decisions, and mentor junior engineers.',
          'Requirements: 5+ years engineering, TypeScript expert, startup experience preferred.',
          'Compensation: $160k–$200k + equity. Remote-first.',
        ].join('\n'),
        postedAt:        new Date().toISOString(),
        employmentType:  'full-time',
        metadata:        { mockId: '1', source: 'mock' },
      },
      {
        title:           'Staff Infrastructure Engineer',
        company:         source.company,
        sourceUrl:       `${source.careersUrl}/jobs/2`,
        canonicalUrl:    `${source.careersUrl}/jobs/2`,
        location:        'Remote',
        descriptionText: [
          `# Staff Infrastructure Engineer at ${source.company}`,
          'Own reliability, scalability and developer experience for a growing platform.',
          'Kubernetes, Terraform, Go, distributed systems at scale.',
          'Requirements: 8+ years, Staff-level systems thinking, strong IC ownership.',
          'Compensation: $180k–$240k + equity.',
        ].join('\n'),
        postedAt:        new Date().toISOString(),
        employmentType:  'full-time',
        metadata:        { mockId: '2', source: 'mock' },
      },
    ];
  }
}
