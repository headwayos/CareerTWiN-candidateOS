import crypto from 'crypto';
import { 
  EvaluationRunSchema,
  type EvaluationRun,
  type CandidateProfile
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

    const parsed = await this.gateway.generateStructured<EvaluationRun>(
      `You are an expert technical recruiter. Evaluate the candidate against the job.
      Return a JSON object with EXACTLY these keys:
      - "scores": { "overall": 0-100, "skills": 0-100, "experience": 0-100, "startupFit": 0-100 }
      - "analysis": { "matches": [], "gaps": [], "risks": [], "recommendation": "...", "actionableFixes": [] }
      - "senioritySignal": one of ["under-qualified", "entry", "mid", "senior", "staff", "over-qualified"]
      
      All fields are mandatory. Be objective.`,
      `CANDIDATE:\n${JSON.stringify(profile)}\n\nJOB:\n${jdText}`,
      EvaluationRunSchema,
      'EvaluationRun'
    );

    (parsed as any).jobId = crypto.randomUUID();
    (parsed as any).evaluatedAt = new Date().toISOString();

    const validated = EvaluationRunSchema.parse(parsed);
    await this.saveEvaluation(validated);
    return validated;
  }

  private async mockEvaluation(jdText: string): Promise<EvaluationRun> {
    const evaluation: EvaluationRun = {
      jobId: crypto.randomUUID() as any,
      evaluatedAt: new Date().toISOString(),
      scores: {
        overall: 0,
        skills: 0,
        experience: 0,
        startupFit: 0,
      },
      analysis: {
        matches: [],
        gaps: ["[DEMO] No real analysis performed"],
        risks: ["[DEMO] Run without --mock for real evaluation"],
        recommendation: "[DEMO] Configure a provider and re-run for real results.",
        actionableFixes: [],
      },
      senioritySignal: "mid",
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
