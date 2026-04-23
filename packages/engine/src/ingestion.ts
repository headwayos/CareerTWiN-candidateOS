import crypto from 'crypto';
import { 
  CandidateProfileSchema, 
  type CandidateProfile 
} from '@careertwin/schemas';
import fs from 'fs-extra';
import { WorkspaceManager } from './workspace';
import { ModelGateway } from './gateway';

export class IngestionEngine {
  constructor(
    private workspace: WorkspaceManager,
    private gateway?: ModelGateway
  ) {}

  async importCV(rawText: string, options?: { mock?: boolean }): Promise<CandidateProfile> {
    if (options?.mock) {
      return this.importMockProfile();
    }

    if (!this.gateway) {
      throw new Error(
        'ModelGateway is not configured.\n' +
        '  To use live ingestion, set your provider credentials:\n' +
        '    export OPENAI_API_KEY="sk-..."\n' +
        '  Or run with --mock for demo data:\n' +
        '    npm run ct -- cv import --mock'
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

    const parsed = await this.gateway.generateStructured<CandidateProfile>(
      `You are an expert resume parser. Convert the raw resume text into a strictly structured CandidateProfile JSON. Extract bio (name, email, phone, summary, links), experience (company, role, dates, highlights, stack), education (institution, degree, field, dates), and skills. Ensure the output is valid JSON matching the schema exactly.`,
      rawText,
      CandidateProfileSchema,
      'CandidateProfile'
    );

    if (!parsed.id) (parsed as any).id = crypto.randomUUID();

    const validated = CandidateProfileSchema.parse(parsed);
    await this.saveProfile(validated);
    return validated;
  }

  private async importMockProfile(): Promise<CandidateProfile> {
    const mockProfile: CandidateProfile = {
      id: crypto.randomUUID() as any,
      bio: {
        name: "[DEMO] Mock User",
        email: "demo@careertwin.local",
        summary: "This is a demo profile created with --mock. Replace with real data using ct cv import.",
        links: {},
      },
      experience: [],
      education: [],
      skills: ["demo-mode"],
    };
    const validated = CandidateProfileSchema.parse(mockProfile);
    await this.saveProfile(validated);
    return validated;
  }

  async saveProfile(profile: CandidateProfile) {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    await fs.ensureDir(this.workspace.getPath('profile'));
    await fs.writeJson(profilePath, profile, { spaces: 2 });
  }

  async loadProfile(): Promise<CandidateProfile | null> {
    const profilePath = this.workspace.getPath('profile/candidate.json');
    if (await fs.pathExists(profilePath)) {
      return await fs.readJson(profilePath);
    }
    return null;
  }
}
