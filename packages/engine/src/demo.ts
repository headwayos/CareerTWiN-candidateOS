import fs from 'fs-extra';
import crypto from 'crypto';
import { WorkspaceManager } from './workspace';

export class DemoEngine {
  constructor(private workspace: WorkspaceManager) {}

  async seedDemo(opts?: { force?: boolean }): Promise<void> {
    const isClean = await this.isWorkspaceClean();
    if (!isClean && !opts?.force) {
      throw new Error(
        'Workspace already contains real user data (profile, tracking, or evaluations).\n' +
        'Cannot seed demo data. Use --force to overwrite, or run in a fresh workspace.'
      );
    }

    console.log('\n[DEMO] Seeding synthetic workspace data...');
    console.log('[DEMO] WARNING: Demo workspace created with synthetic data only. Do not use this for real applications.\n');

    await fs.ensureDir(this.workspace.getPath('profile'));
    await fs.ensureDir(this.workspace.getPath('jobs/discovered'));
    await fs.ensureDir(this.workspace.getPath('jobs/evaluations'));
    await fs.ensureDir(this.workspace.getPath('tracker'));

    // 1. Synthetic Profile
    const profile = {
      bio: {
        name: '[DEMO] Candidate',
        email: 'demo@example.com',
        phone: '555-0199',
        location: 'Remote',
        links: { github: 'https://github.com/demo', linkedin: 'https://linkedin.com/in/demo' },
        summary: '[DEMO] Synthetic full-stack engineer generated for demonstration purposes.'
      },
      experience: [
        {
          company: '[DEMO] Startup Inc',
          role: 'Senior Software Engineer',
          startDate: '2020-01-01',
          endDate: 'Present',
          highlights: ['Led migration to TypeScript', 'Mentored 3 junior engineers']
        }
      ],
      education: [],
      skills: ['TypeScript', 'React', 'Node.js', 'System Design']
    };
    await fs.writeJson(this.workspace.getPath('profile/candidate.json'), profile, { spaces: 2 });

    // 2. Synthetic Jobs & Evals
    const job1Id = crypto.randomUUID();
    const job2Id = crypto.randomUUID();

    const eval1 = this.createSyntheticEvaluation(job1Id, '[DEMO] Acme Corp', '[DEMO] Senior Full-Stack Engineer', 'strong-apply', 88);
    const eval2 = this.createSyntheticEvaluation(job2Id, '[DEMO] Globex', '[DEMO] Backend Developer', 'conditional-apply', 65);

    await fs.writeJson(this.workspace.getPath(`jobs/evaluations/${job1Id}.json`), eval1, { spaces: 2 });
    await fs.writeJson(this.workspace.getPath(`jobs/evaluations/${job2Id}.json`), eval2, { spaces: 2 });

    // 3. Synthetic Tracker
    const trackerEntries = [
      {
        id: crypto.randomUUID(),
        jobId: job1Id,
        status: 'evaluated',
        lastUpdatedAt: new Date().toISOString(),
        notes: [{ date: new Date().toISOString(), content: 'Demo seed: strong-apply · 88/100' }],
        artifacts: {},
        reminders: []
      },
      {
        id: crypto.randomUUID(),
        jobId: job2Id,
        status: 'evaluated',
        lastUpdatedAt: new Date().toISOString(),
        notes: [{ date: new Date().toISOString(), content: 'Demo seed: conditional-apply · 65/100' }],
        artifacts: {},
        reminders: []
      }
    ];
    await fs.writeJson(this.workspace.getPath('tracker/applications.json'), trackerEntries, { spaces: 2 });

    console.log('[DEMO] Seed complete.');
    console.log('[DEMO] Run "npm run ct -- tui" to explore.');
  }

  private async isWorkspaceClean(): Promise<boolean> {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    if (await fs.pathExists(profilePath)) {
      const data = await fs.readJson(profilePath).catch(() => ({}));
      if (!data.bio?.name?.includes('[DEMO]')) return false;
    }

    const evalDir = this.workspace.getPath('jobs/evaluations');
    if (await fs.pathExists(evalDir)) {
      const files = await fs.readdir(evalDir);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const data = await fs.readJson(this.workspace.getPath(`jobs/evaluations/${f}`)).catch(() => ({}));
        if (!data.blockA_roleSummary?.company?.includes('[DEMO]')) return false;
      }
    }

    return true;
  }

  private createSyntheticEvaluation(jobId: string, company: string, title: string, band: string, score: number) {
    return {
      schemaVersion: 'v2.0',
      jobId,
      evaluatedAt: new Date().toISOString(),
      recommendationBand: band,
      scores: { overall: score, skills: 85, experience: 80, startupFit: 90 },
      senioritySignal: 'senior',
      blockA_roleSummary: {
        title,
        company,
        level: 'Senior',
        workMode: 'remote',
        location: 'Remote – USA',
        compensationRange: '$150k - $200k',
        archetype: 'IC-focused builder',
        domain: 'Tech',
        function: 'Engineering',
        tldr: `[DEMO] Build scalable systems at ${company}.`,
        whyThisMatters: '[DEMO] Synthetic reasoning for why this matters.'
      },
      blockB_cvMatch: {
        overallMatchPct: score,
        requirements: [{ requirement: 'TypeScript', evidence: 'Used in previous role', strength: 'strong' }],
        topMatches: ['TypeScript'],
        gaps: [{ gap: 'GraphQL', severity: 'minor', mitigation: 'Learn on the job' }],
        risks: ['[DEMO] Synthetic risk']
      },
      blockC_levelStrategy: {
        jdLevel: 'Senior',
        candidateLevel: 'Senior',
        levelAlignment: 'match',
        strategyName: 'Leverage Breadth',
        talkingPoints: ['[DEMO] Talking point 1', '[DEMO] Talking point 2', '[DEMO] Talking point 3'],
        downlevelGuidance: ''
      },
      blockD_compensationDemand: {
        compScore: 80,
        benchmarkTable: [],
        demandContext: '[DEMO] Comp context',
        attractivenessCommentary: '[DEMO] Commentary'
      },
      blockE_personalizationPlan: {
        cvChanges: [{ section: 'Summary', change: 'Add XYZ', rationale: 'For JD', priority: 'high' }],
        linkedInChanges: []
      },
      blockF_interviewPrep: {
        readinessScore: 80,
        stories: [
          {
            storyId: crypto.randomUUID().slice(0, 8),
            title: '[DEMO] Synthetic Story',
            requirementMapped: 'General',
            situation: 'S', task: 'T', action: 'A', result: 'R',
            tags: ['demo'],
            confidenceLevel: 'high'
          }
        ]
      }
    };
  }
}
