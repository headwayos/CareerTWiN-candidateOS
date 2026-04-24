import { 
  CandidateProfile, 
  CandidateProfileSchema,
  EvaluationRun 
} from '@careertwin/schemas';
import { WorkspaceManager } from './workspace';
import { ModelGateway } from './gateway';
import fs from 'fs-extra';
import path from 'path';

export class TailorEngine {
  constructor(
    private workspace: WorkspaceManager,
    private gateway: ModelGateway
  ) {}

  async tailorProfile(profile: CandidateProfile, evaluation: EvaluationRun): Promise<CandidateProfile> {
    const systemPrompt = `You are an expert resume writer specializing in the STAR (Situation, Task, Action, Result) methodology. 
    Your goal is to tailor the candidate's experience highlights to better match the job evaluation gaps and requirements.
    
    Maintain the truth but rephrase to highlight relevant skills identified in the evaluation.
    Return a FULL CandidateProfile JSON.`;

    const userPrompt = `CANDIDATE PROFILE:\n${JSON.stringify(profile)}\n\nEVALUATION:\n${JSON.stringify(evaluation)}`;

    const tailored = await this.gateway.generateStructured<CandidateProfile>(
      systemPrompt,
      userPrompt,
      CandidateProfileSchema, 
      'CandidateProfile'
    );

    return tailored;
  }

  async saveTailoredArtifact(profile: CandidateProfile, jobId: string): Promise<string> {
    const filename = `profile-tailored-${jobId}.json`;
    const outputPath = this.workspace.getPath(`artifacts/resumes/${filename}`);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, profile, { spaces: 2 });
    return outputPath;
  }
}
