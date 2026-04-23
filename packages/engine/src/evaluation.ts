import { 
  JobPostingSchema, 
  EvaluationRunSchema,
  type JobPosting,
  type EvaluationRun,
  type CandidateProfile
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';

export class EvaluationEngine {
  constructor(private workspace: WorkspaceManager) {}

  async evaluateJob(jdText: string, profile: CandidateProfile): Promise<EvaluationRun> {
    // In a real implementation, this would use an LLM to parse JD and compare with profile.
    
    const jobId = crypto.randomUUID() as any;
    const job: JobPosting = {
      id: jobId,
      title: "Software Engineer", // Mock
      company: "Startup X",
      remote: false,
      description: jdText,
      metadata: {},
      parsedAt: new Date().toISOString(),
    };

    // Mock Scoring Logic
    const evaluation: EvaluationRun = {
      jobId: jobId,
      evaluatedAt: new Date().toISOString(),
      scores: {
        overall: 85,
        skills: 90,
        experience: 80,
        startupFit: 85,
      },
      analysis: {
        matches: ["TypeScript", "Node.js", "CLI development"],
        gaps: ["React.js", "Docker"],
        risks: ["Seniority slightly above current level"],
        recommendation: "Strong match. Focus on your CLI experience in the interview.",
        actionableFixes: ["Highlight Docker side-project", "Update skills section with React if applicable"],
      },
      senioritySignal: "senior",
    };

    const validated = EvaluationRunSchema.parse(evaluation);
    await this.saveEvaluation(job, validated);
    return validated;
  }

  async saveEvaluation(job: JobPosting, run: EvaluationRun) {
    const jobPath = this.workspace.getPath(`jobs/postings/${job.id}.json`);
    const evalPath = this.workspace.getPath(`jobs/evaluations/${run.jobId}.json`);
    
    await fs.writeJson(jobPath, job, { spaces: 2 });
    await fs.writeJson(evalPath, run, { spaces: 2 });
  }
}
