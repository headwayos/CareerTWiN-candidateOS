import { type CandidateEvidence } from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
}

export class EvidenceEngine {
  constructor(private workspace: WorkspaceManager) {}

  async extractFromGitHub(username: string): Promise<CandidateEvidence> {
    const url = `https://api.github.com/users/${username}/repos?sort=stars&per_page=10&type=owner`;
    
    let repos: GitHubRepo[] = [];
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CareerTwin-Candidate-OS/0.1' }
      });
      if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
      repos = await response.json() as GitHubRepo[];
    } catch (err: any) {
      console.warn(`GitHub API fetch failed: ${err.message}. Using empty evidence.`);
    }

    const evidence: CandidateEvidence = {
      github: repos
        .filter(r => !r.name.startsWith('.') && r.description)
        .map(r => ({
          repo: r.name,
          description: r.description || undefined,
          url: r.html_url,
          stars: r.stargazers_count,
          language: r.language || undefined,
          highlights: r.topics || [],
        })),
      projects: [],
      testimonials: [],
    };

    await this.saveEvidence(evidence);
    return evidence;
  }

  async saveEvidence(evidence: CandidateEvidence): Promise<void> {
    const evidencePath = this.workspace.getPath('profile/evidence.json');
    await fs.writeJson(evidencePath, evidence, { spaces: 2 });
  }

  async loadEvidence(): Promise<CandidateEvidence | null> {
    const evidencePath = this.workspace.getPath('profile/evidence.json');
    if (await fs.pathExists(evidencePath)) {
      return await fs.readJson(evidencePath);
    }
    return null;
  }
}
