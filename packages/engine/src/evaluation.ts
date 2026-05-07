import crypto from 'crypto';
import {
  EvaluationRunSchema,
  type EvaluationRun,
  type CandidateProfile,
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';
import { ModelGateway } from './gateway';

export class EvaluationEngine {
  constructor(
    private workspace: WorkspaceManager,
    private gateway?: ModelGateway
  ) {}

  async evaluateJob(jdText: string, profile: CandidateProfile, options?: { mock?: boolean }): Promise<EvaluationRun> {
    if (options?.mock) {
      return this.mockEvaluation(jdText);
    }

    if (!this.gateway) {
      throw new Error(
        'ModelGateway is not configured.\n' +
        '  To use live evaluation, set your provider credentials:\n' +
        '    export OPENAI_API_KEY="sk-..."\n' +
        '  Or run with --mock for demo data:\n' +
        '    npm run ct -- evaluate --mock'
      );
    }

    const readiness = await this.gateway.checkReadiness();
    if (!readiness.ready) {
      throw new Error(
        `Provider "${readiness.provider}" is not ready.\n` +
        `  Credentials present: ${readiness.hasCredentials}\n` +
        `  Model: ${readiness.configuredModel}\n` +
        '  Run "npm run ct -- doctor" for details.'
      );
    }

    const systemPrompt = `You are an expert technical recruiter and career strategist.
Evaluate the candidate against the job description and return a complete JSON evaluation report.

Return a JSON object with ALL of the following top-level keys:

"schemaVersion": "v2.0"
"recommendationBand": one of ["top-target", "strong-apply", "conditional-apply", "no-apply"]
"scores": { "overall": 0-100, "skills": 0-100, "experience": 0-100, "startupFit": 0-100 }
"senioritySignal": one of ["under-qualified", "entry", "mid", "senior", "staff", "over-qualified"]

"blockA_roleSummary": {
  "title": string, "company": string, "level": string,
  "workMode": "remote"|"hybrid"|"onsite"|"unknown",
  "location": string or null, "compensationRange": string or null,
  "archetype": string (e.g. "IC-focused builder", "Player-coach"),
  "domain": string (e.g. "FinTech", "Developer Tools"),
  "function": string (e.g. "Full-Stack Eng", "Platform Eng"),
  "tldr": string (1 sentence),
  "whyThisMatters": string (why this role is meaningful for this candidate)
}

"blockB_cvMatch": {
  "overallMatchPct": 0-100,
  "requirements": [ { "requirement": string, "evidence": string, "strength": "strong"|"partial"|"weak"|"missing", "notes": string or null } ],
  "topMatches": [ string, ... ],
  "gaps": [ { "gap": string, "severity": "critical"|"major"|"minor", "mitigation": string } ],
  "risks": [ string, ... ]
}

"blockC_levelStrategy": {
  "jdLevel": string, "candidateLevel": string,
  "levelAlignment": "match"|"above"|"below"|"unclear",
  "strategyName": string (a named positioning strategy),
  "talkingPoints": [ string, string, string ],
  "downlevelGuidance": string or null
}

"blockD_compensationDemand": {
  "compScore": 0-100,
  "benchmarkTable": [
    { "level": string, "geography": string, "companyType": "startup-seed"|"startup-growth"|"bigtech"|"enterprise", "p25": string, "p50": string, "p75": string, "source": string }
  ],
  "demandContext": string,
  "attractivenessCommentary": string
}

"blockE_personalizationPlan": {
  "cvChanges": [ { "section": string, "change": string, "rationale": string, "priority": "high"|"medium"|"low" } ],
  "linkedInChanges": [ { "section": string, "change": string, "rationale": string, "priority": "high"|"medium"|"low" } ]
}

"blockF_interviewPrep": {
  "readinessScore": 0-100,
  "stories": [
    { "storyId": string, "title": string, "requirementMapped": string,
      "situation": string, "task": string, "action": string, "result": string,
      "tags": [ string ], "confidenceLevel": "high"|"medium"|"low" }
  ]
}

All fields are mandatory. Be objective and specific. Use real candidate evidence where available.`;

    const parsed = await this.gateway.generateStructured<EvaluationRun>(
      systemPrompt,
      `CANDIDATE:\n${JSON.stringify(profile)}\n\nJOB DESCRIPTION:\n${jdText}`,
      EvaluationRunSchema,
      'EvaluationRun'
    );

    (parsed as any).jobId = crypto.randomUUID();
    (parsed as any).evaluatedAt = new Date().toISOString();

    const validated = EvaluationRunSchema.parse(parsed);
    await this.saveEvaluation(validated);
    return validated;
  }

  private async mockEvaluation(_jdText: string): Promise<EvaluationRun> {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const storyId = crypto.createHash('sha256')
      .update('led migration' + 'Led the migration of a monolithic e-commerce backe')
      .digest('hex').slice(0, 16);

    const evaluation: EvaluationRun = {
      schemaVersion: 'v2.0',
      jobId: jobId as any,
      evaluatedAt: now,
      recommendationBand: 'strong-apply',
      scores: { overall: 82, skills: 85, experience: 78, startupFit: 88 },
      senioritySignal: 'senior',
      // legacy analysis for backward compat
      analysis: {
        matches: ['TypeScript', 'React', 'Node.js'],
        gaps: ['[DEMO] No real analysis performed'],
        risks: ['[DEMO] Run without --mock for real evaluation'],
        recommendation: '[DEMO] Configure a provider and re-run for real results.',
        actionableFixes: [],
      },
      blockA_roleSummary: {
        title: '[DEMO] Senior Full-Stack Engineer',
        company: '[DEMO] Acme Corp',
        level: 'Senior',
        workMode: 'remote',
        location: 'Remote – USA',
        compensationRange: '$140k–$180k',
        archetype: 'IC-focused builder',
        domain: 'Developer Tools',
        function: 'Full-Stack Eng',
        tldr: 'Build and own core product features across a TypeScript monorepo.',
        whyThisMatters: 'Strong alignment with your background in full-stack and startup ownership.',
      },
      blockB_cvMatch: {
        overallMatchPct: 82,
        requirements: [
          { requirement: 'TypeScript expertise', evidence: 'Led TypeScript migration at Acme', strength: 'strong' },
          { requirement: 'React experience', evidence: 'Built React dashboards', strength: 'strong' },
          { requirement: 'GraphQL', evidence: 'No direct GraphQL evidence found', strength: 'missing' },
        ],
        topMatches: ['TypeScript', 'React', 'Node.js', 'System Design'],
        gaps: [
          { gap: 'GraphQL', severity: 'major', mitigation: 'Highlight REST → GraphQL bridging experience or take a short course.' },
        ],
        risks: ['No explicit GraphQL production experience'],
      },
      blockC_levelStrategy: {
        jdLevel: 'Senior',
        candidateLevel: 'Senior',
        levelAlignment: 'match',
        strategyName: 'Leverage Breadth',
        talkingPoints: [
          'Led end-to-end architecture decisions across frontend and backend.',
          'Shipped production features solo from design to deployment.',
          'Mentored junior engineers and drove adoption of TypeScript across the codebase.',
        ],
        downlevelGuidance: undefined,
      },
      blockD_compensationDemand: {
        compScore: 78,
        benchmarkTable: [
          { level: 'Senior', geography: 'USA Remote', companyType: 'startup-growth', p25: '$135k', p50: '$155k', p75: '$175k', source: 'levels.fyi estimate' },
          { level: 'Senior', geography: 'SF Bay Area', companyType: 'bigtech', p25: '$180k', p50: '$210k', p75: '$250k', source: 'levels.fyi estimate' },
        ],
        demandContext: 'Senior full-stack demand remains strong in 2025 especially for TypeScript + React skills.',
        attractivenessCommentary: 'Comp range is fair for startup-growth stage. Equity upside worth evaluating.',
      },
      blockE_personalizationPlan: {
        cvChanges: [
          { section: 'Summary', change: 'Add "full-stack TypeScript systems" to your summary line.', rationale: 'The JD emphasizes TypeScript monorepo ownership.', priority: 'high' },
          { section: 'Experience > Most Recent Role', change: 'Quantify impact: users affected, latency improvements, or revenue generated.', rationale: 'JD requires demonstrated impact, not just activity.', priority: 'high' },
        ],
        linkedInChanges: [
          { section: 'Headline', change: 'Add "Full-Stack TypeScript Engineer" to headline.', rationale: 'Improves recruiter keyword match for this role type.', priority: 'high' },
          { section: 'About', change: 'Lead with your startup ownership signal.', rationale: 'Founder/startup readiness is a key JD signal.', priority: 'medium' },
        ],
      },
      blockF_interviewPrep: {
        readinessScore: 75,
        stories: [
          {
            storyId,
            title: 'Led backend migration to microservices',
            requirementMapped: 'TypeScript expertise',
            situation: 'Led the migration of a monolithic e-commerce backend to TypeScript microservices.',
            task: 'Own architecture, coordinate with 3 FE engineers, ship with zero downtime.',
            action: 'Designed the service boundaries, wrote migration scripts, ran canary deploys.',
            result: 'Cut API latency by 40%, reduced deploy time from 45min to 8min.',
            tags: ['typescript', 'architecture', 'migration', 'backend'],
            confidenceLevel: 'high',
          },
        ],
      },
    };

    const validated = EvaluationRunSchema.parse(evaluation);
    await this.saveEvaluation(validated);
    return validated;
  }

  async saveEvaluation(run: EvaluationRun) {
    const evalPath = this.workspace.getPath(`jobs/evaluations/${run.jobId}.json`);
    await fs.ensureDir(this.workspace.getPath('jobs/evaluations'));
    await fs.writeJson(evalPath, run, { spaces: 2 });
  }
}
